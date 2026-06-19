#!/usr/bin/env python3
"""
Phase B3 — Enrich compliance_forms with real data from compliance-forms-directory.json.
Maps the research directory's 51-jurisdiction compliance data into the DB's
compliance_forms JSONB format with notification URLs, assessment rules, 
recordkeeping requirements, instruction days, and immunization rules.
"""
import json, subprocess, re
from datetime import datetime

# ── Load research data ──
with open("data/reference/compliance-forms-directory.json") as f:
    directory = json.load(f)

# DB URL
with open(".env.local") as f:
    db_url = next(line.split("=", 1)[1].strip() for line in f
                  if line.startswith("DATABASE_URL_UNPOOLED="))

dir_by_code = {s["state"]: s for s in directory}

# ── Mapping helpers ──

def get_testing_text(s):
    """Convert testing_required object to assessment_rules string."""
    t = s.get("testing_required", {})
    if not t.get("required"):
        return "No mandatory state assessment required for homeschoolers"
    
    parts = []
    if t.get("grades"):
        parts.append(f"Testing required at grades: {t['grades']}")
    if t.get("accepted_tests"):
        parts.append(f"Accepted: {', '.join(t['accepted_tests'])}")
    if t.get("scoring_threshold"):
        parts.append(f"Threshold: {t['scoring_threshold']}")
    
    return "; ".join(parts) if parts else "Annual assessment required"

def get_recordkeeping_text(s):
    """Build recordkeeping description from multiple fields."""
    records = []
    if s.get("attendance_records_required"):
        records.append("Attendance records required")
    if s.get("portfolio_review"):
        records.append("Portfolio review required")
    if s.get("days_of_instruction"):
        records.append(f"Minimum {s['days_of_instruction']} days of instruction")
    
    notes = s.get("notes", "")
    if records:
        return "; ".join(records)
    elif "No" not in notes:
        return "No mandatory recordkeeping requirements"
    return "No mandatory recordkeeping requirements"

def get_immunization_text(s):
    """Extract immunization info from notes."""
    notes = s.get("notes", "").lower()
    if "immunization" in notes:
        return "Immunization records required"
    return "Not required for homeschoolers"

def find_notification_form(s):
    """Find the notification form URL from compliance_forms array."""
    for form in s.get("compliance_forms", []):
        name = form.get("form_name", "").lower()
        if any(kw in name for kw in ["notice", "intent", "notification", "affidavit", 
                                       "declaration", "enrollment", "registration",
                                       "exemption", "home education notification",
                                       "home schooling notification"]):
            return form["form_url"]
    # Fallback: return first form's URL
    if s.get("compliance_forms"):
        return s["compliance_forms"][0]["form_url"]
    return s.get("state_doe_homeschool_page", "")

def find_assessment_form(s):
    """Find assessment-related form URL."""
    for form in s.get("compliance_forms", []):
        name = form.get("form_name", "").lower()
        if any(kw in name for kw in ["test", "assessment", "evaluation", "portfolio", "progress"]):
            return form["form_url"]
    return None

def build_recordkeeping_notes(s):
    """Build detailed recordkeeping note."""
    parts = []
    if s.get("attendance_records_required"):
        parts.append("Attendance records must be maintained")
    if s.get("portfolio_review"):
        parts.append("Portfolio of student work recommended")
    if s.get("days_of_instruction"):
        parts.append(f"Minimum {s['days_of_instruction']} days/equivalency required")
    notes = s.get("notes", "")
    if notes:
        parts.append(notes)
    return "; ".join(parts) if parts else "No mandatory recordkeeping requirements"

# ── Build compliance_forms JSONB for each state ──
now = datetime.utcnow().isoformat()
updates = []
stats = {"with_notification": 0, "with_assessment_url": 0, "real_data": 0, "total": 0}

for code, entry in sorted(dir_by_code.items()):
    notification_url = entry.get("state_doe_homeschool_page", "")
    notification_form = find_notification_form(entry)
    assessment_form = find_assessment_form(entry)
    
    compliance = {
        "notification_url": notification_url,
        "notification_form_url": notification_form,
        "assessment_rules": get_testing_text(entry),
        "assessment_form_url": assessment_form,
        "instruction_days": str(entry.get("days_of_instruction", "")) if entry.get("days_of_instruction") else None,
        "immunization_rules": get_immunization_text(entry),
        "recordkeeping": build_recordkeeping_notes(entry),
        "other_forms": []
    }
    
    # Clean up nulls
    compliance = {k: v for k, v in compliance.items() if v is not None}
    
    updates.append((code, json.dumps(compliance)))
    stats["total"] += 1
    if notification_form: stats["with_notification"] += 1
    if assessment_form: stats["with_assessment_url"] += 1
    if notification_url: stats["real_data"] += 1

# ── Execute ──
print(f"Updating {stats['total']} states with compliance data...")

for code, data in updates:
    safe = data.replace("'", "''")
    sql = f"UPDATE states SET compliance_forms = '{safe}'::jsonb, updated_at = now() WHERE code = '{code}';"
    r = subprocess.run(["psql", db_url, "-c", sql], capture_output=True, text=True, timeout=10)
    assert r.returncode == 0, f"UPDATE {code} failed: {r.stderr}"

print(f"✅ B3 compliance enrichment complete: {stats['total']} states updated")
print(f"  Notification URLs: {stats['with_notification']}/{stats['total']}")
print(f"  Assessment form URLs: {stats['with_assessment_url']}/{stats['total']}")
print(f"  State DOE pages: {stats['real_data']}/{stats['total']}")

# ── Verify ──
verify = subprocess.run(["psql", db_url, "-t", "-A", "-F", "|",
    "-c", "SELECT code, name, jsonb_pretty(compliance_forms) FROM states ORDER BY code"],
    capture_output=True, text=True, timeout=15)

null_notifications = []
null_assessment_urls = []
for line in verify.stdout.strip().split("\n"):
    if "|" in line:
        parts = line.split("|", 2)
        if len(parts) >= 3:
            code, name, data = parts
            try:
                cf = json.loads(data)
                if not cf.get("notification_form_url"):
                    null_notifications.append(code)
                if not cf.get("assessment_form_url"):
                    null_assessment_urls.append(code)
            except:
                pass

if null_notifications:
    print(f"\n  ⚠️  No notification form URL: {', '.join(null_notifications)}")
if null_assessment_urls:
    print(f"  ⚠️  No assessment form URL: {', '.join(null_assessment_urls)}")

# Show a sample
print(f"\n  Sample — TX:")
verify_tx = subprocess.run(["psql", db_url, "-t",
    "-c", "SELECT jsonb_pretty(compliance_forms) FROM states WHERE code='TX'"],
    capture_output=True, text=True, timeout=10)
print(f"  {verify_tx.stdout.strip()}")
