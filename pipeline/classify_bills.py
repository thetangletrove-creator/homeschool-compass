#!/usr/bin/env python3
"""
Bill Classifier Pipeline — Homeschool Compass
===============================================
Combines rule-based relevance filtering with Gemini-powered impact analysis.

Two-tier classification:
  Tier 1 — Fast rule-based keyword scoring (HOMESCHOOL / EDUCATION_ADJACENT / NOISE)
  Tier 2 — Gemini-powered impact classification (INCREASE / DECREASE / NEUTRAL + ESA)

Usage:
    # Classify candidates from LegiScan
    from classify_bills import filter_relevant, BillPipeline

    pipeline = BillPipeline()
    stats = pipeline.stats()          # Show distribution
    pipeline.process_batch(50)        # Analyze N unanalyzed bills
    pipeline.backfill()              # Analyze ALL unanalyzed bills
"""

import os
import sys
import json
import re
import time
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any

import psycopg2
import psycopg2.extras

# ── Tier 1: Rule-based relevance filtering (unchanged) ────────────────

_HOMESCHOOL_STRONG = [
    r"homeschool", r"home.school", r"home.education", r"home.instruction",
    r"home.based.instruction", r"home.study",
    r"homeschooling", r"home.schooled", r"home.educated",
    r"home.education.program",
    r"parent.managed.learning",
    r"homeschool.parent", r"home.school.student",
    r"homeschool.athletics", r"home.school.athletics",
    r"homeschool.driver.training",
    r"homeschool.act", r"home.school.act",
    r"homeschool.bill.of.rights",
    r"homeschool.proud",
    r"homeschool.day", r"homeschool.awareness",
    r"homeschool.opportunities",
    r"homeschooling.for.military",
    r"home.education.advisory.council",
    r"home.instruction.compliant",
    r"prohibition.against.character.tracking",
    r"home.school.prohibition",
    r"microschool", r"micro.school", r"micro.education",
]

_EDUCATION_ADJACENT_STRONG = [
    r"education.savings.account", r"esa.program", r"esa.for",
    r"school.choice", r"education.voucher", r"education.scholarship",
    r"learning.account", r"education.freedom", r"parental.choice",
    r"tuition.tax.credit", r"education.tax.credit", r"parental.choice.tax.credit",
    r"hope.scholarship", r"opportunity.scholarship", r"scholarship.program",
    r"family.empowerment.scholarship", r"education.opportunity.account",
    r"scholarship.granting.organization", r"backpack.funding",
    r"empowerment.scholarship",
    r"charter.school.enroll", r"charter.school.attend",
    r"part.time.enroll", r"part.time.attend", r"course.enroll", r"open.enroll",
    r"compulsory.attend", r"compulsory.education", r"compulsory.instruction",
    r"compulsory.attendance", r"compulsory.age", r"compulsory.school.age",
    r"truancy", r"habitual.truan",
    r"curriculum.approval", r"portfolio.review", r"superintendent.notification",
    r"home.school.affidavit", r"private.school.affidavit",
    r"alternative.instruction", r"correspondence.study", r"correspondence.program",
    r"attendance.exception", r"attendance.policy",
    r"private.school.attend", r"private.school.scholarship", r"nonpublic.school",
    r"parental.rights.education", r"parental.rights.school",
    r"parents.interest.child.upbringing", r"parental.involvement.education",
    r"alternative.credential", r"blended.learning", r"virtual.charter",
    r"education.funding", r"student.based.funding", r"school.funding.formula",
    r"child.labor", r"minor.work.permit", r"minor.employment.certif",
]

_NOISE_PATTERNS = [
    r"^wildfire", r"^fire.hazard", r"^carpet",
    r"^veterans.bond", r"^unmanned.aircraft",
    r"^manufactured.housing", r"^smoke.shop", r"^floating.home",
]


def _rgx(pattern: str) -> re.Pattern:
    """Build case-insensitive regex with flexible separators."""
    return re.compile(pattern.replace(".", r"[\-\s]*"), re.IGNORECASE)


def classify_bill(bill: dict) -> dict:
    """Classify a bill as HOMESCHOOL / EDUCATION_ADJACENT / NOISE by title."""
    title = bill.get("title") or ""
    title_lower = title.lower()

    for pat in _NOISE_PATTERNS:
        if _rgx(pat).search(title_lower):
            bill["relevance"] = "NOISE"
            bill["relevance_score"] = 0
            bill["relevance_reason"] = f"Matched noise pattern: {pat}"
            return bill

    for pat in _HOMESCHOOL_STRONG:
        if _rgx(pat).search(title_lower):
            bill["relevance"] = "HOMESCHOOL"
            bill["relevance_score"] = 3
            bill["relevance_reason"] = f"Matched homeschool pattern: {pat}"
            return bill

    for pat in _EDUCATION_ADJACENT_STRONG:
        if _rgx(pat).search(title_lower):
            bill["relevance"] = "EDUCATION_ADJACENT"
            bill["relevance_score"] = 2
            bill["relevance_reason"] = f"Matched education-adjacent pattern: {pat}"
            return bill

    bill["relevance"] = "NOISE"
    bill["relevance_score"] = 0
    bill["relevance_reason"] = "No relevant patterns matched in title"
    return bill


def filter_relevant(bills: list, min_score: int = 2) -> dict:
    """Filter bills by relevance score. Returns filtered list + stats."""
    results = [classify_bill(b) for b in bills]
    by_rel = {}
    for r in results:
        rel = r.get("relevance", "NOISE")
        by_rel[rel] = by_rel.get(rel, 0) + 1

    filtered = [r for r in results if r.get("relevance_score", 0) >= min_score]
    return {
        "bills": filtered,
        "stats": by_rel,
        "total_input": len(bills),
        "total_output": len(filtered),
    }


# ── Tier 2: BillPipeline — Gemini-powered impact analysis ────────────

PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(PIPELINE_DIR), "services"))
from gemini_classifier import GeminiBillClassifier


class BillPipeline:
    """
    Orchestrates Gemini-powered impact classification against the Neon DB.

    Modes:
      - backfill: process ALL bills where analyzed_at IS NULL
      - batch: process N bills
      - stats: show classification distribution
    """

    def __init__(self, dsn: str = ""):
        # Load env if not already set
        if not dsn and not os.environ.get("DATABASE_URL_ADMIN"):
            env_path = os.environ.get("PIPELINE_ENV_FILE", "/opt/homeschool-compass/.env")
            if os.path.exists(env_path):
                with open(env_path) as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        key, _, value = line.partition("=")
                        os.environ.setdefault(key.strip(), value.strip())

        self.dsn = dsn or os.environ.get("DATABASE_URL_ADMIN", "")
        self.classifier = GeminiBillClassifier()
        self.analysis_version = f"gemini-{self.classifier.model}-v1"

    def _get_conn(self):
        """Get a Neon DB connection."""
        import psycopg2
        conn = psycopg2.connect(self.dsn)
        conn.autocommit = True
        return conn

    def get_unanalyzed_bills(self, limit: int = 100) -> List[Dict]:
        """Get bills that haven't been analyzed yet (analyzed_at IS NULL)."""
        conn = self._get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute("""
                    SELECT id, state_code, number, title, impact_summary as description
                    FROM bills
                    WHERE analyzed_at IS NULL
                    ORDER BY updated_at DESC
                    LIMIT %s
                """, (limit,))
                rows = []
                for r in cur.fetchall():
                    row = {}
                    for k in r.keys():
                        row[str(k)] = r[k]
                    rows.append(row)
            return rows
        finally:
            conn.close()

    def count_unanalyzed(self) -> int:
        """Count bills pending analysis."""
        conn = self._get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT count(*) FROM bills WHERE analyzed_at IS NULL")
                return cur.fetchone()[0]
        finally:
            conn.close()

    def update_bill_analysis(self, bill_id: str, result: Dict):
        """Write Gemini analysis result back to the bills table."""
        now_str = datetime.now(timezone.utc).isoformat()
        analysis_points = json.dumps(result.get("analysis_points", []))
        key_provisions = json.dumps(result.get("key_provisions", []))

        conn = self._get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE bills SET
                        impact = %s,
                        impact_confidence = %s,
                        impact_summary = %s,
                        delta = %s,
                        action_required = %s,
                        esa_related = %s,
                        esa_related_confidence = %s,
                        effective_date = %s,
                        target_audience = %s,
                        analysis = %s,
                        analyzed_at = %s,
                        analysis_version = %s,
                        updated_at = NOW()
                    WHERE id = %s
                """, (
                    result["impact"],
                    result["impact_confidence"],
                    result["impact_summary"],
                    result["delta"],
                    result["action_required"],
                    result["esa_related"],
                    result["esa_confidence"],
                    result["effective_date"],
                    result["target_audience"],
                    json.dumps({"analysis_points": result["analysis_points"],
                                 "key_provisions": result["key_provisions"]}),
                    now_str,
                    self.analysis_version,
                    bill_id,
                ))
        except Exception as e:
            print(f"    ✗ Failed to update bill {bill_id}: {e}")
            raise
        finally:
            conn.close()

    def process_batch(self, batch_size: int = 50) -> Dict[str, int]:
        """
        Analyze a batch of unanalyzed bills using multi-batch Gemini calls.

        Bills are processed in groups of 50 per single Gemini call, reducing
        API calls from N to ~N/50.

        Args:
            batch_size: Max bills to process in this batch

        Returns:
            Dict with counts: analyzed, skipped, failed
        """
        bills = self.get_unanalyzed_bills(limit=batch_size)
        if not bills:
            return {"analyzed": 0, "skipped": 0, "failed": 0}

        print(f"\nProcessing {len(bills)} bills via multi-batch Gemini...")

        # Group bills into sub-batches of 20 for multi-batch calls
        # (50 was too many — Gemini truncated the JSON response at 8K tokens)
        SUB_BATCH = 20
        analyzed = 0
        failed = 0
        skipped = 0

        for start_idx in range(0, len(bills), SUB_BATCH):
            sub_batch = bills[start_idx:start_idx + SUB_BATCH]
            print(f"  Multi-batch [{start_idx+1}-{start_idx+len(sub_batch)}/{len(bills)}]...")

            try:
                # Filter out short-title bills
                valid_bills = [b for b in sub_batch if len(b.get("title", "")) >= 5]
                skipped += len(sub_batch) - len(valid_bills)

                if not valid_bills:
                    continue

                # Single Gemini call for the whole sub-batch
                results = self.classifier.batch_analyze_multi(
                    bills=valid_bills,
                    deep_analysis=True,
                )

                # Write results
                for i, bill in enumerate(valid_bills):
                    try:
                        result = results[i] if i < len(results) else self.classifier._fallback_result()
                        
                        # If fallback (Gemini failed), retry individually
                        if result.get("_fallback", False):
                            bill_id = bill["id"]
                            title = bill.get("title", "")
                            state = bill.get("state_code", "")
                            description = bill.get("description") or bill.get("impact_summary") or ""
                            print(f"    ⚠️  Fallback for {bill_id}, retrying individually...")
                            individual_result = self.classifier.analyze_bill(
                                title=title, state=state, description=description,
                                deep_analysis=True,
                            )
                            result = individual_result if not individual_result.get("_fallback", False) else result
                            if result.get("_fallback", False):
                                print(f"    ✗ Still fallback for {bill_id}, skipping")
                                skipped += 1
                                continue
                        
                        self.update_bill_analysis(bill["id"], result)
                        analyzed += 1
                    except Exception as e:
                        print(f"    ✗ Error updating bill {bill.get('id', 'unknown')}: {e}")
                        failed += 1

                # Brief delay between multi-batches
                if start_idx + SUB_BATCH < len(bills):
                    time.sleep(0.5)

            except Exception as e:
                print(f"    ✗ Multi-batch call failed: {e}")
                failed += len(sub_batch)

        return {"analyzed": analyzed, "skipped": skipped, "failed": failed}

    def backfill(self, batch_size: int = 50) -> Dict[str, int]:
        """
        Backfill ALL unanalyzed bills. Processes in batches.

        Args:
            batch_size: Bills per Gemini call

        Returns:
            Cumulative counts
        """
        total = self.count_unanalyzed()
        print(f"\n{'='*60}")
        print(f"  BACKFILL: {total} bills pending analysis")
        print(f"{'='*60}\n")

        if total == 0:
            print("✓ No bills need analysis.")
            return {"analyzed": 0, "skipped": 0, "failed": 0}

        cumulative = {"analyzed": 0, "skipped": 0, "failed": 0}
        processed = 0

        while processed < total:
            remaining = total - processed
            this_batch = min(batch_size, remaining)
            print(f"\n--- Batch at {processed}/{total} (next: {this_batch}) ---")

            result = self.process_batch(batch_size=this_batch)
            cumulative["analyzed"] += result["analyzed"]
            cumulative["skipped"] += result["skipped"]
            cumulative["failed"] += result["failed"]
            processed += result["analyzed"] + result["skipped"]

            # Re-count unanalyzed to catch any batch issues
            new_total = self.count_unanalyzed()
            if new_total == 0:
                break
            if new_total >= total:
                print(f"  ⚠️  No progress detected (was {total}, now {new_total}), stopping")
                break
            total = new_total

        return cumulative

    def stats(self) -> Dict[str, Any]:
        """Show classification distribution across all bills."""
        conn = self._get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute("""
                    SELECT
                        count(*) as total,
                        count(*) FILTER (WHERE impact = 'increase') as increase,
                        count(*) FILTER (WHERE impact = 'decrease') as decrease,
                        count(*) FILTER (WHERE impact = 'neutral') as neutral,
                        count(*) FILTER (WHERE analyzed_at IS NOT NULL) as analyzed,
                        count(*) FILTER (WHERE analyzed_at IS NULL) as unanalyzed,
                        count(*) FILTER (WHERE esa_related = true) as esa_related,
                        round(avg(impact_confidence)::numeric, 3) as avg_confidence
                    FROM bills
                """)
                r = cur.fetchone()
                row = {}
                if r:
                    for k in r.keys():
                        row[str(k)] = r[k]
                return row
        finally:
            conn.close()


# ── CLI ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Bill Classification Pipeline")
    parser.add_argument("mode", nargs="?", default="stats",
                        choices=["stats", "batch", "backfill", "count"],
                        help="Pipeline mode")
    parser.add_argument("--batch-size", type=int, default=50,
                        help="Bills per batch (default: 50)")
    parser.add_argument("--dsn", type=str, default="",
                        help="Neon DSN (default: DATABASE_URL_ADMIN env var)")

    args = parser.parse_args()

    # Load env if available
    env_path = os.environ.get("PIPELINE_ENV_FILE", "/opt/homeschool-compass/.env")
    if not args.dsn and os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

    pipeline = BillPipeline(dsn=args.dsn)

    if args.mode == "stats":
        s = pipeline.stats()
        print(f"\nBill Classification Stats")
        print(f"{'='*50}")
        print(f"  Total bills:      {s['total']}")
        print(f"  Analyzed:         {s['analyzed']}")
        print(f"  Unanalyzed:       {s['unanalyzed']}")
        print(f"  INCREASE:         {s['increase']}")
        print(f"  DECREASE:         {s['decrease']}")
        print(f"  NEUTRAL:          {s['neutral']}")
        print(f"  ESA-related:      {s['esa_related']}")
        print(f"  Avg confidence:   {s['avg_confidence']}")

    elif args.mode == "count":
        n = pipeline.count_unanalyzed()
        print(f"Unanalyzed bills: {n}")

    elif args.mode == "batch":
        result = pipeline.process_batch(batch_size=args.batch_size)
        print(f"\nBatch complete:")
        print(f"  Analyzed: {result['analyzed']}")
        print(f"  Skipped:  {result['skipped']}")
        print(f"  Failed:   {result['failed']}")

    elif args.mode == "backfill":
        result = pipeline.backfill(batch_size=args.batch_size)
        print(f"\nBackfill complete:")
        print(f"  Analyzed: {result['analyzed']}")
        print(f"  Skipped:  {result['skipped']}")
        print(f"  Failed:   {result['failed']}")
        print(f"\nFinal stats:")
        s = pipeline.stats()
        print(f"  Total:    {s['total']}")
        print(f"  Analyzed: {s['analyzed']}")
        print(f"  Pending:  {s['unanalyzed']}")
