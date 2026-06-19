# Prompt B: State ESA Portal & Compliance Forms Research

## Objective
Build a comprehensive directory of every state's ESA portal and homeschool compliance form requirements. This feeds two empty database tables: `esa_programs` and `compliance_forms`.

## Methodology

For each state, follow this priority search order:

1. Google: `"[state] department of education" + "homeschool" OR "home school"`
2. Google: `"[state] ESA" OR "education savings account" + "homeschool"`
3. Google: `"[state] homeschool law" OR "homeschool requirements"`
4. Google: `"[state] homeschool" + "form" OR "notice of intent" OR "letter of intent"`
5. Google: `"[state] homeschool" + "attendance" OR "log" OR "record"`
6. Google: `"[state] homeschool" + "assessment" OR "evaluation" OR "testing requirements"`
7. Cross-reference with hslda.org/[state] and a2zhomeschooling.com/[state]

## Part A: ESA States (20 states — highest priority)

For every ESA state listed below, produce ONE JSON object with these fields:

```json
{
  "state": "Two-letter code",
  "name": "Full state name",
  "has_esa": true,
  "esa_portal_url": "https://...",
  "esa_portal_name": "e.g. AZ ESA Gateway, FL Empowerment Scholarship",
  "esa_admin": "Who runs it — state DOE, treasurer, treasury, scholarship org",
  "esa_funding_amount": "$7000 (or range)",
  "esa_eligible_grades": "K-12 (or K-8, etc)",
  "esa_uses_classwallet": true/false,
  "esa_uses_odyssey": true/false,
  "esa_uses_other_platform": "name or null",
  "esa_application_url": "URL to apply",
  "esa_application_deadline": "Rolling / April 15 / etc",
  "esa_reimbursement_url": "URL for submitting receipts/claims",
  "esa_max_reimbursement": "$ limit or null",
  "esa_eligible_expenses_url": "URL listing what counts",
  "esa_notes": "Any quirks, waitlists, funding caps, or gotchas"
}
```

### ESA States

| State | ESA Program Name |
|-------|-----------------|
| AZ | Empowerment Scholarship Account |
| AR | Education Freedom Accounts |
| FL | Family Empowerment Scholarship / HB1 |
| GA | Promise Scholarship Account / SB 233 |
| IN | Education Scholarship Account |
| IA | Education Savings Account |
| KY | Education Opportunity Account (pilot) |
| LA | LA GATOR Scholarship / Act 2 |
| MS | Education Scholarship Account |
| MO | MOScholars / HB 349 (pilot) |
| MT | Education Savings Account |
| NE | Learning Acceleration/EFA (LB 295) |
| NH | Education Freedom Accounts |
| NC | Opportunity Scholarship (expanded to all) |
| ND | Education Savings Account (SB 2143) |
| OH | EdChoice Expansion / Voucher |
| OK | Parental Choice Tax Credit / HB 1935 |
| SC | Education Scholarship Trust Fund |
| TN | Education Savings Account (3 counties expanding) |
| TX | Education Savings Account (HB 3 — if passed) |
| UT | Utah Fits All Scholarship |
| WV | Hope Scholarship / SB 506 |
| WI | Choice & Special Needs Scholarship |
| WY | Education Savings Account |

(Verify which are truly active vs. pending litigation — note this per state)

## Part B: Non-ESA States (31 states — secondary priority)

For each remaining state, produce ONE JSON object with:

```json
{
  "state": "Two-letter code",
  "name": "Full state name",
  "has_esa": false,
  "compliance_forms": [
    {
      "form_name": "Notice of Intent",
      "form_type": "annual | one-time | per-child",
      "form_url": "direct PDF link or DOI link",
      "grade_levels_required": "K-12, or K-8, etc",
      "due_date": "July 1 annually, or rolling, or null",
      "access_level": "public | requires login | mailed only",
      "filing_method": "online | PDF + mail | in-person",
      "notes": "Any special filing rules"
    }
  ],
  "notification_required": true/false,
  "attendance_records_required": true/false,
  "testing_required": {
    "required": true/false,
    "grades": "3,5,8,10 or null",
    "accepted_tests": ["Stanford 10", "Iowa", "MAP", "state assessment"],
    "scoring_threshold": "15th percentile or higher"
  },
  "curriculum_notification": false,
  "teacher_qualification_required": "none / parent degree / certified teacher review",
  "days_of_instruction": 180,
  "subjects_required": ["reading", "math", "...",
  "portfolio_review": true/false,
  "portfolio_review_url": "URL or null",
  "state_doe_homeschool_page": "URL",
  "state_legal_reference": "statute number or URL",
  "notes": "Any unique requirements, deadlines, or gotchas"
}
```

## Part C: Source Collection

For **every** piece of information in Parts A and B, include the **source URL**. If a PDF is the best source, include the direct PDF link AND note whether it's actually downloadable or requires a click-through form. Flag any dead links you find.

## Part D: Problem State Watchlist

Create a section with notes on states known for:
- Litigation blocking or delaying ESA rollout (e.g., WV, KY)
- Portal that frequently goes down during application windows (note parent complaints)
- Forms that change annually without notice
- Counties that opt out or have different rules than the state (e.g., NY)
- Non-compliant third-party vendor portals that don't match state PDFs

## Part E: Cross-Reference Notes

Search for parent discussions on Reddit (r/homeschool, r/homeschooling), Facebook groups, and homeschooling forums about each state's compliance process. Note:
- Most confusing form per state
- Most common submission mistake
- Most common rejection reason
- Average time to process (if reported)
- "Hidden" requirements not listed on the state DOE website

## Deliverable

Three files:
1. **`esa-portal-directory.json`** — complete JSON from Part A (20+ states)
2. **`compliance-forms-directory.json`** — complete JSON from Part B (51 states)
3. **`research-notes.md`** — dead links, conflicts between sources, parent-reported gotchas, litigation status, and any surprising findings

## Regarding PDFs and Documents

For the JSON deliverables, I primarily need **the URLs and metadata** — the direct links, form names, deadlines, and filing methods. I do NOT need the full text of every PDF downloaded and attached. However:

- If a PDF is **small** (<10 pages) and contains information critical to filling the JSON schema that isn't available elsewhere, embed the relevant sections as text notes
- If a PDF is **new, obscure, or contradicts other sources**, include the direct link prominently and note the conflict
- **NEVER** attach PDF files themselves to the response — links only, unless the PDF is essential context that can't be captured in the JSON fields

This is a **directory-building** task, not a document extraction task. Links + metadata are the deliverable.
