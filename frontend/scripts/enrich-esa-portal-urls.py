#!/usr/bin/env python3
"""
Phase B4 — Enrich esa_programs with portal URLs, application URLs, platforms,
deadlines, and funding amounts from the ESA Portal Directory research.
Also adds MS and MT, removes OH and OK (vouchers/tax credits, not ESA).
"""
import json, subprocess, os
from datetime import datetime

# ── Load data ──
with open("data/reference/esa-portal-directory.json") as f:
    directory = json.load(f)

# DB URL
with open(".env.local") as f:
    db_url = next(line.split("=", 1)[1].strip() for line in f
                  if line.startswith("DATABASE_URL_UNPOOLED="))

# Get current DB state
result = subprocess.run(["psql", db_url, "-t", "-A", "-F", "|",
    "-c", "SELECT code, esa_programs FROM states ORDER BY code"],
    capture_output=True, text=True, timeout=15)
assert result.returncode == 0, f"Query failed: {result.stderr}"

current_db = {}
for line in result.stdout.strip().split("\n"):
    if "|" in line:
        code, data = line.split("|", 1)
        current_db[code] = json.loads(data) if data and data != "" else []

# Build directory lookup
dir_by_code = {s["state"]: s for s in directory}

# Platform mapping helper
def resolve_platform(entry):
    if entry["esa_uses_classwallet"]:
        return "ClassWallet"
    if entry["esa_uses_odyssey"]:
        return "Odyssey"
    if entry["esa_uses_other_platform"]:
        return entry["esa_uses_other_platform"]
    return "unknown"

# ── Build updates ──
updates = []
added = []
removed = []

for code, entry in sorted(dir_by_code.items()):
    if not entry["has_esa"]:
        # Non-ESA states — check if they're incorrectly in DB
        if code in current_db and current_db[code]:
            removed.append(code)
            updates.append((code, "null"))
        continue

    platform = resolve_platform(entry)

    if code not in current_db or not current_db[code]:
        # New ESA state not in DB — create program entry
        new_program = {
            "name": entry["esa_portal_name"],
            "status": entry["program_status"],
            "platform": platform,
            "portal_url": entry["esa_portal_url"],
            "application_url": entry["esa_application_url"],
            "max_award": entry["esa_funding_amount"],
            "eligibility": entry["esa_eligible_grades"],
            "compliance_burden": "medium",
            "deadline": entry["esa_application_deadline"],
            "deadlines": [{
                "due": entry["esa_application_deadline"] or "Verify current deadline",
                "type": "application_window",
                "description": f"{entry['esa_portal_name']} — {entry['program_status']}"
            }],
            "documents_required": ["Verify program requirements — see portal for details"],
            "forms": [],
            "notes": entry.get("esa_notes", "")
        }
        updates.append((code, json.dumps([new_program])))
        added.append(code)
        continue

    # Existing ESA state — enrich each program in the array
    programs = current_db[code]
    for prog in programs:
        if not prog.get("portal_url") or not prog.get("application_url"):
            prog["portal_url"] = entry["esa_portal_url"]
            prog["application_url"] = entry["esa_application_url"]
        if not prog.get("platform") or prog.get("platform") in ("", None):
            prog["platform"] = platform
        if not prog.get("deadline") or prog.get("deadline") in ("", None):
            prog["deadline"] = entry["esa_application_deadline"]
        if not prog.get("max_award") or prog.get("max_award") in ("", None):
            prog["max_award"] = entry["esa_funding_amount"]
        if not prog.get("notes"):
            prog["notes"] = entry.get("esa_notes", "")
        
        # Clean up null portal_url placeholders
        if prog.get("portal_url") in (None, "null", ""):
            prog["portal_url"] = entry["esa_portal_url"]
        if prog.get("application_url") in (None, "null", ""):
            prog["application_url"] = entry["esa_application_url"]

    updates.append((code, json.dumps(programs)))

# ── Execute ──
now = datetime.utcnow().isoformat()
count = 0

for code, data in updates:
    if data == "null":
        sql = f"UPDATE states SET esa_programs = NULL, esa_urls_verified_at = '{now}' WHERE code = '{code}';"
    else:
        # Escape single quotes for SQL
        safe = data.replace("'", "''")
        sql = f"UPDATE states SET esa_programs = '{safe}'::jsonb, esa_urls_verified_at = '{now}' WHERE code = '{code}';"
    
    r = subprocess.run(["psql", db_url, "-c", sql], capture_output=True, text=True, timeout=15)
    assert r.returncode == 0, f"UPDATE {code} failed: {r.stderr}"
    count += 1

# ── Report ──
print(f"✅ B4 enrichment complete: {count} states updated ({now})")
print(f"  Added: {', '.join(sorted(added)) if added else 'none'}")
print(f"  Removed (non-ESA): {', '.join(sorted(removed)) if removed else 'none'}")
print(f"  Enriched (existing): {count - len(added) - len(removed)} states had portal/platform/URL data filled")

# Verify
verify = subprocess.run(["psql", db_url, "-t", "-A", "-F", "|",
    "-c", "SELECT code, esa_programs FROM states WHERE esa_programs IS NOT NULL ORDER BY code"],
    capture_output=True, text=True, timeout=15)

esa_states = []
for line in verify.stdout.strip().split("\n"):
    if "|" in line:
        code, data = line.split("|", 1)
        try:
            progs = json.loads(data)
            null_portals = sum(1 for p in progs if not p.get("portal_url"))
            null_apps = sum(1 for p in progs if not p.get("application_url"))
            null_platforms = sum(1 for p in progs if not p.get("platform") or p["platform"] in ("", None))
            esa_states.append((code, len(progs), null_portals, null_apps, null_platforms))
        except:
            pass

print(f"\n  ESA states in DB: {len(esa_states)}")
print(f"  Total programs: {sum(s[1] for s in esa_states)}")
print(f"  Null portal URLs remaining: {sum(s[2] for s in esa_states)}")
print(f"  Null app URLs remaining: {sum(s[3] for s in esa_states)}")
print(f"  Null platforms remaining: {sum(s[4] for s in esa_states)}")

# Show any states with remaining nulls
issues = [s for s in esa_states if s[2] > 0 or s[3] > 0 or s[4] > 0]
if issues:
    print(f"\n  ⚠️  {len(issues)} states still have nulls:")
    for code, n, np, na, nplat in issues:
        print(f"    {code}: {n} prog(s), {np} null portal, {na} null app, {nplat} null platform")
else:
    print(f"\n  ✅ All ESA portal/app URLs and platforms populated")
