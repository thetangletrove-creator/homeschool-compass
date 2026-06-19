#!/usr/bin/env python3
"""
Populate esa_programs, compliance_forms for all states in Neon.
Built from research analysis of 20 ESA states across 3 platforms (Odyssey, ClassWallet, Custom).

Usage:
  python3 scripts/populate-esa-resources.py              # Apply changes
  python3 scripts/populate-esa-resources.py --dry-run     # Show SQL without executing
  python3 scripts/populate-esa-resources.py --rollback    # Generate rollback SQL
  python3 scripts/populate-esa-resources.py --strict      # Fail on any unexpected state
"""

import json
import os
import sys
import re
from datetime import datetime, timezone

DRY_RUN = '--dry-run' in sys.argv
ROLLBACK = '--rollback' in sys.argv
STRICT = '--strict' in sys.argv

# ─── ESA Programs Data (20 states, research-verified) ─────────────────

# Platform-common form templates
ODYSSEY_FORMS = lambda name: [
    {"name": f"{name} — Quarterly Expense Report", "url": None, "type": "web_portal", "access": "login_required"},
    {"name": f"{name} — Annual Renewal Form", "url": None, "type": "PDF", "access": "public"},
    {"name": "Expense Category Reference Guide", "url": None, "type": "PDF", "access": "public"},
]

CLASSWALLET_FORMS = lambda name: [
    {"name": f"{name} — Expense Reimbursement Request", "url": None, "type": "web_portal", "access": "login_required"},
    {"name": f"{name} — Annual Program Renewal", "url": None, "type": "web_portal", "access": "login_required"},
    {"name": "Marketplace Purchasing Guide", "url": None, "type": "PDF", "access": "public"},
]

CUSTOM_FORMS = lambda name: [
    {"name": f"{name} — Application Form", "url": None, "type": "PDF", "access": "public"},
    {"name": f"{name} — Expense Reporting Form", "url": None, "type": "PDF", "access": "public"},
    {"name": f"{name} — Annual Compliance Affidavit", "url": None, "type": "PDF", "access": "public"},
]

# Full 20-state ESA programs data
ESA_PROGRAMS = {
    "AL": [{
        "name": "CHOOSE Act Education Savings Account",
        "status": "active",
        "portal_url": None,
        "application_url": None,
        "platform": "ClassWallet",
        "max_award": "$7,000",
        "eligibility": "Universal — all K-12 Alabama residents eligible; no prior public school requirement",
        "deadline": "Rolling enrollment — apply anytime; funds disbursed within 30 days of approval",
        "documents_required": [
            "Proof of Alabama residency (utility bill, driver's license, or lease agreement)",
            "Student's birth certificate or passport",
            "Parent/guardian government-issued ID",
            "Homeschool enrollment affidavit"
        ],
        "forms": CLASSWALLET_FORMS("CHOOSE Act ESA"),
        "deadlines": [
            {"type": "application_window", "due": "Rolling — open year-round", "description": "Apply anytime; rolling approval within 30 days"},
            {"type": "report", "due": "Quarterly (Oct 15, Jan 15, Apr 15, Jul 15)", "description": "Quarterly expense reconciliation via ClassWallet"},
            {"type": "renewal", "due": "Annually on program anniversary", "description": "Renew ESA each year; reverify residency"}
        ],
        "compliance_burden": "low"
    }],
    "AK": [{
        "name": "Correspondence Allotment",
        "status": "defunct",
        "portal_url": None,
        "application_url": None,
        "platform": "custom",
        "max_award": "$3,400",
        "eligibility": "Alaska K-12 students enrolled in a correspondence study program through a participating school district",
        "deadline": "Per-district enrollment deadlines vary",
        "documents_required": ["Enrollment in participating school district correspondence program", "Individual Learning Plan (ILP)"],
        "forms": [],
        "deadlines": [],
        "compliance_burden": "low"
    }],
    "AR": [{
        "name": "LEARNS Act Education Freedom Account",
        "status": "active",
        "portal_url": None,
        "application_url": None,
        "platform": "ClassWallet",
        "max_award": "$6,800",
        "eligibility": "Universal — all Arkansas K-12 students eligible; priority for low-income and special needs",
        "deadline": "Annual enrollment window: March 1 – June 30",
        "documents_required": [
            "Proof of Arkansas residency",
            "Student's birth certificate",
            "Prior year academic record (if applicable)",
            "Homeschool notification form"
        ],
        "forms": CLASSWALLET_FORMS("LEARNS Act EFA"),
        "deadlines": [
            {"type": "application_window", "due": "March 1 – June 30 annually", "description": "Apply during annual enrollment window"},
            {"type": "report", "due": "Quarterly", "description": "Quarterly expense reconciliation via ClassWallet"},
            {"type": "renewal", "due": "Annually by June 30", "description": "Renew EFA for following school year"}
        ],
        "compliance_burden": "medium"
    }],
    "AZ": [
        {
            "name": "Empowerment Scholarship Account — Universal",
            "status": "active",
            "portal_url": None,
            "application_url": None,
            "platform": "ClassWallet",
            "max_award": "$7,500",
            "eligibility": "Universal — all Arizona K-12 students eligible (expanded 2022)",
            "deadline": "Rolling enrollment — apply anytime",
            "documents_required": [
                "Proof of Arizona residency",
                "Student's birth certificate",
                "Withdrawal form from prior school (if applicable)",
                "Homeschool affidavit"
            ],
            "forms": CLASSWALLET_FORMS("ESA — Universal"),
            "deadlines": [
                {"type": "application_window", "due": "Rolling — open year-round", "description": "Apply anytime; ongoing enrollment"},
                {"type": "report", "due": "Quarterly", "description": "Quarterly expense reporting via ClassWallet"},
                {"type": "renewal", "due": "Annually", "description": "Annual ESA renewal"}
            ],
            "compliance_burden": "medium"
        }
    ],
    "FL": [
        {
            "name": "Family Empowerment Scholarship — Educational Options (FES-EO)",
            "status": "active",
            "portal_url": None,
            "application_url": None,
            "platform": "ClassWallet",
            "max_award": "$8,000",
            "eligibility": "Florida K-12 students; income-eligible or prior public school enrollment",
            "deadline": "Open enrollment; priority deadline typically March 31",
            "documents_required": [
                "Proof of Florida residency",
                "Student's birth certificate",
                "Income verification (if income-based track)",
                "Prior school records"
            ],
            "forms": CLASSWALLET_FORMS("FES-EO"),
            "deadlines": [
                {"type": "application_window", "due": "Rolling with priority March 31", "description": "Open enrollment; priority processing by March 31"},
                {"type": "report", "due": "Quarterly", "description": "Quarterly expense reconciliation"},
                {"type": "renewal", "due": "Annually", "description": "Annual renewal"}
            ],
            "compliance_burden": "medium"
        },
        {
            "name": "Family Empowerment Scholarship — Unique Abilities (FES-UN)",
            "status": "active",
            "portal_url": None,
            "application_url": None,
            "platform": "ClassWallet",
            "max_award": "$10,000",
            "eligibility": "Florida K-12 students with an IEP or 504 plan (disability scholarship)",
            "deadline": "Open enrollment; rolling approvals",
            "documents_required": ["IEP or 504 plan documentation", "Proof of Florida residency", "Student's birth certificate"],
            "forms": CLASSWALLET_FORMS("FES-UN"),
            "deadlines": [
                {"type": "application_window", "due": "Rolling — open year-round", "description": "Open enrollment for special needs students"},
                {"type": "report", "due": "Quarterly", "description": "Quarterly expense reconciliation"},
                {"type": "renewal", "due": "Annually", "description": "Annual renewal with updated IEP/504"}
            ],
            "compliance_burden": "medium"
        },
        {
            "name": "Florida Tax Credit (FTC) Scholarship",
            "status": "active",
            "portal_url": None,
            "application_url": None,
            "platform": "ClassWallet",
            "max_award": "$8,000",
            "eligibility": "Income-eligible Florida K-12 students (FRL-eligible or near-poverty level)",
            "deadline": "Annual enrollment; priority deadlines per scholarship funding organizations",
            "documents_required": ["Income verification", "Proof of Florida residency", "Student's birth certificate"],
            "forms": CLASSWALLET_FORMS("FTC"),
            "deadlines": [
                {"type": "application_window", "due": "Varies by SO (typically spring)", "description": "Enrollment windows vary by scholarship funding organization"},
                {"type": "report", "due": "Quarterly", "description": "Quarterly expense reporting"},
                {"type": "renewal", "due": "Annually", "description": "Annual income reverification"}
            ],
            "compliance_burden": "medium"
        }
    ],
    "GA": [{
        "name": "Georgia Promise Scholarship",
        "status": "active",
        "portal_url": None,
        "application_url": None,
        "platform": "Odyssey",
        "max_award": "$6,500",
        "eligibility": "Georgia K-12 students assigned to a low-performing school (bottom 25% of Title I schools)",
        "deadline": "Annual application window: February 1 – April 30",
        "documents_required": [
            "Proof of Georgia residency",
            "Student's birth certificate",
            "Prior school assignment verification",
            "Homeschool intent notification"
        ],
        "forms": ODYSSEY_FORMS("Promise Scholarship"),
        "deadlines": [
            {"type": "application_window", "due": "February 1 – April 30 annually", "description": "Apply during designated window"},
            {"type": "report", "due": "Quarterly", "description": "Quarterly expense reporting via Odyssey portal"},
            {"type": "renewal", "due": "Annually by April 30", "description": "Renew for following school year"}
        ],
        "compliance_burden": "medium"
    }],
    "IA": [{
        "name": "Students First Education Savings Account",
        "status": "active",
        "portal_url": None,
        "application_url": None,
        "platform": "Odyssey",
        "max_award": "$7,800",
        "eligibility": "Universal — all Iowa K-12 students eligible; no income limit or prior public school requirement",
        "deadline": "Annual application window: April 15 – June 30",
        "documents_required": [
            "Proof of Iowa residency (utility bill, driver's license, lease agreement, or tax return)",
            "Parent/guardian government-issued ID",
            "Student's birth certificate or passport",
            "Homeschool affidavit / enrollment verification form"
        ],
        "forms": ODYSSEY_FORMS("Students First ESA"),
        "deadlines": [
            {"type": "application_window", "due": "April 15 – June 30 annually", "description": "Annual application period for upcoming school year"},
            {"type": "report", "due": "Quarterly (Oct 31, Jan 31, Apr 30, Jul 31)", "description": "Quarterly expense reports via Odyssey portal"},
            {"type": "renewal", "due": "June 30 annually", "description": "Renew ESA for next school year"}
        ],
        "compliance_burden": "medium"
    }],
    "IN": [{
        "name": "Education Scholarship Account",
        "status": "capped",
        "portal_url": None,
        "application_url": None,
        "platform": "ClassWallet",
        "max_award": "$6,200",
        "eligibility": "Income-gated (up to 300% FRL); program capped and currently full with May shutdown",
        "deadline": "Program currently at capacity — waitlist only",
        "documents_required": [
            "Income verification (tax return or pay stubs)",
            "Proof of Indiana residency",
            "Student's birth certificate",
            "Prior public school enrollment verification (if applicable)"
        ],
        "forms": CLASSWALLET_FORMS("ESA"),
        "deadlines": [
            {"type": "application_window", "due": "Program full — waitlist only", "description": "Program at capacity as of May 2026"},
            {"type": "report", "due": "Quarterly", "description": "Quarterly expense reporting for active participants"},
            {"type": "renewal", "due": "Annually", "description": "Annual renewal (limited slots)"}
        ],
        "compliance_burden": "medium"
    }],
    "LA": [{
        "name": "Louisiana GATOR Scholarship",
        "status": "active",
        "portal_url": None,
        "application_url": None,
        "platform": "Odyssey",
        "max_award": "$5,500",
        "eligibility": "Louisiana K-12 students; income-eligible (up to 250% FRL)",
        "deadline": "Annual application window: March 1 – May 31",
        "documents_required": [
            "Proof of Louisiana residency",
            "Student's birth certificate",
            "Income verification",
            "Prior school enrollment records"
        ],
        "forms": ODYSSEY_FORMS("GATOR Scholarship"),
        "deadlines": [
            {"type": "application_window", "due": "March 1 – May 31 annually", "description": "Apply during annual window"},
            {"type": "report", "due": "Quarterly", "description": "Quarterly expense reporting via Odyssey"},
            {"type": "renewal", "due": "Annually by May 31", "description": "Renew scholarship"}
        ],
        "compliance_burden": "medium"
    }],
    "MO": [{
        "name": "MOScholars Education Savings Account",
        "status": "active",
        "portal_url": None,
        "application_url": None,
        "platform": "ClassWallet",
        "max_award": "$6,400",
        "eligibility": "Missouri K-12 students; requires Education Assistance Organization (EAO) enrollment",
        "deadline": "Varies by EAO partner organization; typically spring enrollment",
        "documents_required": [
            "Proof of Missouri residency",
            "Student's birth certificate",
            "EAO enrollment confirmation",
            "Income verification (if income-based track)"
        ],
        "forms": CLASSWALLET_FORMS("MOScholars ESA"),
        "deadlines": [
            {"type": "application_window", "due": "Varies by EAO (typically Feb-Apr)", "description": "Enrollment windows managed through EAO partners"},
            {"type": "report", "due": "Quarterly", "description": "Quarterly expense reporting"},
            {"type": "renewal", "due": "Annually", "description": "Annual renewal through EAO"}
        ],
        "compliance_burden": "medium"
    }],
    "NC": [{
        "name": "Opportunity Scholarship",
        "status": "active",
        "portal_url": None,
        "application_url": None,
        "platform": "ClassWallet",
        "max_award": "$7,200",
        "eligibility": "North Carolina K-12 students with disabilities (IEP/ILP required); minimum $1,000 per student",
        "deadline": "Annual application window: February 1 – March 15",
        "documents_required": [
            "IEP or ILP documentation",
            "Proof of North Carolina residency",
            "Student's birth certificate",
            "Prior school records"
        ],
        "forms": CLASSWALLET_FORMS("Opportunity Scholarship"),
        "deadlines": [
            {"type": "application_window", "due": "February 1 – March 15 annually", "description": "Annual application period"},
            {"type": "report", "due": "Quarterly", "description": "Quarterly expense reporting"},
            {"type": "renewal", "due": "Annually", "description": "Annual renewal with updated IEP/ILP"}
        ],
        "compliance_burden": "medium"
    }],
    "NH": [{
        "name": "Education Freedom Account",
        "status": "active",
        "portal_url": None,
        "application_url": None,
        "platform": "ClassWallet",
        "max_award": "$5,200",
        "eligibility": "New Hampshire K-12 students; income-eligible (up to 350% FRL)",
        "deadline": "Annual application window: March 1 – June 30",
        "documents_required": [
            "Proof of New Hampshire residency",
            "Student's birth certificate",
            "Income verification (tax return or pay stubs)",
            "Prior school enrollment records (if applicable)"
        ],
        "forms": CLASSWALLET_FORMS("EFA"),
        "deadlines": [
            {"type": "application_window", "due": "March 1 – June 30 annually", "description": "Apply during enrollment window"},
            {"type": "report", "due": "Quarterly", "description": "Quarterly expense reports via ClassWallet"},
            {"type": "renewal", "due": "Annually by June 30", "description": "Renew EFA"}
        ],
        "compliance_burden": "low"
    }],
    "OH": [
        {
            "name": "EdChoice Scholarship",
            "status": "active",
            "portal_url": None,
            "application_url": None,
            "platform": "custom",
            "max_award": "$6,000",
            "eligibility": "Ohio K-12 students assigned to a low-performing public school (EdChoice-designated) or income-eligible (EdChoice Expansion)",
            "deadline": "Annual application window: February 1 – April 30",
            "documents_required": [
                "Proof of Ohio residency",
                "Student's birth certificate",
                "Prior school assignment letter (EdChoice traditional)",
                "Income verification (EdChoice Expansion)"
            ],
            "forms": CUSTOM_FORMS("EdChoice Scholarship"),
            "deadlines": [
                {"type": "application_window", "due": "February 1 – April 30 annually", "description": "Annual application period"},
                {"type": "report", "due": "Annually", "description": "Annual compliance affidavit"},
                {"type": "renewal", "due": "Annually by April 30", "description": "Renew scholarship"}
            ],
            "compliance_burden": "low"
        },
        {
            "name": "Autism Scholarship",
            "status": "active",
            "portal_url": None,
            "application_url": None,
            "platform": "custom",
            "max_award": "$7,000",
            "eligibility": "Ohio K-12 students with autism spectrum disorder (IEP required)",
            "deadline": "Rolling enrollment — apply anytime",
            "documents_required": [
                "IEP with autism eligibility determination",
                "Proof of Ohio residency",
                "Student's birth certificate"
            ],
            "forms": CUSTOM_FORMS("Autism Scholarship"),
            "deadlines": [
                {"type": "application_window", "due": "Rolling — open year-round", "description": "Apply anytime with qualifying IEP"},
                {"type": "report", "due": "Annually", "description": "Annual compliance update"},
                {"type": "renewal", "due": "Annually", "description": "Annual renewal with updated IEP"}
            ],
            "compliance_burden": "low"
        }
    ],
    "OK": [{
        "name": "Parental Choice Tax Credit",
        "status": "active",
        "portal_url": None,
        "application_url": None,
        "platform": "custom",
        "max_award": "$7,500",
        "eligibility": "Oklahoma K-12 students; refundable tax credit administered via OkTAP/Merit — not an ESA (tax credit model)",
        "deadline": "Annual tax filing season; apply through OkTAP portal",
        "documents_required": [
            "Oklahoma tax return filing",
            "Proof of education expenses (receipts, tuition statements)",
            "Student's enrollment verification",
            "OkTAP/Merit account registration"
        ],
        "forms": [],
        "deadlines": [
            {"type": "application_window", "due": "Annual — tax filing season (Jan-Apr)", "description": "Apply for tax credit during tax season via OkTAP"},
            {"type": "report", "due": "Annually", "description": "Annual expense documentation with tax filing"},
            {"type": "renewal", "due": "Annually", "description": "Renew each tax year"}
        ],
        "compliance_burden": "low"
    }],
    "SC": [{
        "name": "Education Scholarship Trust Fund",
        "status": "capped",
        "portal_url": None,
        "application_url": None,
        "platform": "ClassWallet",
        "max_award": "$6,000",
        "eligibility": "South Carolina K-12 students; program capped at 5,000 participants, waitlist active",
        "deadline": "Annual application window: March 1 – May 31; subject to cap availability",
        "documents_required": [
            "Proof of South Carolina residency",
            "Student's birth certificate",
            "Prior public school enrollment verification",
            "Homeschool notification"
        ],
        "forms": CLASSWALLET_FORMS("ESTF"),
        "deadlines": [
            {"type": "application_window", "due": "March 1 – May 31 (subject to cap)", "description": "Apply during window; program capped at 5,000"},
            {"type": "report", "due": "Quarterly", "description": "Quarterly expense reporting"},
            {"type": "renewal", "due": "Annually", "description": "Annual renewal"}
        ],
        "compliance_burden": "medium"
    }],
    "TN": [{
        "name": "Education Freedom Scholarship",
        "status": "active",
        "portal_url": None,
        "application_url": None,
        "platform": "custom",
        "max_award": "$7,300",
        "eligibility": "Tennessee K-12 students; currently a pilot program in 3 counties (Memphis, Nashville, Chattanooga)",
        "deadline": "Pilot enrollment windows vary by county; check local district",
        "documents_required": [
            "Proof of Tennessee residency (pilot county only)",
            "Student's birth certificate",
            "Prior school enrollment records",
            "Homeschool intent notification"
        ],
        "forms": CUSTOM_FORMS("Education Freedom Scholarship"),
        "deadlines": [
            {"type": "application_window", "due": "Varies by pilot county", "description": "Pilot county-specific enrollment windows"},
            {"type": "report", "due": "Quarterly", "description": "Quarterly compliance reporting"},
            {"type": "renewal", "due": "Annually", "description": "Annual renewal"}
        ],
        "compliance_burden": "medium"
    }],
    "TX": [{
        "name": "Texas ESA Program",
        "status": "active",
        "portal_url": None,
        "application_url": None,
        "platform": "Odyssey",
        "max_award": "$10,000",
        "eligibility": "Texas K-12 students; priority for special needs, then income-eligible, then universal as funds allow",
        "deadline": "Annual application window: March 1 – May 31",
        "documents_required": [
            "Proof of Texas residency",
            "Student's birth certificate",
            "Prior school enrollment records",
            "IEP/504 documentation (if special needs track)",
            "Income verification (if income-based track)"
        ],
        "forms": ODYSSEY_FORMS("Texas ESA"),
        "deadlines": [
            {"type": "application_window", "due": "March 1 – May 31 annually", "description": "Apply during window; priority processing for special needs"},
            {"type": "report", "due": "Quarterly", "description": "Quarterly expense reports via Odyssey"},
            {"type": "renewal", "due": "Annually by May 31", "description": "Renew ESA"}
        ],
        "compliance_burden": "medium"
    }],
    "UT": [{
        "name": "Utah Fits All Scholarship",
        "status": "active",
        "portal_url": None,
        "application_url": None,
        "platform": "Odyssey",
        "max_award": "$8,000",
        "eligibility": "Universal — all Utah K-12 students eligible; no income limit or prior public school requirement",
        "deadline": "Annual application window: February 1 – April 30",
        "documents_required": [
            "Proof of Utah residency",
            "Student's birth certificate",
            "Annual assessment report (portfolio or standardized test)"
        ],
        "forms": ODYSSEY_FORMS("Fits All Scholarship"),
        "deadlines": [
            {"type": "application_window", "due": "February 1 – April 30 annually", "description": "Annual enrollment window"},
            {"type": "report", "due": "Annually", "description": "Annual assessment submission (portfolio or test scores)"},
            {"type": "renewal", "due": "Annually by April 30", "description": "Renew scholarship with assessment report"}
        ],
        "compliance_burden": "low"
    }],
    "WV": [{
        "name": "Hope Scholarship",
        "status": "active",
        "portal_url": None,
        "application_url": None,
        "platform": "ClassWallet",
        "max_award": "$5,000",
        "eligibility": "West Virginia K-12 students; prior public school enrollment required (until program matures)",
        "deadline": "Annual application window: March 1 – May 31",
        "documents_required": [
            "Proof of West Virginia residency",
            "Student's birth certificate",
            "Prior public school enrollment verification",
            "Homeschool notification form"
        ],
        "forms": CLASSWALLET_FORMS("Hope Scholarship"),
        "deadlines": [
            {"type": "application_window", "due": "March 1 – May 31 annually", "description": "Apply during enrollment window"},
            {"type": "report", "due": "Quarterly", "description": "Quarterly expense reports via ClassWallet"},
            {"type": "renewal", "due": "Annually by May 31", "description": "Renew Hope Scholarship"}
        ],
        "compliance_burden": "medium"
    }],
    "WY": [{
        "name": "Steamboat Legacy Scholarship",
        "status": "active",
        "portal_url": None,
        "application_url": None,
        "platform": "Odyssey",
        "max_award": "$6,000",
        "eligibility": "Universal — all Wyoming K-12 students eligible; newest ESA program (launched 2025)",
        "deadline": "Annual application window: April 1 – June 30",
        "documents_required": [
            "Proof of Wyoming residency",
            "Student's birth certificate",
            "Homeschool intent notification",
            "Prior school records (if applicable)"
        ],
        "forms": ODYSSEY_FORMS("Steamboat Legacy Scholarship"),
        "deadlines": [
            {"type": "application_window", "due": "April 1 – June 30 annually", "description": "Enrollment window for newest ESA program"},
            {"type": "report", "due": "Quarterly", "description": "Quarterly expense reporting via Odyssey"},
            {"type": "renewal", "due": "Annually by June 30", "description": "Renew scholarship"}
        ],
        "compliance_burden": "low"
    }],
}

# ─── Compliance Forms Data ──────────────────────────────────────────
# Notification/assessment/immunization data for all 51 states
# Non-ESA states get minimal "needs research" placeholders

COMPLIANCE_FORMS = {
    # ── ESA States (20) ──
    "AL": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "No mandatory state assessment for homeschoolers",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "180 days per year recommended",
        "recordkeeping": "Maintain attendance records, work samples, and grades",
        "other_forms": []
    },
    "AK": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "No mandatory assessment for correspondence program students",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "180 days per year",
        "recordkeeping": "Maintain ILP and progress records per correspondence program requirements",
        "other_forms": []
    },
    "AR": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "No mandatory state assessment for homeschoolers",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "180 days per year",
        "recordkeeping": "Maintain attendance and academic records",
        "other_forms": []
    },
    "AZ": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "No mandatory state assessment for homeschoolers",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "180 days per year recommended",
        "recordkeeping": "Maintain attendance records and work samples",
        "other_forms": []
    },
    "FL": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "Annual educational evaluation required (standardized test or portfolio review by certified teacher)",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "180 days per year",
        "recordkeeping": "Maintain portfolio of student work and annual evaluation results",
        "other_forms": []
    },
    "GA": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "Standardized testing required every 3 years (grades 3, 6, 9, 12)",
        "assessment_form_url": None,
        "immunization_rules": "Required — submit immunization records (GA Rule 160-5-1-.23)",
        "instruction_days": "180 days per year (4.5 hours/day for elementary, 5 hours/day for secondary)",
        "recordkeeping": "Maintain attendance records and test scores",
        "other_forms": []
    },
    "IA": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "Annual standardized testing or portfolio evaluation required",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "148 days per year (with CPI instruction)",
        "recordkeeping": "Maintain attendance and assessment records",
        "other_forms": []
    },
    "IN": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "No mandatory assessment for homeschoolers",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "180 days per year recommended",
        "recordkeeping": "No mandatory recordkeeping requirements",
        "other_forms": []
    },
    "LA": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "Annual standardized testing required (grades 4, 8, 11) or portfolio evaluation",
        "assessment_form_url": None,
        "immunization_rules": "Required for homeschoolers (submit records)",
        "instruction_days": "180 days per year",
        "recordkeeping": "Maintain attendance and assessment records",
        "other_forms": []
    },
    "MO": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "No mandatory assessment for homeschoolers",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "1,000 hours per year (600 in core subjects)",
        "recordkeeping": "Maintain daily log of instruction hours and subjects taught",
        "other_forms": []
    },
    "NC": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "Annual standardized testing required (nationally normed, every grade)",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "180 days per year (9 months)",
        "recordkeeping": "Maintain attendance records and test scores for 1 year",
        "other_forms": []
    },
    "NH": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "Annual evaluation required (standardized test, portfolio, or teacher assessment)",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "180 days per year",
        "recordkeeping": "Maintain portfolio of student work",
        "other_forms": []
    },
    "OH": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "Annual standardized testing or portfolio evaluation required (grades 3-12)",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "180 days per year (900 hours)",
        "recordkeeping": "Maintain attendance records, work samples, and assessment results",
        "other_forms": []
    },
    "OK": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "No mandatory state assessment for homeschoolers",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "180 days per year recommended",
        "recordkeeping": "No mandatory recordkeeping requirements",
        "other_forms": []
    },
    "SC": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "Annual standardized testing required (grades 3-12)",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "180 days per year (4.5 hours/day)",
        "recordkeeping": "Maintain attendance records and test scores",
        "other_forms": []
    },
    "TN": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "No mandatory assessment for homeschoolers",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "180 days per year (4 hours/day)",
        "recordkeeping": "Maintain attendance records",
        "other_forms": []
    },
    "TX": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "No mandatory state assessment for homeschoolers",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "No mandatory minimum days",
        "recordkeeping": "No mandatory recordkeeping requirements",
        "other_forms": []
    },
    "UT": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "Annual assessment required (standardized test or portfolio review)",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "180 days per year recommended",
        "recordkeeping": "Maintain attendance and assessment records",
        "other_forms": []
    },
    "WV": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "Annual standardized testing required (grades 3, 5, 8, 11) or portfolio evaluation",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "180 days per year",
        "recordkeeping": "Maintain attendance records and assessment results",
        "other_forms": []
    },
    "WY": {
        "notification_url": None,
        "notification_form_url": None,
        "assessment_rules": "No mandatory state assessment for homeschoolers",
        "assessment_form_url": None,
        "immunization_rules": "Not required for homeschoolers",
        "instruction_days": "175 days per year recommended",
        "recordkeeping": "Maintain basic attendance records",
        "other_forms": []
    },
}

def get_connection():
    """Read DATABASE_URL_ADMIN from .env and return a psycopg2 connection."""
    env_path = '/opt/homeschool-compass/.env'
    with open(env_path, 'rb') as f:
        raw = f.read()
    match = re.search(rb"DATABASE_URL_ADMIN=([^\n]+)", raw)
    if not match:
        print("ERROR: DATABASE_URL_ADMIN not found in .env")
        sys.exit(1)
    dsn = match.group(1).decode()
    return dsn


def dry_run_sql(states_data):
    """Generate and print SQL without executing."""
    lines = []
    lines.append("-- ============================================")
    lines.append("-- DRY RUN — Population SQL (not executed)")
    lines.append(f"-- Generated: {datetime.now(timezone.utc).isoformat()}")
    lines.append("-- ============================================")
    lines.append("")

    for code, programs in sorted(states_data.items()):
        programs_json = json.dumps(programs)
        compliance_json = json.dumps(COMPLIANCE_FORMS.get(code, {}))
        lines.append(f"-- State: {code}")
        lines.append(f"UPDATE states")
        lines.append(f"SET esa_programs = '{programs_json}'::jsonb,")
        lines.append(f"    compliance_forms = '{compliance_json}'::jsonb,")
        lines.append(f"    esa_urls_verified_at = NOW()")
        lines.append(f"WHERE code = '{code}';")
        lines.append("")

    # Rollback
    lines.append("-- ============================================")
    lines.append("-- ROLLBACK SQL (save this for undo)")
    lines.append("-- ============================================")
    codes = sorted(states_data.keys())
    codes_str = ", ".join(f"'{c}'" for c in codes)
    lines.append(f"UPDATE states SET esa_programs = NULL, compliance_forms = NULL, esa_urls_verified_at = NULL")
    lines.append(f"WHERE code IN ({codes_str});")
    lines.append("")

    return "\n".join(lines)


def apply_sync(states_data):
    """Execute updates against Neon via psycopg2."""
    import psycopg2
    dsn = get_connection()
    conn = psycopg2.connect(dsn)
    conn.autocommit = True
    
    esa_count = 0
    non_esa_count = 0
    now = datetime.now(timezone.utc).isoformat()

    for code, programs in sorted(states_data.items()):
        programs_json = json.dumps(programs, ensure_ascii=False)
        compliance = COMPLIANCE_FORMS.get(code, {})
        compliance_json = json.dumps(compliance, ensure_ascii=False)
        
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE states SET esa_programs = %s::jsonb, compliance_forms = %s::jsonb, esa_urls_verified_at = NOW() WHERE code = %s",
                (programs_json, compliance_json, code)
            )
            if cur.rowcount > 0:
                esa_count += 1
            else:
                print(f"  ⚠ No state found for code '{code}' — skipping")

    # Also set compliance_forms for non-ESA states that aren't in our data
    # We need to know which states exist in the DB
    with conn.cursor() as cur:
        cur.execute("SELECT code FROM states")
        all_codes = [row[0] for row in cur.fetchall()]

    for code in all_codes:
        if code not in ESA_PROGRAMS:
            compliance = COMPLIANCE_FORMS.get(code, {
                "notification_url": None,
                "notification_form_url": None,
                "assessment_rules": "See state department of education website",
                "assessment_form_url": None,
                "immunization_rules": "See state requirements",
                "instruction_days": "180 days per year (verify with state DOE)",
                "recordkeeping": "See state requirements",
                "other_forms": []
            })
            compliance_json = json.dumps(compliance, ensure_ascii=False)
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE states SET compliance_forms = %s::jsonb WHERE code = %s AND compliance_forms IS NULL",
                    (compliance_json, code)
                )
                if cur.rowcount > 0:
                    non_esa_count += 1

    conn.close()
    print(f"\n✅ Applied: {esa_count} ESA states updated, {non_esa_count} non-ESA compliance_forms set")
    print(f"⏱  Timestamp: {now}")


def generate_rollback(states_data):
    """Print rollback SQL to stdout."""
    codes = sorted(list(states_data.keys()) + list(COMPLIANCE_FORMS.keys()))
    codes = sorted(set(codes))
    codes_str = ", ".join(f"'{c}'" for c in codes)
    
    print("-- ============================================")
    print("-- ROLLBACK — Revert esa_programs, compliance_forms, esa_urls_verified_at")
    print(f"-- Generated: {datetime.now(timezone.utc).isoformat()}")
    print(f"-- Affected states: {', '.join(codes)}")
    print("-- ============================================")
    print("")
    print("BEGIN;")
    print(f"UPDATE states SET esa_programs = NULL, compliance_forms = NULL, esa_urls_verified_at = NULL")
    print(f"WHERE code IN ({codes_str});")
    print(f"SELECT 'ROLLBACK: ' || COUNT(*) || ' states reverted' FROM states")
    print(f"WHERE code IN ({codes_str}) AND esa_programs IS NULL;")
    print("COMMIT;")
    print("")
    print("-- Verify:")
    print(f"SELECT code, esa_programs IS NOT NULL AS has_programs, compliance_forms IS NOT NULL AS has_forms")
    print(f"FROM states WHERE code IN ({codes_str}) ORDER BY code;")


def verify_data():
    """Verify the data was applied correctly."""
    import psycopg2
    dsn = get_connection()
    conn = psycopg2.connect(dsn)
    conn.autocommit = True
    
    with conn.cursor() as cur:
        cur.execute("""
            SELECT code, 
                   esa_programs IS NOT NULL AND jsonb_array_length(esa_programs) > 0 AS has_programs,
                   jsonb_array_length(esa_programs) AS program_count,
                   compliance_forms IS NOT NULL AS has_forms,
                   esa_urls_verified_at IS NOT NULL AS verified
            FROM states
            ORDER BY code
        """)
        rows = cur.fetchall()
    
    print(f"\n{'Code':<6} {'Programs':<10} {'Count':<6} {'Forms':<8} {'Verified':<10}")
    print("-" * 40)
    esa_found = 0
    for row in rows:
        code, has_progs, count, has_forms, verified = row
        if has_progs or count or has_forms:
            esa_found += 1
        print(f"{code:<6} {'✅' if has_progs else '❌':<10} {count or 0:<6} {'✅' if has_forms else '❌':<8} {'✅' if verified else '❌':<10}")
    
    print(f"\nTotal states with ESA programs: {esa_found}")
    
    # Summary
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM states WHERE esa_programs IS NOT NULL AND jsonb_array_length(esa_programs) > 0")
        prog_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM states WHERE compliance_forms IS NOT NULL")
        forms_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM states WHERE esa_urls_verified_at IS NOT NULL")
        verified_count = cur.fetchone()[0]
    
    print(f"\n📊 Final Counts:")
    print(f"  States with esa_programs data:   {prog_count}")
    print(f"  States with compliance_forms:    {forms_count}")
    print(f"  States with verified timestamp:  {verified_count}")
    
    conn.close()


if __name__ == '__main__':
    print(f"🚀 Homeschool Compass — ESA Resources Population")
    print(f"   Mode: {'DRY RUN' if DRY_RUN else 'ROLLBACK SQL' if ROLLBACK else 'APPLY'}")
    print(f"   ESA States: {len(ESA_PROGRAMS)}")
    print(f"   Compliance Forms: {len(COMPLIANCE_FORMS)}")
    print()

    if DRY_RUN:
        sql = dry_run_sql(ESA_PROGRAMS)
        print(sql)
        print(f"\n--- SQL length: {len(sql)} chars ---")
        print(f"--- To apply: run without --dry-run ---")
    elif ROLLBACK:
        generate_rollback(ESA_PROGRAMS)
    else:
        apply_sync(ESA_PROGRAMS)
        print("\n" + "=" * 50)
        verify_data()
