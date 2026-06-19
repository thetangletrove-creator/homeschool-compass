#!/usr/bin/env python3
"""
Enrich States — Populate ESA data and subscores for all 50 states.
Uses the same data sources as the frontend mock data but writes to Neon.

Usage:
    python3 enrich_states.py              # Upsert all state ESA data
    python3 enrich_states.py --check      # Show current state
    python3 enrich_states.py --state CA   # Single state
"""

import os
import sys
import json
from typing import Optional, Dict, List, Any

# ── ESA Data (mirrors frontend mock-data.ts) ──────────────────────────

STATE_DATA = [
    {"code": "AL", "name": "Alabama", "score": 82, "sub": {"reporting": 80, "testing": 90, "curriculum": 85, "teacher": 75}, "esa": {"active": True, "name": "CHOOSE Act ESA", "max_award": "$7,000", "eligibility": "All K-12 students phased in by 2027", "documentation": ["Enrollment affidavit", "Approved expense receipts"], "deadline": "April 7, 2026"}},
    {"code": "AK", "name": "Alaska", "score": 95, "sub": {"reporting": 98, "testing": 95, "curriculum": 95, "teacher": 92}, "esa": {"active": True, "name": "Correspondence Allotment", "max_award": "$3,400", "eligibility": "Enrolled correspondence students", "documentation": ["Individual Learning Plan"], "deadline": "Rolling"}},
    {"code": "AZ", "name": "Arizona", "score": 88, "sub": {"reporting": 90, "testing": 92, "curriculum": 90, "teacher": 80}, "esa": {"active": True, "name": "Empowerment Scholarship Account", "max_award": "$7,500", "eligibility": "Universal K-12 eligibility", "documentation": ["Quarterly expense reports", "Enrollment verification"], "deadline": "Rolling, quarterly"}},
    {"code": "AR", "name": "Arkansas", "score": 70, "sub": {"reporting": 65, "testing": 78, "curriculum": 80, "teacher": 60}, "esa": {"active": True, "name": "LEARNS Act EFA", "max_award": "$6,800", "eligibility": "Phasing to universal in 2025-26", "documentation": ["Approved provider receipts"], "deadline": "May 1, 2026"}},
    {"code": "CA", "name": "California", "score": 48, "sub": {"reporting": 42, "testing": 70, "curriculum": 45, "teacher": 35}, "esa": {"active": False}},
    {"code": "CO", "name": "Colorado", "score": 66, "sub": {"reporting": 55, "testing": 60, "curriculum": 80, "teacher": 70}, "esa": {"active": False}},
    {"code": "CT", "name": "Connecticut", "score": 78, "sub": {"reporting": 85, "testing": 80, "curriculum": 80, "teacher": 68}, "esa": {"active": False}},
    {"code": "DE", "name": "Delaware", "score": 72, "sub": {"reporting": 70, "testing": 78, "curriculum": 75, "teacher": 65}, "esa": {"active": False}},
    {"code": "FL", "name": "Florida", "score": 84, "sub": {"reporting": 80, "testing": 85, "curriculum": 88, "teacher": 82}, "esa": {"active": True, "name": "Family Empowerment Scholarship", "max_award": "$8,000", "eligibility": "Universal K-12 eligibility", "documentation": ["Quarterly compliance attestation"], "deadline": "Rolling"}},
    {"code": "GA", "name": "Georgia", "score": 68, "sub": {"reporting": 58, "testing": 65, "curriculum": 78, "teacher": 70}, "esa": {"active": True, "name": "Georgia Promise Scholarship", "max_award": "$6,500", "eligibility": "Students in low-performing zones", "documentation": ["Expense ledger"], "deadline": "March 15, 2026"}},
    {"code": "HI", "name": "Hawaii", "score": 58, "sub": {"reporting": 50, "testing": 55, "curriculum": 65, "teacher": 60}, "esa": {"active": False}},
    {"code": "ID", "name": "Idaho", "score": 96, "sub": {"reporting": 98, "testing": 96, "curriculum": 95, "teacher": 95}, "esa": {"active": False}},
    {"code": "IL", "name": "Illinois", "score": 90, "sub": {"reporting": 95, "testing": 92, "curriculum": 90, "teacher": 82}, "esa": {"active": False}},
    {"code": "IN", "name": "Indiana", "score": 80, "sub": {"reporting": 82, "testing": 80, "curriculum": 82, "teacher": 76}, "esa": {"active": True, "name": "Education Scholarship Account", "max_award": "$6,200", "eligibility": "Students with disabilities", "documentation": ["IEP or service plan"], "deadline": "September 1, 2026"}},
    {"code": "IA", "name": "Iowa", "score": 76, "sub": {"reporting": 72, "testing": 78, "curriculum": 80, "teacher": 72}, "esa": {"active": True, "name": "Students First ESA", "max_award": "$7,800", "eligibility": "Universal in 2025-26", "documentation": ["Approved expense receipts"], "deadline": "June 30, 2026"}},
    {"code": "KS", "name": "Kansas", "score": 74, "sub": {"reporting": 70, "testing": 75, "curriculum": 78, "teacher": 72}, "esa": {"active": False}},
    {"code": "KY", "name": "Kentucky", "score": 79, "sub": {"reporting": 78, "testing": 80, "curriculum": 82, "teacher": 75}, "esa": {"active": False}},
    {"code": "LA", "name": "Louisiana", "score": 60, "sub": {"reporting": 52, "testing": 60, "curriculum": 68, "teacher": 60}, "esa": {"active": True, "name": "LA GATOR Scholarship", "max_award": "$5,500", "eligibility": "Income-based phase-in", "documentation": ["Income verification", "Expense ledger"], "deadline": "April 30, 2026"}},
    {"code": "ME", "name": "Maine", "score": 73, "sub": {"reporting": 68, "testing": 75, "curriculum": 78, "teacher": 70}, "esa": {"active": False}},
    {"code": "MD", "name": "Maryland", "score": 71, "sub": {"reporting": 65, "testing": 72, "curriculum": 76, "teacher": 70}, "esa": {"active": False}},
    {"code": "MA", "name": "Massachusetts", "score": 56, "sub": {"reporting": 48, "testing": 55, "curriculum": 62, "teacher": 58}, "esa": {"active": False}},
    {"code": "MI", "name": "Michigan", "score": 92, "sub": {"reporting": 95, "testing": 94, "curriculum": 92, "teacher": 86}, "esa": {"active": False}},
    {"code": "MN", "name": "Minnesota", "score": 64, "sub": {"reporting": 55, "testing": 65, "curriculum": 70, "teacher": 64}, "esa": {"active": False}},
    {"code": "MS", "name": "Mississippi", "score": 86, "sub": {"reporting": 90, "testing": 88, "curriculum": 85, "teacher": 80}, "esa": {"active": False}},
    {"code": "MO", "name": "Missouri", "score": 81, "sub": {"reporting": 80, "testing": 82, "curriculum": 84, "teacher": 78}, "esa": {"active": True, "name": "MOScholars ESA", "max_award": "$6,400", "eligibility": "Income and geography based", "documentation": ["Expense receipts"], "deadline": "August 1, 2026"}},
    {"code": "MT", "name": "Montana", "score": 94, "sub": {"reporting": 96, "testing": 95, "curriculum": 94, "teacher": 90}, "esa": {"active": False}},
    {"code": "NE", "name": "Nebraska", "score": 75, "sub": {"reporting": 72, "testing": 76, "curriculum": 78, "teacher": 72}, "esa": {"active": False}},
    {"code": "NV", "name": "Nevada", "score": 83, "sub": {"reporting": 84, "testing": 85, "curriculum": 84, "teacher": 78}, "esa": {"active": False}},
    {"code": "NH", "name": "New Hampshire", "score": 87, "sub": {"reporting": 88, "testing": 88, "curriculum": 88, "teacher": 82}, "esa": {"active": True, "name": "Education Freedom Account", "max_award": "$5,200", "eligibility": "Income up to 350% FPL", "documentation": ["Income verification", "Expense ledger"], "deadline": "June 30, 2026"}},
    {"code": "NJ", "name": "New Jersey", "score": 91, "sub": {"reporting": 94, "testing": 92, "curriculum": 92, "teacher": 84}, "esa": {"active": False}},
    {"code": "NM", "name": "New Mexico", "score": 77, "sub": {"reporting": 74, "testing": 78, "curriculum": 80, "teacher": 74}, "esa": {"active": False}},
    {"code": "NY", "name": "New York", "score": 38, "sub": {"reporting": 30, "testing": 45, "curriculum": 40, "teacher": 35}, "esa": {"active": False}},
    {"code": "NC", "name": "North Carolina", "score": 69, "sub": {"reporting": 62, "testing": 68, "curriculum": 76, "teacher": 70}, "esa": {"active": True, "name": "Opportunity Scholarship", "max_award": "$7,200", "eligibility": "Universal with income tiers", "documentation": ["Enrollment verification"], "deadline": "March 1, 2026"}},
    {"code": "ND", "name": "North Dakota", "score": 72, "sub": {"reporting": 68, "testing": 74, "curriculum": 76, "teacher": 70}, "esa": {"active": False}},
    {"code": "OH", "name": "Ohio", "score": 80, "sub": {"reporting": 82, "testing": 80, "curriculum": 82, "teacher": 76}, "esa": {"active": True, "name": "EdChoice Scholarship", "max_award": "$6,000", "eligibility": "Universal income-scaled", "documentation": ["Income verification"], "deadline": "April 15, 2026"}},
    {"code": "OK", "name": "Oklahoma", "score": 85, "sub": {"reporting": 86, "testing": 86, "curriculum": 86, "teacher": 80}, "esa": {"active": True, "name": "Parental Choice Tax Credit", "max_award": "$7,500", "eligibility": "Income-prioritized credit", "documentation": ["Tax credit application", "Receipts"], "deadline": "February 5, 2026"}},
    {"code": "OR", "name": "Oregon", "score": 67, "sub": {"reporting": 58, "testing": 64, "curriculum": 75, "teacher": 70}, "esa": {"active": False}},
    {"code": "PA", "name": "Pennsylvania", "score": 52, "sub": {"reporting": 44, "testing": 55, "curriculum": 58, "teacher": 50}, "esa": {"active": False}},
    {"code": "RI", "name": "Rhode Island", "score": 62, "sub": {"reporting": 55, "testing": 62, "curriculum": 68, "teacher": 62}, "esa": {"active": False}},
    {"code": "SC", "name": "South Carolina", "score": 70, "sub": {"reporting": 64, "testing": 70, "curriculum": 76, "teacher": 70}, "esa": {"active": True, "name": "Education Scholarship Trust Fund", "max_award": "$6,000", "eligibility": "Income up to 300% FPL", "documentation": ["Income verification", "Receipts"], "deadline": "January 31, 2026"}},
    {"code": "SD", "name": "South Dakota", "score": 88, "sub": {"reporting": 90, "testing": 90, "curriculum": 88, "teacher": 82}, "esa": {"active": False}},
    {"code": "TN", "name": "Tennessee", "score": 78, "sub": {"reporting": 76, "testing": 78, "curriculum": 82, "teacher": 74}, "esa": {"active": True, "name": "Education Freedom Scholarship", "max_award": "$7,300", "eligibility": "Universal in 2025-26", "documentation": ["Enrollment verification"], "deadline": "May 15, 2026"}},
    {"code": "TX", "name": "Texas", "score": 89, "sub": {"reporting": 92, "testing": 90, "curriculum": 90, "teacher": 82}, "esa": {"active": True, "name": "Texas ESA Program", "max_award": "$10,000", "eligibility": "Universal, launching 2026-27", "documentation": ["Enrollment verification", "Receipts"], "deadline": "June 1, 2026"}},
    {"code": "UT", "name": "Utah", "score": 84, "sub": {"reporting": 84, "testing": 85, "curriculum": 86, "teacher": 80}, "esa": {"active": True, "name": "Utah Fits All Scholarship", "max_award": "$8,000", "eligibility": "Universal K-12 eligibility", "documentation": ["Expense ledger", "Annual assessment"], "deadline": "February 28, 2026"}},
    {"code": "VT", "name": "Vermont", "score": 76, "sub": {"reporting": 72, "testing": 78, "curriculum": 80, "teacher": 72}, "esa": {"active": False}},
    {"code": "VA", "name": "Virginia", "score": 80, "sub": {"reporting": 82, "testing": 80, "curriculum": 82, "teacher": 76}, "esa": {"active": False}},
    {"code": "WA", "name": "Washington", "score": 65, "sub": {"reporting": 56, "testing": 64, "curriculum": 74, "teacher": 66}, "esa": {"active": False}},
    {"code": "WV", "name": "West Virginia", "score": 83, "sub": {"reporting": 82, "testing": 84, "curriculum": 86, "teacher": 80}, "esa": {"active": True, "name": "Hope Scholarship", "max_award": "$5,000", "eligibility": "Universal K-12 eligibility", "documentation": ["Expense receipts"], "deadline": "May 15, 2026"}},
    {"code": "WI", "name": "Wisconsin", "score": 82, "sub": {"reporting": 84, "testing": 82, "curriculum": 84, "teacher": 78}, "esa": {"active": False}},
    {"code": "WY", "name": "Wyoming", "score": 85, "sub": {"reporting": 86, "testing": 86, "curriculum": 86, "teacher": 80}, "esa": {"active": True, "name": "Steamboat Legacy Scholarship", "max_award": "$6,000", "eligibility": "Income up to 250% FPL", "documentation": ["Income verification"], "deadline": "April 1, 2026"}},
]


def level_from_score(score: int) -> str:
    if score >= 85: return "No Notice"
    elif score >= 70: return "Low Regulation"
    elif score >= 50: return "Moderate"
    else: return "High"


def enrich_states(dsn: str = "", states_filter: Optional[List[str]] = None, check_only: bool = False):
    """Enrich states table with ESA data and subscores."""
    # Load env
    if not dsn:
        env_path = os.environ.get("PIPELINE_ENV_FILE", "/opt/homeschool-compass/.env")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, _, value = line.partition("=")
                    os.environ.setdefault(key.strip(), value.strip())
        dsn = os.environ.get("DATABASE_URL_ADMIN", "")

    import psycopg2
    conn = psycopg2.connect(dsn)
    conn.autocommit = True

    try:
        if check_only:
            with conn.cursor() as cur:
                cur.execute("SELECT code, esa_active, esa_name, score FROM states ORDER BY code")
                rows = cur.fetchall()
                print(f"\nCurrent state of states table ({len(rows)} rows):")
                print(f"  {'Code':<6} {'Score':<8} {'ESA Active':<12} {'ESA Name':<40}")
                print(f"  {'-'*6} {'-'*8} {'-'*12} {'-'*40}")
                esa_count = 0
                for row in rows:
                    print(f"  {row[0]:<6} {row[3]:<8} {str(row[1]):<12} {(row[2] or ''):<40}")
                    if row[1]:
                        esa_count += 1
                print(f"\nStates with ESA: {esa_count}/{len(rows)}")
            return

        # Upsert each state
        with conn.cursor() as cur:
            processed = 0
            for sd in STATE_DATA:
                if states_filter and sd["code"] not in states_filter:
                    continue

                esa = sd["esa"]
                level = level_from_score(sd["score"])
                subscores_json = json.dumps(sd["sub"])

                cur.execute("""
                    INSERT INTO states
                        (code, name, score, subscores, level,
                         esa_active, esa_name, esa_max_award, esa_eligibility,
                         esa_documentation, esa_deadline, updated_at)
                    VALUES (%s, %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, NOW())
                    ON CONFLICT (code) DO UPDATE SET
                        name = EXCLUDED.name,
                        score = EXCLUDED.score,
                        subscores = EXCLUDED.subscores,
                        level = EXCLUDED.level,
                        esa_active = EXCLUDED.esa_active,
                        esa_name = EXCLUDED.esa_name,
                        esa_max_award = EXCLUDED.esa_max_award,
                        esa_eligibility = EXCLUDED.esa_eligibility,
                        esa_documentation = EXCLUDED.esa_documentation,
                        esa_deadline = EXCLUDED.esa_deadline,
                        updated_at = NOW()
                """, (
                    sd["code"], sd["name"], sd["score"], subscores_json, level,
                    esa["active"], esa.get("name"), esa.get("max_award"),
                    esa.get("eligibility"),
                    json.dumps(esa.get("documentation", [])),
                    esa.get("deadline"),
                ))
                processed += 1

            print(f"✓ Enriched {processed} states")

            # Verify
            cur.execute("SELECT count(*) FROM states WHERE esa_active = true")
            esa_count = cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM states")
            total = cur.fetchone()[0]
            print(f"  Total states: {total}")
            print(f"  ESA programs: {esa_count}")
            print(f"  No ESA:       {total - esa_count}")

    finally:
        conn.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Enrich states with ESA data")
    parser.add_argument("--check", action="store_true", help="Check current state")
    parser.add_argument("--state", type=str, help="Single state code to update")
    parser.add_argument("--dsn", type=str, default="", help="Neon DSN")

    args = parser.parse_args()

    state_filter = [args.state.upper()] if args.state else None
    enrich_states(dsn=args.dsn, states_filter=state_filter, check_only=args.check)
