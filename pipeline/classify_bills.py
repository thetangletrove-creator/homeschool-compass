#!/usr/bin/env python3
"""
Bill Classifier for Homeschool Compass.
Takes candidate bills from LegiScan search + relaxed title pre-filter,
classifies each as HOMESCHOOL, EDUCATION_ADJACENT, or NOISE.

Two-tier approach:
  Tier 1 — Fast rule-based keyword scoring (catches ~90%+)
  Tier 2 — Reasoning-based classification for edge cases (TODO)

Usage:
    from classify_bills import classify_bill, filter_relevant

    # Single bill
    result = classify_bill({"title": "...", "state": "CA", "number": "AB123"})

    # Batch
    relevant = filter_relevant(bills_list)
"""

import re


# Tier 1 keywords — exhaustive patterns for US homeschool legislation
# Organized by strength to ensure correct classification

_HOMESCHOOL_STRONG = [
    # Direct homeschool references
    r"homeschool", r"home.school", r"home.education", r"home.instruction",
    r"home.based.instruction", r"home.study",
    r"homeschooling", r"home.schooled", r"home.educated",
    r"home.education.program",
    r"parent.managed.learning",
    r"homeschool.parent", r"home.school.student",
    r"homeschool.athletics", r"home.school.athletics",
    r"homeschool.driver.training",
    # Homeschool-specific bills
    r"homeschool.act", r"home.school.act",
    r"homeschool.bill.of.rights",
    r"homeschool.proud",
    r"homeschool.day", r"homeschool.awareness",
    r"homeschool.opportunities",
    r"homeschooling.for.military",
    r"home.education.advisory.council",
    r"home.instruction.compliant",
    r"prohibition.against.character.tracking",  # UT anti-surveillance bill
    r"home.school.prohibition",
    # Microschools (homeschool-adjacent learning models)
    r"microschool", r"micro.school", r"micro.education",
]

_EDUCATION_ADJACENT_STRONG = [
    # ESA / school choice / voucher
    r"education.savings.account",
    r"esa.program", r"esa.for",
    r"school.choice",
    r"education.voucher",
    r"education.scholarship",
    r"learning.account",
    r"education.freedom",
    r"parental.choice",
    r"tuition.tax.credit",
    r"education.tax.credit",
    r"parental.choice.tax.credit",
    r"hope.scholarship",
    r"opportunity.scholarship",
    r"scholarship.program",
    # Compulsory attendance / truancy
    r"compulsory.attend",
    r"compulsory.education",
    r"compulsory.instruction",
    r"compulsory.attendance",
    r"compulsory.age",
    r"truancy",
    r"habitual.truan",
    # Regulation / oversight
    r"curriculum.approval",
    r"portfolio.review",
    r"superintendent.notification",
    r"home.school.affidavit",
    r"private.school.affidavit",
    r"alternative.instruction",
    r"correspondence.study",
    r"correspondence.program",
    r"attendance.exception",
    r"attendance.policy",
    # Private school overlap
    r"private.school.attend",
    r"private.school.scholarship",
    r"nonpublic.school",
    # Parental rights (education-specific)
    r"parental.rights.education",
    r"parental.rights.school",
    r"parents.interest.child.upbringing",
    r"parental.involvement.education",
]

_NOISE_PATTERNS = [
    # These are CLEARLY not education-related
    r"^wildfire", r"^fire.hazard", r"^carpet",
    r"^veterans.bond", r"^unmanned.aircraft",
    r"^manufactured.housing",
    r"^smoke.shop",
    r"^floating.home",
]


def _rgx(pattern: str) -> re.Pattern:
    """Build case-insensitive regex. In .pattern the '\.' is the raw .[^]" role="separator"} separator."""
    return re.compile(pattern.replace(".", r"[\-\s]*"), re.IGNORECASE)


def classify_bill(bill: dict) -> dict:
    """
    Classify a bill candidate. Returns the bill dict augmented with:
      'relevance': 'HOMESCHOOL' | 'EDUCATION_ADJACENT' | 'NOISE'
      'relevance_score': 3 | 2 | 1
      'relevance_reason': str — why this classification was chosen

    The 'title' field is the primary input. 'state' and 'number' provide context.
    """
    title = bill.get("title") or ""
    title_lower = title.lower()
    state = bill.get("state") or ""
    number = bill.get("number") or bill.get("bill_number") or ""
    bill_id = bill.get("bill_id")

    # Check noise patterns first (fast rejection)
    for pat in _NOISE_PATTERNS:
        if _rgx(pat).search(title_lower):
            bill["relevance"] = "NOISE"
            bill["relevance_score"] = 0
            bill["relevance_reason"] = f"Matched noise pattern: {pat}"
            return bill

    # Check strong homeschool signals
    for pat in _HOMESCHOOL_STRONG:
        if _rgx(pat).search(title_lower):
            bill["relevance"] = "HOMESCHOOL"
            bill["relevance_score"] = 3
            bill["relevance_reason"] = f"Matched homeschool pattern: {pat}"
            return bill

    # Check education-adjacent signals
    for pat in _EDUCATION_ADJACENT_STRONG:
        if _rgx(pat).search(title_lower):
            bill["relevance"] = "EDUCATION_ADJACENT"
            bill["relevance_score"] = 2
            bill["relevance_reason"] = f"Matched education-adjacent pattern: {pat}"
            return bill

    # Default: noise
    bill["relevance"] = "NOISE"
    bill["relevance_score"] = 0
    bill["relevance_reason"] = "No relevant patterns matched in title"
    return bill


def filter_relevant(bills: list, min_score: int = 2) -> dict:
    """
    Filter a list of bill dicts, keeping only those with relevance_score >= min_score.
    Also returns classification stats.
    """
    results = [classify_bill(b) for b in bills]
    by_rel = {}
    for r in results:
        rel = r.get("relevance", "NOISE")
        by_rel.setdefault(rel, 0)
        by_rel[rel] += 1

    filtered = [r for r in results if r.get("relevance_score", 0) >= min_score]

    return {
        "bills": filtered,
        "stats": by_rel,
        "total_input": len(bills),
        "total_output": len(filtered),
    }
