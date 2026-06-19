# OpenClaw Skill: Homeschool Regulation Monitor

## Overview

This skill enables an OpenClaw agent to monitor, analyze, and alert on U.S. state homeschool regulation changes using the LegiScan API, OpenStates API, and Vertex AI Gemini.

## Prerequisites

- `LEGISCAN_API_KEY` — LegiScan Public API key (30K queries/month)
- `OPENSTATES_API_KEY` — OpenStates API key
- `GOOGLE_CLOUD_PROJECT` — GCP project with Vertex AI enabled
- `GOOGLE_CLOUD_LOCATION` — e.g., `us-central1`
- Python dependencies: `requests`, `google-cloud-aiplatform`, `vertexai`

## File Structure

```
skills/homeschool-monitor/
├── SKILL.md              # This file
├── legiscan_client.py    # LegiScan API client
├── openstates_client.py  # OpenStates API v3 client
├── gemini_processor.py   # Vertex AI Gemini analysis
├── sync_pipeline.py      # Full orchestration pipeline
├── schema.sql            # SQLite schema (v2.0)
└── prompts/
    ├── bill_analysis.txt
    ├── delta_extraction.txt
    ├── esa_compliance.txt
    └── impact_forecast.txt
```

## Agent Capabilities

### 1. Discovery
```
!discover --states CA,TX,FL --source legiscan
!discover --states all --source openstates
!discover --source both --priority-only
```

### 2. Analysis
```
!analyze --bill-id 12345 --type initial
!analyze --bill-id 12345 --type delta --previous-hash abc123
!analyze --bill-id 12345 --type esa
!analyze --batch --pending-only
```

### 3. Alerts
```
!alert --create-rule "CA ESA changes" --states CA --esa-only --webhook https://...
!alert --list-pending
!alert --send-batch --severity critical
```

### 4. Reporting
```
!report --scorecard --output scorecard_2026.png
!report --state CA --format markdown
!report --esa-programs --active-only
```

## Core Prompts

### Prompt: Bill Initial Assessment

```
You are analyzing a state bill for homeschool regulation impact.

CONTEXT:
- HSLDA 4-tier model: no_notice, low_regulation, moderate_regulation, high_regulation
- ESA = Education Savings Account (state-funded education choice program)
- "PSA" = Private School Affidavit (California-specific homeschool pathway)

TASK:
Read the bill text below and determine:
1. Is this bill relevant to homeschool families? (bool)
2. What is the relevance score? (0.0-1.0)
3. Does it increase, decrease, or leave unchanged homeschool regulation burden?
4. Is it ESA-related?
5. What specific compliance requirements does it create or modify?
6. What assumptions are you making? What gaps exist in the text?
7. Are there simpler alternative approaches the legislature could have taken?

OUTPUT: Strict JSON per schema in gemini_processor.py
```

### Prompt: Delta Extraction

```
You are comparing two versions of a homeschool-related bill.

PREVIOUS VERSION:
{{previous_text}}

CURRENT VERSION:
{{current_text}}

TASK:
Extract the exact delta. Focus on:
- Numerical changes (hours, ages, dollar amounts, deadlines)
- Added/deleted sections
- Regulatory burden direction (increase/decrease)
- Retroactive application or grandfather clauses

OUTPUT: Strict JSON per delta schema
```

### Prompt: ESA Compliance Check

```
You are extracting ESA compliance requirements for homeschool families.

BILL TEXT:
{{bill_text}}

TASK:
Identify:
1. What documentation must families submit?
2. What portfolio requirements exist?
3. What testing is mandated?
4. What expenses are allowed/restricted?
5. What are the deadlines?
6. What compliance risks exist?

OUTPUT: Strict JSON per ESA schema
```

## Database Schema Quick Reference

| Table | Purpose |
|-------|---------|
| `states` | State metadata, HSLDA category, ESA program status |
| `agencies` | Filing offices (DOE, county superintendent, etc.) |
| `legal_precedent` | Case law affecting homeschool statutes |
| `bills` | Tracked bills with LLM analysis fields |
| `bill_actions` | Chronological action history |
| `bill_texts` | Full text versions with hashes |
| `llm_analysis` | Raw Gemini outputs |
| `delta_summaries` | Structured change summaries |
| `alert_rules` | User subscription rules |
| `alerts` | Generated notifications |
| `scorecard_metrics` | Per-state freedom scores |
| `esa_programs` | ESA program details by state |

## Rate Limiting Strategy

| Source | Limit | Strategy |
|--------|-------|----------|
| LegiScan Public | 100/min, 30K/mo | Cache aggressively; use searchRaw (2000 results/page) |
| OpenStates v3 | ~30/min | 2s delay between calls; batch where possible |
| Vertex AI Gemini | Project quota | Batch bills; use 0.1 temperature for deterministic JSON |

## Change Detection Workflow

```
1. getMasterListRaw(session_id) → change_hash per bill
2. Compare against cached hash in bill_hashes table
3. If changed → fetch full bill + text
4. If text hash changed → run Gemini delta analysis
5. If regulation_impact != 'neutral' → generate alert
6. Update change_hash cache
```

## Alert Severity Rules

| Condition | Severity |
|-----------|----------|
| Bill signed/enacted + regulation increase | CRITICAL |
| Bill signed/enacted + regulation decrease | WARNING |
| Status change to passed_chamber | WARNING |
| New bill with high relevance (>0.7) | INFO |
| ESA program modification | WARNING |

## Scorecard Methodology

The "Homeschool Freedom Scorecard" grades states on:

1. **Reporting Burden** (weight: 0.30)
   - Notification required? (0-25 pts)
   - Annual filing? (0-25 pts)
   - Portfolio review? (0-25 pts)
   - Curriculum approval? (0-25 pts)

2. **Testing Mandate** (weight: 0.25)
   - No testing (100 pts)
   - Optional testing (75 pts)
   - Periodic testing (50 pts)
   - Annual standardized testing (25 pts)
   - State-administered testing (0 pts)

3. **Curriculum Freedom** (weight: 0.25)
   - No curriculum requirements (100 pts)
   - Subject list only (75 pts)
   - Hour requirements (50 pts)
   - Approved curriculum list (25 pts)
   - State-mandated curriculum (0 pts)

4. **Teacher Qualification** (weight: 0.20)
   - No requirements (100 pts)
   - High school diploma (75 pts)
   - College credits (50 pts)
   - Teaching certificate (25 pts)
   - State-certified teacher (0 pts)

Grade thresholds: A+ (97-100), A (93-96), A- (90-92), B+ (87-89), B (83-86), B- (80-82), C+ (77-79), C (73-76), C- (70-72), D+ (67-69), D (63-66), D- (60-62), F (<60)

## Monetization Paths

1. **B2B API**: Sell database access to curriculum providers (Time4Learning, Miacademy) for "NY Compliant" / "TX Ready" tagging
2. **Umbrella School Dashboard**: White-label compliance alerts for PSPs managing thousands of families
3. **ESA Compliance Tracker**: $99/yr tier ensuring portfolios meet statutory definitions to unlock $8K+ in state funds
4. **Scorecard Viral Asset**: Free 50-state graphic for Facebook/Reddit groups → top-of-funnel to paid tiers

## LLM-to-LLM Communication Protocol

When this skill passes context to another agent (e.g., a review agent or a report generator), use this structured format:

```json
{
  "context": {
    "source": "homeschool-monitor",
    "timestamp": "2026-06-16T04:37:00Z",
    "data_version": "2.0"
  },
  "bills": [
    {
      "bill_id": 12345,
      "state": "CA",
      "number": "SB 1234",
      "relevance_score": 0.92,
      "regulation_impact": "increase",
      "delta_summary": "Adds annual portfolio review requirement",
      "confidence": 0.88,
      "action_required": "Flag for CA subscribers"
    }
  ],
  "assumptions": ["Assumes 'home instruction' = homeschool"],
  "gaps": ["No definition of 'portfolio' in bill text"],
  "risks": ["Likely constitutional challenge under Yoder precedent"],
  "alternatives": ["Could have used opt-in voluntary reporting instead"]
}
```

## Error Handling

| Error | Recovery |
|-------|----------|
| LegiScan rate limit (429) | Sleep 60s, retry with exponential backoff |
| OpenStates timeout | Retry ×3, then skip state |
| Gemini JSON parse fail | Retry with lower temperature; fallback to regex extraction |
| Bill text unavailable | Queue for next sync cycle; mark `text_mime` as null |
| Duplicate bill insert | Update existing record; log conflict |

## Maintenance

- **Daily**: `sync_pipeline.py --full-sync` (priority states)
- **Weekly**: Full 50-state scan
- **Monthly**: Regenerate scorecard; review alert rule performance
- **Quarterly**: Update HSLDA categories; refresh legal_precedent table
