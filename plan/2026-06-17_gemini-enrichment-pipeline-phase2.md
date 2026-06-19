# Phase 2: Gemini Enrichment Pipeline

**Date:** 2026-06-17
**Author:** GCU *No Trouble At All*
**Status:** ✅ DELIVERED — 2026-06-17. Pushed to `main` at `ee3c080`. All 5 sprints complete. Backfill running.

## The Problem

All 3,845 bills in the DB are hardcoded `impact = "neutral"`, `esa_related = FALSE`, `action_required = NULL`. The watchlist, alerts, and dashboard are beautifully built for differentiated bills — but every bill renders identically. The product has zero utility for free OR paid users until this is fixed.

> *"Beautiful map with no pins. Beautiful filters that return everything."*

## Architecture

```
                    ┌──────────────────────┐
                    │   LegiScan API        │
                    └──────────┬───────────┘
                               │
    ┌──────────────────────────▼──────────────┐
    │   Tier 0: Sync Pipeline (unchanged)      │
    │   legiscan_client.py → sync-to-neon.py   │
    │   (now preserves analysis fields)         │
    └─────────────────────┬───────────────────┘
                          │
    ┌─────────────────────▼───────────────────┐
    │   Tier 1: Impact Classification          │
    │   GeminiBillClassifier (Vertex AI)       │
    │   INCREASE / DECREASE / NEUTRAL          │
    │   + confidence, ESA detection            │
    └─────────────────────┬───────────────────┘
                          │
    ┌─────────────────────▼───────────────────┐
    │   Tier 2: Deep Analysis                  │
    │   delta, analysis_points,                │
    │   action_required, key_provisions        │
    └─────────────────────┬───────────────────┘
                          │
    ┌─────────────────────▼───────────────────┐
    │   Tier 3: State Enrichment               │
    │   ESA data, subscores,                   │
    │   homeschool_population for 50 states    │
    └─────────────────────┬───────────────────┘
                          │
    ┌─────────────────────▼──────────────────┐
    │   Neon PostgreSQL                       │
    │   bills (enriched) + states (enriched)   │
    └─────────────────────┬──────────────────┘
                          │ Drizzle ORM
    ┌─────────────────────▼──────────────────┐
    │   Frontend (Vercel)                     │
    │   ImpactBadge, BillCard,                │
    │   Detail Page, Impact Filter            │
    └────────────────────────────────────────┘
```

## Tiers

### Tier 1: Impact Classification (MVP — ~$0.60 backfill)

**Files:**
- `services/gemini_classifier.py` — GeminiBillClassifier class
- `pipeline/classify_bills.py` — Updated to run classification, not just relevance filtering
- `migrations/002_add_analysis_fields.sql` — New columns on `bills` table
- `pipeline/sync-to-neon.py` — Modified to NOT overwrite analysis fields

**What it does:**
- Classifies each bill as INCREASE (more burden), DECREASE (less burden), or NEUTRAL
- Detects ESA-related bills
- Stores confidence scores (0.0–1.0)
- Impact direction + ESA toggle become useful instantly

**Cost:**
- Gemini 2.5 Flash: ~$0.15/1K bills = ~$0.60 for 3,845 bills
- Vertex AI API calls: free tier covers it
- Ongoing: ~50 new bills/day × $0.00004 = $0.002/day

### Tier 2: Deep Analysis (Gold — unlocks subscription value)

**What it does (same Gemini call, extended prompt):**
- `impact_summary` — One sentence: "What this bill changes"
- `delta` — "Before → After" format showing specific changes
- `action_required` — "File letter by X date" or null
- `analysis_points` — 3-5 bullet points of implications
- `key_provisions` — Specific legal mechanisms
- `effective_date` — When the bill takes effect
- `target_audience` — "Parents", "Virtual schools", "All HS families"

**Why this matters for the product:**
- $29/yr (Tracker): Users see what bills matter to them
- $99/yr (ESA): Users see deadlines and actions needed
- Free tier: See impact direction, paywall on deep analysis

### Tier 3: State Enrichment (ESA Compliance tier)

**What it does:**
- Populates `states` table `esa_name`, `esa_max_award`, `esa_eligibility`, `esa_deadline`, `esa_status`
- Fills `subscores` JSONB with state-by-state freedom scoring
- Sets `homeschool_population` estimates
- Unlocks the $99/yr ESA Compliance product tier

### Frontend Updates

**Components to add/modify:**
- `components/ImpactBadge.tsx` — Color-coded (red ↑ / green ↓ / gray −) with confidence tooltip
- `components/BillCard.tsx` — Updated to show real impact badges, ESA tag, action_required warnings
- `app/bill/[id]/page.tsx` — Full bill detail with analysis sections
- Impact filter on dashboard / bills list now actually filters

**Database schema changes:**
- 13 new columns on `bills` table (impact, impact_confidence, esa_related, esa_related_confidence, impact_summary, delta, action_required, analysis_points JSONB, key_provisions JSONB, effective_date, target_audience, analyzed_at, analysis_version)
- 3 new indexes (impact, esa_related, analyzed_at)
- `states` table populated with real ESA data

## Implementation Order

### Sprint 1: Infrastructure + Migration

1. Create `migrations/002_add_analysis_fields.sql` — 13 new columns + 3 indexes + states enrichment
2. Run migration against Neon
3. Keep old `impact` column during transition for rollback safety

### Sprint 2: Gemini Classifier Service

1. Write `services/gemini_classifier.py`:
   - `GeminiBillClassifier` class with Vertex AI integration
   - Structured JSON output via `response_mime_type="application/json"`
   - Retry logic, fallback to neutral on failure
   - Batch processing with rate limiting (0.15s between calls)
   - Few-shot prompt with examples for accuracy

2. Fix Vertex proxy reliability issue:
   - Prefer `google.genai` SDK directly (not localhost proxy)
   - Project: `vertex-credits-446820` or whatever `GOOGLE_CLOUD_PROJECT` is
   - Location: `us-central1`
   - Retry with `google.api_core.retry`

### Sprint 3: Pipeline Integration

1. Refactor `classify_bills.py`:
   - Add `BillPipeline` class with `get_unanalyzed_bills()`, `update_bill_analysis()`, `process_batch()`
   - Backfill mode: process all unanalyzed bills
   - Batch mode: process N bills
   - Stats mode: show classification distribution

2. Modify `sync-to-neon.py`:
   - Remove hardcoded `impact = "neutral"` (line 195)
   - UPSERT should NOT overwrite analysis fields
   - New bills get NULL analysis → picked up by next classification run

### Sprint 4: Backfill

1. Run `python -m pipeline.classify_bills backfill` (3,845 bills)
   - Expected: ~2 hours at 50 bills/batch
   - Monitor: `python -m pipeline.classify_bills stats`

2. Run `python -m scripts.enrich_states` to populate ESA data

### Sprint 5: Frontend

1. Create `components/ImpactBadge.tsx` — color-coded impact indicator
2. Update `components/BillCard.tsx` — real badges, ESA tag, action_required
3. Create `app/bill/[id]/page.tsx` — full detail page with:
   - Impact header + badge
   - Delta section (amber callout box)
   - Analysis bullet points
   - Action required warning (amber left-border)
   - Key provisions tags
   - Confidence + analyzed_at footer

4. Wire impact filter on dashboard/bills list

## Cost Estimate

| Item | Quantity | Unit Cost | Total |
|------|----------|-----------|-------|
| Gemini 2.5 Flash (3,845 bills) | ~200K tokens | $0.15/1K bills | ~$0.60 |
| Vertex AI API calls | 3,845 | Free tier covers | $0 |
| Neon storage increase | ~2MB JSONB | Negligible | ~$0 |
| **Total backfill cost** | | | **~$0.60** |
| **Ongoing per day** | ~50 bills | $0.00004/bill | ~$0.002/day |

## Rollback Plan

If classification quality is poor:
1. Revert `sync-to-neon.py` to hardcoded `"neutral"` (it's one line)
2. Drop new columns or set them to NULL
3. Refine Gemini prompt with more few-shot examples
4. Re-run backfill

The old `impact` column is preserved during migration; new columns are additive. No data loss.

## Key Decisions

1. **Gemini 2.5 Flash vs Pro:** Flash at $0.15/1K vs Pro at ~$1.25/1K. For bill title+summary classification, Flash is sufficient. Upgrade to Pro if Tier 2 analysis quality is inconsistent.

2. **Vertex AI SDK vs localhost proxy:** SDK directly is more reliable (proxy had 7/14 success rate). Use `google.genai` with `vertexai=True`.

3. **Backfill vs incremental:** Backfill all 3,845 existing bills first, then new bills get classified as they arrive via sync pipeline. Backfill is a one-time ~$0.60 cost.

4. **Structured output vs freeform:** Use `response_mime_type="application/json"` for parseable output. Fallback to regex parsing if JSON mode has issues.

5. **Batch size:** 5 bills per Gemini call, 0.15s delay = ~33 bills/min. 3,845 bills / 33 = ~2 hours for full backfill.
