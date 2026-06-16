#!/usr/bin/env python3
"""
Validate our DB against HSLDA's tracked bills.
Cross-references every bill HSLDA tracks (support/oppose/monitor)
against what the pipeline found.
"""
import os
import sys
import json

# HSLDA major tracked bills for 2025-2026
HSLDA_TRACKED = {
    "CT": ["HB5468", "SB6"],
    "NH": ["HB1268", "CACR24"],
    "RI": ["HB8531", "SB2556"],
    "VT": ["HB930"],
    "HI": ["SB3193", "HB2376"],
    "TN": ["SB2636", "HB1729"],
    "MO": ["HB2426", "HB3123"],
    "NC": ["SB866"],
    "MN": ["SF4458", "HF3239", "SF3439"],
    "KY": ["HB275", "HB298"],
    "NE": ["LB1224", "LB1112", "LB1243"],
    "NY": ["S4037", "A323", "S199", "A2326", "A5313"],
    "NJ": ["S3910", "A3394", "A1886", "S741", "A1341"],
    "WV": ["SB116", "HB5053", "SB972", "HB5669"],
    "KS": ["SB491", "HB2717"],
    "IA": ["HF2366", "SJR2005", "HF2754", "SF2501"],
    "SD": ["HB1168"],
    "WY": ["HB149"],
    "MS": ["HB2", "HB1512"],
    "WA": ["SB6261"],
    "MI": ["HB5978", "HB5977", "HB5727"],
    "LA": ["HB1203", "HB1108", "HB232"],
    "SC": ["H4163"],
    "CA": ["SB1188", "SB1086"],
    "OH": ["SB277"],
    "AK": ["HB223", "HB248"],
    "CO": ["SJR020"],
}


def normalize(n):
    """Normalize bill number for comparison: strip spaces, lowercase."""
    return n.strip().lower().replace(" ", "")


def main():
    _env_path = os.environ.get("PIPELINE_ENV_FILE", "/opt/homeschool-compass/.env")
    if not os.environ.get("DATABASE_URL_ADMIN") and os.path.exists(_env_path):
        with open(_env_path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                if line.startswith('"') and line.endswith('"'):
                    line = line[1:-1]
                elif line.startswith("'") and line.endswith("'"):
                    line = line[1:-1]
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

    import psycopg2

    conn = psycopg2.connect(os.environ["DATABASE_URL_ADMIN"])
    cur = conn.cursor()

    # Get all bills
    cur.execute("SELECT state_code, number, title FROM bills ORDER BY state_code, number")
    our_bills = {}
    for r in cur.fetchall():
        sc = r[0]
        n = normalize(r[1])
        if sc not in our_bills:
            our_bills[sc] = {}
        our_bills[sc][n] = r[2]

    # Cross-reference
    found = []
    missed = []
    for state, bills in sorted(HSLDA_TRACKED.items()):
        for bn in bills:
            n = normalize(bn)
            if state in our_bills and n in our_bills[state]:
                found.append((state, bn, our_bills[state][n][:80]))
            else:
                # Try partial match (bill number without leading zeros)
                partial = False
                if state in our_bills:
                    for db_bn, title in our_bills[state].items():
                        db_norm = normalize(db_bn)
                        n_no_pad = n.lstrip("0")
                        db_no_pad = db_norm.lstrip("0")
                        if n_no_pad == db_no_pad:
                            found.append((state, bn, title[:80]))
                            partial = True
                            break
                if not partial:
                    missed.append((state, bn))

    # Stats
    total_hslda = sum(len(v) for v in HSLDA_TRACKED.values())
    print(f"HSLDA tracked bills: {total_hslda}")
    print(f"Found in our DB: {len(found)}")
    print(f"Missed: {len(missed)}")
    print(f"Catch rate: {len(found)/total_hslda*100:.1f}%")

    if missed:
        print(f"\n--- MISSED BILLS ({len(missed)}) ---")
        for state, bn in missed:
            print(f"  {state} {bn}")

    if found:
        print(f"\n--- FOUND BILLS (sample) ---")
        for state, bn, title in found[:30]:
            print(f"  ✅ {state} {bn}: {title}")

    # Also check what states we have vs HSLDA
    hslda_states = set(HSLDA_TRACKED.keys())
    our_states = set(our_bills.keys())
    missing_states = hslda_states - our_states
    if missing_states:
        print(f"\n--- STATES MISSING FROM DB ({len(missing_states)}) ---")
        for s in sorted(missing_states):
            print(f"  ❌ {s}")

    conn.close()
    return 0 if len(missed) == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
