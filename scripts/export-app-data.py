#!/usr/bin/env python3
"""Export app-facing data from Neon to static JSON files.

Outputs to frontend/public/data/ — served as a static CDN for the iPad app.
No user data touches this process. Public records only.

Usage:
    python scripts/export-app-data.py              # write to public/data/
    python scripts/export-app-data.py --stdout      # dump to stdout (for verification)
    python scripts/export-app-data.py --out /path   # custom output dir
"""

import json
import os
import sys
import time
import argparse
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras


DB_URL = getattr(os, "getenv")("DATABASE_URL") or getattr(os, "getenv")("NEON_DB_URL")
PUBLIC_DATA_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "public", "data")
)
VERSION = 1  # bump when schema changes in a breaking way


def get_conn():
    """Get a psycopg2 connection to Neon."""
    if not DB_URL:
        print("FATAL: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    return conn


def query(sql: str) -> list[dict]:
    """Run a SQL query against Neon and return rows as dicts."""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql)
            return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def export_states() -> list[dict]:
    """Full state list for dashboard."""
    rows = query("""
        SELECT
            code, name, level, score,
            esa_active,
            esa_name,
            esa_programs,
            non_esa_programs,
            non_esa_verified_at
        FROM states
        ORDER BY code
    """)
    result = []
    for r in rows:
        esa_active = r.get("esa_active", False)
        esa_progs = r.get("esa_programs") or []
        non_esa_progs = r.get("non_esa_programs") or []
        result.append({
            "code": r["code"],
            "name": r["name"],
            "grade": r.get("level"),
            "score": r.get("score"),
            "esaName": r.get("esa_name"),
            "hasEsa": bool(esa_active),
            "hasNonEsa": len(non_esa_progs) > 0,
            "nonEsaPrograms": non_esa_progs,
            "nonEsaVerifiedAt": (
                r["non_esa_verified_at"].isoformat()
                if r.get("non_esa_verified_at")
                else None
            ),
        })
    return result


def export_bills() -> list[dict]:
    """All bills — flat list."""
    rows = query("""
        SELECT
            state_code, number, title, status_step, impact,
            impact_summary, delta, action_required,
            esa_related, effective_date, date
        FROM bills
        ORDER BY state_code, number
    """)
    result = []
    for r in rows:
        result.append({
            "state": r["state_code"],
            "number": r["number"],
            "title": r.get("title"),
            "status": r.get("status_step"),
            "impact": r.get("impact"),
            "impactSummary": r.get("impact_summary"),
            "delta": r.get("delta"),
            "actionRequired": r.get("action_required"),
            "esaRelated": r.get("esa_related", False),
            "effectiveDate": r.get("effective_date"),
            "date": r["date"].isoformat() if r.get("date") else None,
        })
    return result


def export_esa_programs() -> list[dict]:
    """Extract and flatten ESA programs from states table JSONB."""
    rows = query("""
        SELECT code AS state, esa_programs
        FROM states
        WHERE esa_programs IS NOT NULL AND esa_programs != '[]'::jsonb
    """)
    result = []
    for r in rows:
        programs = r.get("esa_programs") or []
        for prog in programs:
            prog["state"] = r["state"]
            result.append(prog)
    return result


def export_non_esa_programs() -> list[dict]:
    """Extract and flatten non-ESA programs from states table JSONB."""
    rows = query("""
        SELECT code AS state, non_esa_programs
        FROM states
        WHERE non_esa_programs IS NOT NULL AND non_esa_programs != '[]'::jsonb
    """)
    result = []
    for r in rows:
        programs = r.get("non_esa_programs") or []
        for prog in programs:
            prog["state"] = r["state"]
            result.append(prog)
    return result


def export_compliance_forms() -> list[dict]:
    """All 52 states' compliance form data."""
    rows = query("""
        SELECT code, name, compliance_forms
        FROM states
        ORDER BY code
    """)
    result = []
    for r in rows:
        forms = r.get("compliance_forms") or {}
        result.append({
            "state": r["code"],
            "name": r["name"],
            "notification": {
                "required": True,
                "formUrl": forms.get("notification_url") or forms.get("notification_form_url"),
            },
            "assessment": {
                "required": bool(forms.get("assessment_rules")),
                "details": forms.get("assessment_rules"),
            },
            "immunization": {
                "required": bool(forms.get("immunization_rules")),
                "details": forms.get("immunization_rules"),
            },
            "instructionDays": forms.get("instruction_days"),
            "recordkeeping": forms.get("recordkeeping"),
        })
    return result


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export app data from Neon to static JSON"
    )
    parser.add_argument(
        "--stdout", action="store_true", help="Dump JSON to stdout instead of writing files"
    )
    parser.add_argument(
        "--out", type=str, default=PUBLIC_DATA_DIR,
        help=f"Output directory (default: {PUBLIC_DATA_DIR})"
    )
    args = parser.parse_args()

    print("Exporting states...", file=sys.stderr)
    states = export_states()
    print(f"  \u2192 {len(states)} states", file=sys.stderr)

    print("Exporting bills...", file=sys.stderr)
    bills = export_bills()
    print(f"  \u2192 {len(bills)} bills", file=sys.stderr)

    print("Exporting ESA programs...", file=sys.stderr)
    esa = export_esa_programs()
    print(f"  \u2192 {len(esa)} programs", file=sys.stderr)

    print("Exporting non-ESA programs...", file=sys.stderr)
    non_esa = export_non_esa_programs()
    print(f"  \u2192 {len(non_esa)} programs", file=sys.stderr)

    print("Exporting compliance forms...", file=sys.stderr)
    forms = export_compliance_forms()
    print(f"  \u2192 {len(forms)} forms", file=sys.stderr)

    now = datetime.now(timezone.utc)
    manifest = {
        "version": VERSION,
        "lastUpdated": now.isoformat(),
        "exportedAt": int(time.time()),
        "counts": {
            "states": len(states),
            "bills": len(bills),
            "esaPrograms": len(esa),
            "nonEsaPrograms": len(non_esa),
            "complianceForms": len(forms),
        },
    }

    if args.stdout:
        output = {
            "manifest": manifest,
            "states": states,
            "bills": bills,
            "esaPrograms": esa,
            "nonEsaPrograms": non_esa,
            "complianceForms": forms,
        }
        json.dump(output, sys.stdout, indent=2, default=str)
        print()
        return

    out_dir = args.out
    os.makedirs(out_dir, exist_ok=True)

    files = {
        "states.json": states,
        "bills.json": bills,
        "esa-programs.json": esa,
        "non-esa-programs.json": non_esa,
        "compliance-forms.json": forms,
        f"v{manifest['version']}.json": manifest,
    }

    for filename, data in files.items():
        path = os.path.join(out_dir, filename)
        with open(path, "w") as f:
            json.dump(data, f, indent=2, default=str)
        print(f"  \u270f\ufe0f  {path} ({os.path.getsize(path):,} bytes)", file=sys.stderr)

    print(f"\n\u2705 Export complete \u2014 {len(files)} files written to {out_dir}", file=sys.stderr)


if __name__ == "__main__":
    main()
