# Sprint Plan v1 — Investigation Board + Pricing + Checklist

**Date:** 2026-06-17  
**Status:** Planned  
**Backfill progress:** 921/3,845 bills classified (24%), data quality verified ✅

## Data Audit Summary

| Metric | Value | Verdict |
|--------|-------|---------|
| Analysis coverage | 100% | ✅ All bills have JSONB |
| Summary | 100% | ✅ |
| Delta | 96% | ✅ |
| Action required | 96% | ✅ |
| Target audience | 96% | ✅ |
| Effective date | 6% | ⚠️ Prompt fix needed (Tier 2) |
| ESA confidence | 0.80–0.95 | ✅ Solid detection |
| Avg confidence | 0.802 | ✅ |
| Empty analysis | 0 bills | ✅ |

**Conclusion:** Data is ready to build on. Backfill continues in background.

---

## PR 1: Feature/Clickable Investigation Board

**Files changed:** ~8  
**Branch:** `feature/clickable-investigation-board`  
**Priority:** Highest — unlocks the core UX

### What changes

#### 1. State Page Header — Add Restriction Chips
File: `app/state/[code]/page.tsx`

Above the state summary, add clickable restriction chips:
- "High restrictions on Curriculum" (click → bills tab with curriculum filter)
- "Moderate Testing mandate" (click → bills tab with testing filter)
- Color-coded: red (high), amber (moderate), green (low)

Each chip links to `#bills?filter={subscore}` on the same page.

#### 2. StateTabs — Restriction Chips in Overview
File: `components/state/state-tabs.tsx`

Replace the current static subscore cards with clickable cards. When user clicks "Curriculum: 45/100" it:
- Switches to the "Current Bills" tab
- Filters bills by relevance to that restriction area
- Highlighted active filter chip above the bill list

Implementation: use URL search params or state. Since this is a client component, simplest is useState for active filter + programmatic tab switch.

#### 3. Bill Detail Page — Live Analysis Display
File: `app/bill/[id]/page.tsx`

Currently uses mock `bill.analysis` array. Upgrade to display real Gemini data:
- **Impact section:** ImpactBadge with confidence score shown as tooltip or inline percentage
- **Analysis section:** Show analysis_points as bullet list (already done) + key_provisions as sub-bullets
- **Target audience:** Chip under the title
- **Action section:** If action_required exists and is meaningful, show as amber alert with "Take Action" button
- **Delta:** Keep existing "Change Summary" section

#### 4. BillCard — Data-Rich Cards
File: `components/site/bill-card.tsx`

Show:
- Impact confidence (small percentage badge next to ImpactBadge)
- ESA tag if esa_related
- Truncated analysis point (first bullet) below the summary

#### 5. Data Layer — Live Data from DB
File: `lib/data.ts` / `lib/db.ts`

The bill detail page currently fetches from `getBill(id)` which uses mock data. Need to:
- The mock data already has the correct shape (Bill type includes impactConfidence, analyzedAt, analysisVersion)
- Live DB queries already return these fields (rowToBill maps them)
- However, `fullText` is coming from LegiScan — not from Gemini. The live DB returns `fullText: ""` because it's not synced. Need to either:
  a. Skip the fullText section if empty
  b. Or pull fullText from the mock data when available

Simplest path: **Hide the "Full Text" section when fullText is empty.** The mock bills in data.ts have fullText populated, but live DB bills don't. The page already renders conditionally based on whether fullText exists.

#### 6. Dashboard — Impact Summary Widget
File: `app/dashboard/page.tsx`

Add a quick-stats widget showing:
- "N bills increasing regulation in your state"
- "N bills decreasing regulation"
- "N ESA-related bills to watch"
- Filtered by the user's watchlist states or alert preferences

### Mock vs Live Data Strategy

**Current state:** The frontend runs on mock data (USE_LIVE_DATA=false for preview/pre-prod).
**Transition:** The new components must work with BOTH mock and live data layers.

All new features should:
1. Use the async `getDb()` pattern (not direct mock imports)
2. Accept empty/null fields gracefully (live data may have gaps)
3. Fall back to sensible defaults when analysis fields are missing

### Design Decisions

- **Color scheme:** Restriction chips use the same colors as subscore bars (green ≥80, amber ≥60, red <60)
- **Filtering:** Client-side state in StateTabs, no server round-trip needed
- **Loading states:** Skeleton placeholders for bill lists while data loads
- **Empty states:** "No bills matching this restriction" with suggestion to check other categories

---

## PR 2: Feature/Pricing-Redesign

**Files changed:** ~2  
**Branch:** `feature/pricing-redesign`  
**Priority:** Medium — messaging matters for conversion

### Strategy

Current pricing sells *features* ("alerts, checklists, ESA tracking"). New version sells the *experience*:
- "Find every bill affecting your family in under 10 seconds"
- "Click any restriction → see every bill creating it → understand what it means → take action"

### What changes

#### 1. PricingSection Features Rewrite
File: `components/site/pricing-section.tsx`

Update PAID_FEATURES array to emphasize active investigation:

Current $29 features:
```
"Unlimited state compliance guides (all 50 states)"
"Instant bill alerts (email, SMS, webhook)"
"Personalized compliance checklist with deadlines"
"ESA program tracking and deadline reminders"
"Historical bill archive"
```

New $29 features:
```
"Clickable investigation board — drill from restrictions to specific bills"
"AI-powered bill analysis: plain-English summaries with impact scoring"
"Real-time alerts when new bills affect your state (email + SMS + webhook)"
"Personalized action checklist with deadlines built from bill analysis"
"ESA program tracking: eligibility, awards, and filing deadlines"
"Full historical archive with bill status updates"
```

Add a **competitor comparison** section at the bottom:
- "HSLDA basic membership: $150/yr for legal defense + free bill map"
- "Homeschool Compass: $29/yr for dedicated bill tracking + AI analysis + compliance tools"
- "HSLDA alignment noted in footer"

#### 2. Trust Signals Update
Update the TRUST_SIGNALS array:
- "50 States Monitored" ✅
- "Real-Time Legislative Alerts" ✅ 
- "HSLDA-Aligned Categorization" → "AI-Powered Impact Analysis" (Gemini is the differentiator)
- "30,000+ Bills Analyzed" → Keep but verify count
- "ESA Compliance Tracking" ✅

---

## PR 3: Feature/Action-Checklist

**Files changed:** ~5  
**Branch:** `feature/action-checklist`  
**Priority:** Medium-High — this is the stickiness feature

### What it does

Every bill with `action_required` generates one or more checklist items:
- One per bill, pulled from the action_required field
- If the bill has an `effective_date`, use it as the deadline
- If no effective_date, show "Under review — no deadline yet"

Checklist items appear on:
1. **Dashboard** — "Your Action Items" widget (limit to 5, sorted by deadline)
2. **State page** — "Required Actions" section in the Requirements tab
3. **Bill detail page** — Action section already exists, just needs to be wired

### Checklist Data Model

No new DB table. Checklist items are rendered **from existing bill data**:
- Source: `bills` table, `action_required` + `effective_date` columns
- No user-specific assignments (Phase 1: universal checklist based on watched states)
- Phase 2: per-user bookmark/complete tracking via the watchlist

### Rendering Logic

```tsx
function getChecklistItems(bills: Bill[]): ChecklistItem[] {
  return bills
    .filter(b => b.actionRequired && b.actionRequired.length > 0)
    .filter(b => b.impact === 'increase') // Only action items for restrictive bills
    .map(b => ({
      id: b.id,
      billTitle: b.title,
      action: b.actionRequired,
      deadline: b.effectiveDate || 'No deadline yet',
      stateCode: b.stateCode,
      billNumber: b.number,
    }))
    .sort((a, b) => sortByDeadline(a.deadline, b.deadline))
}
```

### Frontend Locations

| Location | Component | What shows |
|----------|-----------|------------|
| Dashboard | New `action-checklist.tsx` | Top 5 items by deadline, "View all" link |
| State page | Existing Requirements tab | Checklist section after compliance table |
| Bill detail | Existing action section | Already rendered — just wire to live data |

---

## Implementation Order

```
Week 1:
  └─ Day 1: PR 1 — Clickable state page + restriction chips + bill detail upgrade
  └─ Day 1: PR 2 — Pricing redesign (quick wins: arrays + copy)
  └─ Day 2: PR 3 — Checklist component + dashboard widget
  └─ Day 2: Verify everything works with both mock and live data
```

---

## Verification Checklist

- [ ] Click a state → see restriction chips → click a chip → bills filtered
- [ ] Click a bill → see full analysis (summary, delta, action, analysis points, confidence)
- [ ] Pricing page clearly communicates investigation-board experience
- [ ] Dashboard shows action checklist items for watched states
- [ ] All components render gracefully when data is empty/missing
- [ ] Works with mock data (preview environment)
- [ ] Works with live data (production environment after backfill completes)
