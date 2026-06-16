#!/usr/bin/env python3
"""
LLM Classification Stage for Homeschool Bills.
Takes candidate bills from LegiScan search + relaxed title filter,
then uses an LLM to determine actual relevance to homeschooling.

Usage:
    python3 scripts/llm_classify.py < bills_candidates.json
"""

import sys
import json
import os

# Load .env
env_path = "/opt/homeschool-compass/.env"
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


def classify_bill(bill: dict) -> dict:
    """
    Given a bill candidate dict (with title, state, number, bill_id),
    return the same dict with a 'relevance' field:
      'HOMESCHOOL' — directly about homeschooling
      'EDUCATION_ADJACENT' — indirectly affects homeschoolers (ESA, truancy, etc.)
      'NOISE' — unrelated
    Uses simple rule-based classification with broader keyword matching
    as a first pass before LLM integration.
    """
    title = (bill.get("title") or "").lower()
    number = bill.get("number") or bill.get("bill_number") or ""
    state = bill.get("state") or ""
    bill_id = bill.get("bill_id")

    # Strong homeschool signals
    hs_strong = [
        "homeschool", "home school", "home education", "home instruction",
        "home-based instruction", "home study", "homeschooling",
        "home-school", "home-educated", "home education program",
        "parent-managed learning", "homeschool parent",
        "home school student",
    ]
    # Moderate — likely homeschool-related
    hs_moderate = [
        "education savings account", "esa program",
        "compulsory attendance", "compulsory education",
        "truancy", "curriculum approval", "portfolio review",
        "superintendent notification",
        "home school athletics", "homeschool athletics",
        "private school affidavit",
        "school choice", "education scholarship",
        "correspondence study", "correspondence program",
        "alternative instruction",
    ]
    # Weak — possible edge case
    hs_weak = [
        "school choice", "voucher", "parental rights",
        "private school", "scholarship program",
        "learning account", "education freedom",
        "parental choice", "student funding",
        "education tax credit", "tuition tax credit",
    ]

    score = 0
    for kw in hs_strong:
        if kw in title:
            score = max(score, 3)
    for kw in hs_moderate:
        if kw in title:
            score = max(score, 2)
    for kw in hs_weak:
        if kw in title:
            score = max(score, 1)

    if score >= 3:
        relevance = "HOMESCHOOL"
    elif score >= 2:
        relevance = "EDUCATION_ADJACENT"
    else:
        relevance = "NOISE"

    bill["relevance"] = relevance
    bill["relevance_score"] = score
    return bill


def main():
    candidates = json.load(sys.stdin)
    if not isinstance(candidates, list):
        candidates = [candidates]

    results = []
    for bill in candidates:
        result = classify_bill(bill)
        results.append(result)

    print(json.dumps(results, indent=2))
    # Summary
    by_relevance = {}
    for r in results:
        rel = r.get("relevance", "NOISE")
        by_relevance.setdefault(rel, 0)
        by_relevance[rel] += 1
    print(f"\n=== Summary ===", file=sys.stderr)
    for rel, count in sorted(by_relevance.items()):
        print(f"  {rel}: {count}", file=sys.stderr)


if __name__ == "__main__":
    main()
