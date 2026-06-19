"""
Homeschool Regulation Tracker — Full Sync Pipeline
Orchestrates LegiScan + OpenStates → SQLite → Gemini → Alerts
"""
import os
import sys
import json
import sqlite3
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path
import argparse

from legiscan_client import LegiScanClient
from openstates_client import OpenStatesClient
from gemini_processor import GeminiBillProcessor


# ── Configuration ──────────────────────────────────────────
DB_PATH = os.getenv("HS_TRACKER_DB", "homeschool_tracker.db")
CACHE_PATH = os.getenv("LEGISCAN_CACHE", "legiscan_cache.db")
ALERT_WEBHOOK = os.getenv("ALERT_WEBHOOK_URL")

# Homeschool-relevant state codes for priority scanning
PRIORITY_STATES = [
    "CA", "TX", "FL", "NY", "PA", "OH", "GA", "NC", "VA", "WA",
    "AZ", "CO", "TN", "IN", "MI", "MO", "WI", "MN", "MA", "NJ"
]


class SyncPipeline:
    """
    End-to-end pipeline:
    1. Discover bills from LegiScan + OpenStates
    2. Ingest into SQLite with deduplication
    3. Detect changes via change_hash
    4. Run Gemini analysis on new/changed bills
    5. Generate alerts for subscribed rules
    6. Log everything
    """

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self.legiscan = LegiScanClient(cache_db_path=CACHE_PATH)
        self.openstates = OpenStatesClient()
        self.gemini = GeminiBillProcessor()
        self._init_db()

    def _init_db(self):
        """Ensure schema is applied."""
        schema_path = Path(__file__).parent / "schema.sql"
        if schema_path.exists():
            with sqlite3.connect(self.db_path) as conn:
                with open(schema_path, "r") as f:
                    conn.executescript(f.read())

    # ── Phase 1: Discovery ────────────────────────────────

    def discover_legiscan(self, states: Optional[List[str]] = None) -> List[Dict]:
        """Discover homeschool bills via LegiScan search."""
        print("[Phase 1a] Discovering from LegiScan...")
        return self.legiscan.discover_homeschool_bills(states=states)

    def discover_openstates(self, states: Optional[List[str]] = None) -> List[Dict]:
        """Discover homeschool bills via OpenStates."""
        print("[Phase 1b] Discovering from OpenStates...")
        return self.openstates.discover_homeschool_bills(
            states=[s.lower() for s in states] if states else None
        )

    # ── Phase 2: Ingestion ──────────────────────────────────

    def ingest_bills(self, bills: List[Dict], source: str) -> Dict[str, int]:
        """
        Ingest discovered bills into SQLite.
        Deduplicates by (state_code, bill_number, session_id).
        Returns counts: inserted, updated, unchanged.
        """
        print(f"[Phase 2] Ingesting {len(bills)} bills from {source}...")
        inserted = updated = unchanged = 0

        with sqlite3.connect(self.db_path) as conn:
            for bill in bills:
                # Normalize fields based on source
                if source == "legiscan":
                    bill_id = bill.get("bill_id")
                    state = bill.get("state", "")
                    number = bill.get("number", "")
                    session_id = bill.get("session_id")
                    title = bill.get("title", "")
                    status = bill.get("status", "")
                    status_date = bill.get("last_action_date")
                    url = bill.get("url", "")
                    ls_id = bill_id
                    os_id = None
                else:  # openstates
                    bill_id = None  # Will be auto-assigned
                    state = bill.get("state", "")
                    number = bill.get("identifier", "")
                    session_id = None  # OpenStates session is nested
                    title = bill.get("title", "")
                    status = bill.get("latest_action_description", "")
                    status_date = bill.get("latest_action_date")
                    url = bill.get("url", "")
                    ls_id = None
                    os_id = bill.get("openstates_id")

                # Check for existing
                existing = conn.execute(
                    """SELECT bill_id, change_hash FROM bills 
                       WHERE state_code = ? AND bill_number = ?""",
                    (state, number)
                ).fetchone()

                if existing:
                    # Update if changed
                    db_bill_id, old_hash = existing
                    new_hash = hashlib.sha256(
                        f"{title}{status}{status_date}".encode()
                    ).hexdigest()

                    if old_hash != new_hash:
                        conn.execute("""
                            UPDATE bills SET
                                title = ?, status = ?, status_date = ?,
                                last_synced_at = datetime('now'),
                                change_hash = ?, updated_at = datetime('now')
                            WHERE bill_id = ?
                        """, (title, status, status_date, new_hash, db_bill_id))
                        updated += 1
                    else:
                        unchanged += 1
                else:
                    # Insert new
                    conn.execute("""
                        INSERT INTO bills 
                        (legiscan_bill_id, openstates_bill_id, state_code, 
                         session_id, bill_number, title, status, status_date,
                         legiscan_url, openstates_url, change_hash, last_synced_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    """, (ls_id, os_id, state, session_id, number, title,
                          status, status_date, 
                          url if source == "legiscan" else None,
                          url if source == "openstates" else None,
                          hashlib.sha256(f"{title}{status}".encode()).hexdigest()))
                    inserted += 1

        return {"inserted": inserted, "updated": updated, "unchanged": unchanged}

    # ── Phase 3: Change Detection ──────────────────────────

    def detect_changes(self) -> List[int]:
        """
        Find bills that need re-analysis:
        - New bills (is_homeschool_relevant IS NULL)
        - Bills with changed text (change_hash mismatch)
        - Bills with status changes in last 24h
        """
        print("[Phase 3] Detecting changes...")
        with sqlite3.connect(self.db_path) as conn:
            # Bills never analyzed
            new_bills = conn.execute("""
                SELECT bill_id, legiscan_bill_id, openstates_bill_id, title, state_code
                FROM bills
                WHERE is_homeschool_relevant IS NULL
            """).fetchall()

            # Bills with recent status changes
            changed = conn.execute("""
                SELECT bill_id, legiscan_bill_id, openstates_bill_id, title, state_code
                FROM bills
                WHERE updated_at > datetime('now', '-1 day')
                AND is_homeschool_relevant = 1
            """).fetchall()

            all_changed = list(set(new_bills + changed))
            print(f"  → {len(all_changed)} bills to analyze")
            return [b[0] for b in all_changed]

    # ── Phase 4: LLM Analysis ──────────────────────────────

    def analyze_bills(self, bill_ids: List[int]):
        """Run Gemini analysis on changed bills."""
        print(f"[Phase 4] Analyzing {len(bill_ids)} bills with Gemini...")

        with sqlite3.connect(self.db_path) as conn:
            for bid in bill_ids:
                row = conn.execute("""
                    SELECT b.bill_id, b.legiscan_bill_id, b.title, b.state_code,
                           bt.text_content, bt_prev.text_content as prev_text
                    FROM bills b
                    LEFT JOIN bill_texts bt ON b.bill_id = bt.bill_id
                        AND bt.version_type = 'introduced'
                    LEFT JOIN bill_texts bt_prev ON b.bill_id = bt_prev.bill_id
                        AND bt_prev.version_type = 'previous'
                    WHERE b.bill_id = ?
                    ORDER BY bt.extracted_at DESC
                    LIMIT 1
                """, (bid,)).fetchone()

                if not row or not row[4]:
                    print(f"  ⚠️  Bill {bid}: no text available, skipping")
                    continue

                bill_id, ls_id, title, state, text, prev_text = row
                print(f"  🔍 Analyzing {state} {title[:60]}...")

                try:
                    result = self.gemini.analyze_bill(text, bid, prev_text)
                    self.gemini._store_analysis(result, self.db_path)

                    # Mark as processed
                    conn.execute("""
                        UPDATE bills SET last_synced_at = datetime('now')
                        WHERE bill_id = ?
                    """, (bid,))

                except Exception as e:
                    print(f"  ❌ Analysis failed for bill {bid}: {e}")

    # ── Phase 5: Alert Generation ──────────────────────────

    def generate_alerts(self):
        """Check alert rules and generate notifications."""
        print("[Phase 5] Generating alerts...")

        with sqlite3.connect(self.db_path) as conn:
            rules = conn.execute("""
                SELECT rule_id, user_id, state_codes, keywords, 
                       regulation_level_filter, esa_only, status_filter
                FROM alert_rules WHERE is_active = 1
            """).fetchall()

            for rule in rules:
                (rule_id, user_id, state_codes, keywords,
                 reg_filter, esa_only, status_filter) = rule

                # Build query
                conditions = ["b.is_homeschool_relevant = 1"]
                params = []

                if state_codes:
                    states = json.loads(state_codes)
                    placeholders = ",".join("?" * len(states))
                    conditions.append(f"b.state_code IN ({placeholders})")
                    params.extend(states)

                if reg_filter:
                    conditions.append("b.regulation_level_change = ?")
                    params.append(reg_filter)

                if esa_only:
                    conditions.append("b.esa_related = 1")

                if status_filter:
                    statuses = status_filter.split(",")
                    placeholders = ",".join("?" * len(statuses))
                    conditions.append(f"b.status IN ({placeholders})")
                    params.extend(statuses)

                # Find matching bills updated since last alert
                query = f"""
                    SELECT b.bill_id, b.bill_number, b.title, b.state_code,
                           b.status, b.homeschool_impact_summary, b.regulation_level_change
                    FROM bills b
                    LEFT JOIN alerts a ON b.bill_id = a.bill_id AND a.rule_id = ?
                    WHERE {' AND '.join(conditions)}
                    AND (a.alert_id IS NULL OR b.updated_at > a.sent_at)
                """
                params.insert(0, rule_id)

                matches = conn.execute(query, params).fetchall()

                for match in matches:
                    (bid, number, title, state, status, impact, reg_change) = match

                    # Determine severity
                    severity = "info"
                    if reg_change == "increase":
                        severity = "critical"
                    elif status in ["signed", "enacted"]:
                        severity = "critical"
                    elif reg_change == "decrease":
                        severity = "warning"

                    # Insert alert
                    conn.execute("""
                        INSERT INTO alerts 
                        (rule_id, bill_id, alert_type, severity, message)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        rule_id, bid,
                        "status_change" if status in ["signed", "enacted"] else "new_bill",
                        severity,
                        f"[{state}] {number}: {title} — {status}. Impact: {impact}"
                    ))

                    print(f"  🔔 Alert: {state} {number} ({severity})")

    # ── Phase 6: Sync Logging ──────────────────────────────

    def log_sync(self, operation: str, results: Dict, started_at: datetime,
                 errors: List[str] = None):
        """Log sync run to database."""
        duration = (datetime.utcnow() - started_at).total_seconds()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO sync_log 
                (source, operation, records_processed, records_inserted, 
                 records_updated, errors, started_at, completed_at, duration_seconds)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
            """, (
                "unified", operation,
                results.get("inserted", 0) + results.get("updated", 0) + results.get("unchanged", 0),
                results.get("inserted", 0),
                results.get("updated", 0),
                json.dumps(errors or []),
                started_at.isoformat(),
                duration
            ))

    # ── Full Pipeline ──────────────────────────────────────

    def run_full_sync(self, states: Optional[List[str]] = None):
        """Execute complete pipeline."""
        started = datetime.utcnow()
        print(f"
{'='*60}")
        print(f"🚀 Starting Full Sync at {started.isoformat()}")
        print(f"{'='*60}
")

        errors = []

        try:
            # Phase 1: Discovery
            ls_bills = self.discover_legiscan(states)
            os_bills = self.discover_openstates(states)

            # Phase 2: Ingestion
            ls_results = self.ingest_bills(ls_bills, "legiscan")
            os_results = self.ingest_bills(os_bills, "openstates")

            total_results = {
                "inserted": ls_results["inserted"] + os_results["inserted"],
                "updated": ls_results["updated"] + os_results["updated"],
                "unchanged": ls_results["unchanged"] + os_results["unchanged"]
            }

            # Phase 3-4: Change detection + Analysis
            changed_ids = self.detect_changes()
            if changed_ids:
                self.analyze_bills(changed_ids)

            # Phase 5: Alerts
            self.generate_alerts()

            # Phase 6: Logging
            self.log_sync("full_sync", total_results, started, errors)

            print(f"
{'='*60}")
            print(f"✅ Sync Complete")
            print(f"   Inserted: {total_results['inserted']}")
            print(f"   Updated:  {total_results['updated']}")
            print(f"   Unchanged: {total_results['unchanged']}")
            print(f"   Analyzed: {len(changed_ids)}")
            print(f"   Duration: {(datetime.utcnow()-started).total_seconds():.1f}s")
            print(f"{'='*60}
")

        except Exception as e:
            errors.append(str(e))
            print(f"
❌ Sync failed: {e}")
            raise


# ── CLI ───────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Homeschool Regulation Tracker Sync Pipeline")
    parser.add_argument("--full-sync", action="store_true", help="Run complete pipeline")
    parser.add_argument("--discover-only", action="store_true", help="Only run discovery")
    parser.add_argument("--analyze-only", action="store_true", help="Only run analysis on pending bills")
    parser.add_argument("--states", type=str, help="Comma-separated state codes (default: priority states)")
    parser.add_argument("--db", type=str, default=DB_PATH, help="Database path")

    args = parser.parse_args()

    states = args.states.split(",") if args.states else PRIORITY_STATES
    pipeline = SyncPipeline(db_path=args.db)

    if args.full_sync:
        pipeline.run_full_sync(states=states)
    elif args.discover_only:
        ls = pipeline.discover_legiscan(states)
        os = pipeline.discover_openstates(states)
        print(f"LegiScan: {len(ls)} bills")
        print(f"OpenStates: {len(os)} bills")
    elif args.analyze_only:
        changed = pipeline.detect_changes()
        pipeline.analyze_bills(changed)
    else:
        parser.print_help()
