#!/usr/bin/env python3
"""Quick check of current esa_programs data vs. the new portal directory."""
import json, subprocess, os, sys

# Load portal directory
with open("data/reference/esa-portal-directory.json") as f:
    directory = json.load(f)

# Get DB URL from .env.local
with open(".env.local") as f:
    for line in f:
        line = line.strip()
        if line.startswith("DATABASE_URL_UNPOOLED="):
            db_url = line.split("=", 1)[1]
            break

# Query current esa_programs from DB
result = subprocess.run(
    ["psql", db_url, "-t", "-A", "-F", "|",
     "-c", "SELECT code, jsonb_pretty(esa_programs) FROM states WHERE esa_programs IS NOT NULL ORDER BY code"],
    capture_output=True, text=True, timeout=15
)

if result.returncode != 0:
    print(f"QUERY ERROR: {result.stderr}")
    sys.exit(1)

current = {}
for line in result.stdout.strip().split("\n"):
    if "|" in line:
        code, data = line.split("|", 1)
        try:
            current[code] = json.loads(data)
        except:
            current[code] = {"raw": data}

# Build lookup from directory
portal = {s["state"]: s for s in directory}

# Compare
print("=== Current DB esa_programs vs Portal Directory ===\n")

# Check ESA states that have portal URLs but DB has null
for s in sorted(portal.keys()):
    p = portal[s]
    if p["has_esa"]:
        c = current.get(s, {})
        if not c or c == [{}]:
            print(f"MISSING {s} ({p['name']}): not in DB esa_programs")
            continue
        
        # Check first program's portal_url
        first = c[0] if isinstance(c, list) and len(c) > 0 else c
        current_portal = first.get("portal_url", "") if isinstance(first, dict) else ""
        
        if current_portal in (None, "", "null"):
            print(f"NULL PORTAL {s} ({p['name']}): → {p['esa_portal_url']}")
        else:
            # Check if they match
            db_norm = current_portal.rstrip("/").lower()
            dir_norm = p["esa_portal_url"].rstrip("/").lower() if p["esa_portal_url"] else ""
            if db_norm != dir_norm:
                print(f"PORTAL MISMATCH {s}: DB={current_portal} DIR={p['esa_portal_url']}")
            # else:
            #     print(f"  OK {s}: portal matches ✓")

# Check platform assignments
platform_issues = []
for s in sorted(portal.keys()):
    p = portal[s]
    if not p["has_esa"]:
        continue
    c = current.get(s, [{}])
    first = c[0] if isinstance(c, list) and len(c) > 0 else c
    
    db_platform = first.get("platform", "") if isinstance(first, dict) else ""
    
    # Determine directory-platform
    if p["esa_uses_classwallet"]:
        dir_platform = "ClassWallet"
    elif p["esa_uses_odyssey"]:
        dir_platform = "Odyssey"
    elif p["esa_uses_other_platform"]:
        dir_platform = p["esa_uses_other_platform"]
    else:
        dir_platform = "unknown"
    
    if db_platform.lower().replace(" ", "") != dir_platform.lower().replace(" ", ""):
        platform_issues.append(f"PLATFORM {s}: DB={db_platform} DIR={dir_platform}")

# Print platform issues
if platform_issues:
    print(f"\n=== Platform mismatches ({len(platform_issues)}) ===")
    for issue in platform_issues:
        print(f"  {issue}")

# Non-ESA state check
non_esa = {s["state"]: s for s in directory if not s["has_esa"]}
esa_in_db = {s: v for s, v in current.items() if v and v != [{}]}
false_positives = set(non_esa.keys()) & set(esa_in_db.keys())
if false_positives:
    print(f"\n=== Non-ESA states currently in DB esa_programs ({len(false_positives)}) ===")
    for s in sorted(false_positives):
        print(f"  {s} ({non_esa[s]['program_status']})")

print(f"\n=== Summary ===")
print(f"ESA states in directory: {sum(1 for s in directory if s['has_esa'])}")
print(f"ESA states in DB: {len([s for s in current if current[s] and current[s] != [{}]])}")
print(f"Non-ESA states: {len(non_esa)}")
print(f"States needing portal URL update: {sum(1 for s in portal if portal[s]['has_esa'] and (not current.get(s) or not current[s][0].get('portal_url') if isinstance(current.get(s, []), list) and len(current.get(s, [])) > 0 else True))}")
