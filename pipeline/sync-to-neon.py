#!/usr/bin/env python3
"""
Homeschool Compass — Sync Pipeline
Fetches homeschool-relevant bills from LegiScan API and upserts into Neon.

Usage:
    # Normal run
    python3 sync-to-neon.py

    # Dry-run (no DB writes)
    python3 sync-to-neon.py --dry-run

    # Run with specific state(s)
    python3 sync-to-neon.py --states CA,TX

Exit codes:
    0  — Success
    1  — Validation failure (>10% row failure rate)
    2  — API failure (LegiScan unreachable or auth failure)
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras

# Automatically load .env from well-known path if not already set
_ENV_PATH = os.environ.get("PIPELINE_ENV_FILE", "/opt/homeschool-compass/.env")
if not os.environ.get("DATABASE_URL_ADMIN") and os.path.exists(_ENV_PATH):
    with open(_ENV_PATH) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            # Strip quotes if present
            if line.startswith('"') and line.endswith('"'):
                line = line[1:-1]
            elif line.startswith("'") and line.endswith("'"):
                line = line[1:-1]
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

# Add local dir to path so legiscan_client can be imported
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

from legiscan_client import LegiScanClient

# ── Configuration ──────────────────────────────────────────────────────

DATABASE_URL = os.environ.get("DATABASE_URL_ADMIN", "")
LEGISCAN_API_KEY = os.environ.get("LEGISCAN_API_KEY", "")
REVALIDATION_SECRET = os.environ.get("REVALIDATION_SECRET", "")
REVALIDATION_DOMAIN = os.environ.get("REVALIDATION_DOMAIN", "homeschool-compass.vercel.app")

DATA_DIR = Path(os.environ.get("PIPELINE_DATA_DIR", "/opt/homeschool-compass/data"))
CACHE_DB = str(DATA_DIR / "legiscan_cache.db")

# LegiScan status → status_step mapping (0-based, clamped 0-5)
STATUS_MAP = {1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5}

# Default score lookup by state (from the existing mock data)
DEFAULT_SCORES = {
    "AL": 82, "AK": 95, "AZ": 88, "AR": 70, "CA": 48, "CO": 66, "CT": 78,
    "DE": 72, "FL": 84, "GA": 68, "HI": 58, "ID": 96, "IL": 90, "IN": 80,
    "IA": 76, "KS": 74, "KY": 79, "LA": 60, "ME": 73, "MD": 71, "MA": 56,
    "MI": 92, "MN": 64, "MS": 86, "MO": 81, "MT": 94, "NE": 75, "NV": 83,
    "NH": 87, "NJ": 91, "NM": 77, "NY": 38, "NC": 69, "ND": 72, "OH": 80,
    "OK": 85, "OR": 67, "PA": 52, "RI": 62, "SC": 70, "SD": 88, "TN": 78,
    "TX": 89, "UT": 84, "VT": 76, "VA": 80, "WA": 65, "WV": 83, "WI": 82,
    "WY": 85, "DC": 50,
}

DEFAULT_LEVELS = {
    "No Notice": 85, "Low Regulation": 70, "Moderate": 50, "High": 0,
}

STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia",
}


def get_level_from_score(score: int) -> str:
    """Inverse of the mock-data levelFromScore function."""
    if score >= 85:
        return "No Notice"
    elif score >= 70:
        return "Low Regulation"
    elif score >= 50:
        return "Moderate"
    else:
        return "High"


def make_bill_id(state_code: str, bill_number: str) -> str:
    """Create a stable bill ID from state + number, lowercase with hyphens."""
    return f"{state_code.lower()}-{bill_number.lower().replace(' ', '-')}"


def legiscan_status_to_step(status: int) -> int:
    """Map LegiScan status (1-6) to status_step (0-5), clamped."""
    return max(0, min(5, status - 1))


def now_ts() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Neon DB Layer ──────────────────────────────────────────────────────

class NeonDB:
    def __init__(self, dsn: str, dry_run: bool = False):
        self.dsn = dsn
        self.dry_run = dry_run
        self.conn = None

    def __enter__(self):
        if not self.dry_run:
            self.conn = psycopg2.connect(self.dsn)
        return self

    def __exit__(self, *args):
        if self.conn:
            self.conn.commit()
            self.conn.close()

    def upsert_state(self, state_code: str):
        """Ensure a state row exists. Safe to call repeatedly."""
        if self.dry_run:
            print(f"  [DRY-RUN] Would upsert state {state_code}")
            return

        with self.conn.cursor() as cur:
            # Check if state exists
            cur.execute("SELECT code, score FROM states WHERE code = %s", (state_code,))
            existing = cur.fetchone()

            if existing:
                print(f"  State {state_code} exists (score={existing[1]}), skipping")
                return

            # Insert with default score
            score = DEFAULT_SCORES.get(state_code, 50)
            level = get_level_from_score(score)
            name = STATE_NAMES.get(state_code, state_code)

            cur.execute("""
                INSERT INTO states (code, name, score, subscores, level, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    updated_at = NOW()
            """, (state_code, name, score, json.dumps({}), level))

            print(f"  ✓ Inserted state {state_code} (score={score})")

    def upsert_bill(self, bill_data: dict, dry_run: bool = False) -> bool:
        """
        Upsert a bill from LegiScan data. Returns True if successful.
        Inserts into DLQ on failure.
        """
        bill_id = bill_data.get("bill_id")
        state_code = bill_data.get("state", "")
        bill_number = bill_data.get("bill_number", "")
        title = bill_data.get("title", "")
        status = bill_data.get("status", 1)
        status_date = bill_data.get("status_date", "")
        description = bill_data.get("description", "")

        # Ensure parent state exists
        self.upsert_state(state_code)

        # Build bill ID
        our_id = make_bill_id(state_code, bill_number)
        status_step = legiscan_status_to_step(status)

        # Determine impact (default: neutral for new bills)
        # TODO: Use Gemini analysis for accurate impact classification
        impact = "neutral"
        impact_summary = title[:200] if title else ""
        delta = ""

        try:
            if self.dry_run:
                print(f"  [DRY-RUN] Would upsert bill {our_id}: {bill_number} - {title[:60]}")
                return True

            with self.conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO bills
                        (id, state_code, number, title, date, status_step,
                         impact, impact_summary, delta, esa_related,
                         analysis, legiscan_bill_id, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        date = EXCLUDED.date,
                        status_step = EXCLUDED.status_step,
                        impact_summary = EXCLUDED.impact_summary,
                        updated_at = NOW()
                """, (
                    our_id, state_code, bill_number, title,
                    status_date or datetime.now().date(),
                    status_step, impact, impact_summary,
                    delta, False,
                    json.dumps({"description": description, "legiscan_status": status}),
                    bill_id,
                ))

            print(f"  ✓ Upserted bill {our_id}: {bill_number} — {title[:60]}")
            return True

        except Exception as e:
            error_msg = str(e)
            print(f"  ✗ Failed to upsert bill {our_id}: {error_msg}")
            self._write_dlq("legiscan", bill_data, error_msg)
            return False

    def _write_dlq(self, source: str, payload: dict, error: str):
        """Write a failed row to the dead letter queue."""
        if self.dry_run or not self.conn:
            return

        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO dlq (source, raw_payload, error_message, first_seen_at)
                    VALUES (%s, %s, %s, NOW())
                """, (source, json.dumps(payload, default=str), error))
        except Exception as e2:
            print(f"  [DLQ-ERROR] Failed to write DLQ entry: {e2}")

    def log_sync(self, fetch_key: str, status: str, errors: str = ""):
        """Log a sync event with idempotency."""
        if not self.conn or self.dry_run:
            return

        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO sync_log (fetch_key, status, errors, created_at)
                    VALUES (%s, %s, %s, NOW())
                    ON CONFLICT (fetch_key) DO NOTHING
                """, (fetch_key, status, errors))
        except Exception as e:
            print(f"  [SYNC-LOG-ERROR] Failed to log sync: {e}")

    def update_metadata(self, key: str, value: str):
        """Update pipeline metadata."""
        if not self.conn or self.dry_run:
            return

        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO pipeline_metadata (key, value, updated_at)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT (key) DO UPDATE SET
                        value = EXCLUDED.value,
                        updated_at = NOW()
                """, (key, value))
        except Exception as e:
            print(f"  [METADATA-ERROR] Failed to update {key}: {e}")


# ── Revalidation ───────────────────────────────────────────────────────

def revalidate_frontend(domain: str, secret: str) -> bool:
    """POST to the frontend revalidation endpoint to purge ISR cache."""
    if not secret:
        print("  [REVALIDATE] No REVALIDATION_SECRET set, skipping")
        return True

    import requests

    url = f"https://{domain}/api/revalidate"
    try:
        resp = requests.post(
            url,
            headers={"Authorization": f"Bearer {secret}"},
            timeout=15,
        )
        if resp.ok:
            print(f"  [REVALIDATE] ✓ Cache revalidated ({resp.status_code})")
            return True
        else:
            print(f"  [REVALIDATE] ✗ Revalidation failed ({resp.status_code}): {resp.text}")
            return False
    except Exception as e:
        print(f"  [REVALIDATE] ✗ Revalidation error: {e}")
        return False


# ── Main Pipeline ──────────────────────────────────────────────────────

def run_pipeline(legiscan: LegiScanClient, db: NeonDB, states: list = None):
    """Run the full sync pipeline."""
    print(f"\n{'='*60}")
    print(f"  HOMESCHOOL COMPASS — SYNC PIPELINE")
    print(f"  Started: {now_ts()}")
    print(f"  Dry-run: {db.dry_run}")
    print(f"{'='*60}\n")

    # Phase 1: Discover bills from LegiScan
    print("[Phase 1] Discovering homeschool bills from LegiScan...")
    all_bills = legiscan.discover_homeschool_bills(states=states)
    print(f"  → Found {len(all_bills)} raw candidate bills")

    if not all_bills:
        print("[Phase 1] No new bills found")
        db.update_metadata("last_synced_at", now_ts())
        return 0

    # Phase 1b: Classify bills (filter out noise)
    print(f"\n[Phase 1b] Classifying {len(all_bills)} candidate bills...")
    from classify_bills import filter_relevant
    classified = filter_relevant(all_bills, min_score=2)
    all_bills = classified["bills"]
    stats = classified["stats"]
    print(f"  HOMESCHOOL:          {stats.get('HOMESCHOOL', 0)}")
    print(f"  EDUCATION_ADJACENT:  {stats.get('EDUCATION_ADJACENT', 0)}")
    print(f"  NOISE (filtered):    {stats.get('NOISE', 0)}")
    print(f"  → {len(all_bills)} bills passed classifier")

    if not all_bills:
        print("[Phase 1b] No relevant bills after classification")
        db.update_metadata("last_synced_at", now_ts())
        return 0

    # Connection health check (defined once, used by Phase 2a and 2b)
    def ensure_conn():
        nonlocal db
        try:
            with db.conn.cursor() as cur:
                cur.execute("SELECT 1")
        except Exception:
            print("  [RECONNECT] DB connection lost — reconnecting...")
            try:
                if db.conn and not db.conn.closed:
                    db.conn.close()
            except Exception:
                pass
            import psycopg2
            db.conn = psycopg2.connect(db.dsn)

    # Phase 2a: Pre-populate all 50 states (avoid per-bill connection churn)
    print(f"\n[Phase 2a] Ensuring all parent states exist in Neon...")
    existing_state_codes = set()
    try:
        ensure_conn()
        with db.conn.cursor() as cur:
            cur.execute("SELECT code FROM states")
            existing_state_codes = {r[0] for r in cur.fetchall()}
    except Exception:
        pass  # Connection may be fresh; proceed optimistically
    for b in all_bills:
        sc = (b.get("state") or b.get("state_code", "")).upper()
        if sc and sc not in existing_state_codes:
            try:
                db.upsert_state(sc)
                existing_state_codes.add(sc)
            except Exception as e:
                print(f"  ⚠️  Could not pre-insert state {sc}: {e}")

    # Phase 2b: Fetch full bill details and upsert
    print(f"\n[Phase 2b] Fetching full details and upserting to Neon...")
    bill_ids = list(set(b.get("bill_id") or b.get("bill_number", "") for b in all_bills))
    print(f"  → {len(bill_ids)} unique bills to process")

    total = 0
    failed = 0
    processed_ids = set()

    # Process bills in batches to avoid overwhelming rate limits
    batch_size = 10
    for i in range(0, len(all_bills), batch_size):
        ensure_conn()
        batch = all_bills[i:i + batch_size]

        for bill in batch:
            bill_id = bill.get("bill_id")
            if not bill_id:
                continue

            # Deduplicate within run
            if bill_id in processed_ids:
                continue
            processed_ids.add(bill_id)

            # Get full details from LegiScan (uses cached response if available)
            try:
                full = legiscan.get_bill(bill_id)
                bill_data = full.get("bill", full)
            except Exception as e:
                print(f"  ⚠️  Failed to fetch bill {bill_id}: {e}")
                db._write_dlq("legiscan", {"bill_id": bill_id}, str(e))
                failed += 1
                continue

            # Upsert to Neon
            success = db.upsert_bill(bill_data)
            if success:
                total += 1
                # Log sync idempotency
                fetch_key = f"legiscan_fetch_{bill_id}_{int(time.time())}"
                db.log_sync(fetch_key, "completed")
            else:
                failed += 1

    # Phase 3: Summary and metadata
    print(f"\n{'='*60}")
    print(f"  SYNC COMPLETE")
    print(f"  Processed: {total} bills")
    print(f"  Failed:    {failed} bills")
    print(f"{'='*60}")

    # Check failure threshold
    total_attempted = total + failed
    if total_attempted > 0:
        failure_rate = failed / total_attempted * 100
        if failure_rate > 10:
            msg = f"[SYNC-ALERT] {failure_rate:.0f}% validation failure for batch"
            print(f"\n  !!! {msg}")
            db.update_metadata("last_sync_alert", msg)
            return 1

    # Update last_synced_at
    db.update_metadata("last_synced_at", now_ts())
    print(f"\n  ✓ last_synced_at updated to {now_ts()}")

    # Phase 4: Revalidation
    response = None
    if REVALIDATION_SECRET:
        print(f"\n[Phase 4] Revalidating frontend cache...")
        revalidate_frontend(REVALIDATION_DOMAIN, REVALIDATION_SECRET)

    return 0


def main():
    parser = argparse.ArgumentParser(description="Homeschool Compass Neon Sync Pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without writing to DB")
    parser.add_argument("--states", type=str, help="Comma-separated list of state codes (default: all)")
    args = parser.parse_args()

    # Validate environment
    if not LEGISCAN_API_KEY:
        print("ERROR: LEGISCAN_API_KEY environment variable is required")
        return 2

    if not DATABASE_URL:
        print("ERROR: DATABASE_URL_ADMIN environment variable is required")
        return 2

    # Ensure data directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Parse state filter
    state_filter = [s.strip().upper() for s in args.states.split(",")] if args.states else None
    if state_filter:
        print(f"State filter: {state_filter}")

    # Initialize clients
    legiscan = LegiScanClient(api_key=LEGISCAN_API_KEY, cache_db_path=CACHE_DB)

    # Initialize DB
    with NeonDB(DATABASE_URL, dry_run=args.dry_run) as db:
        exit_code = run_pipeline(legiscan, db, states=state_filter)

    return exit_code


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
