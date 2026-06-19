# Iowa Pack Redesign Alignment — Implementation Plan

**Date:** 2026-06-18  
**Target:** `frontend/app/download/[state]/page.tsx` + `frontend/components/site/kit-download-client.tsx`  
**Goal:** Align the live Next.js post-purchase compliance pack with the provided Iowa HTML redesign while preserving real Neon-backed data wiring and payment verification.

## Execution Order

| Order | Fix | Why first | Depends on |
|---|---|---|---|
| 1 | Audit current `/download/[state]` data contract vs redesign sections | Prevent styling the wrong data shape | None |
| 2 | Expand server query + derived metrics in `page.tsx` | The redesigned layout needs more aggregates and section-specific bill buckets than the current client receives | Audit |
| 3 | Rebuild `KitDownloadClient` shell to match redesign information architecture | Layout shift is the main deliverable | Server data contract |
| 4 | Rewire section content: hero, bearings, timeline, ESA, triage, confidence, disclaimer | Each section needs live data, null states, and Iowa parity | New shell |
| 5 | Restore print behavior + family-facing polish | The pack is meant to be saved as PDF after purchase | Layout complete |
| 6 | Lint/build verification | Prevent shipping a beautiful corpse | All implementation |

---

## Fix 1 — Server data contract expansion

### Current state
- `page.tsx` verifies Stripe payment correctly and loads one `state` row.
- It fetches only **30 bills** for the state.
- Aggregate metrics are computed from those 30 records, not from the full state population.
- The client receives only broad totals plus a flat bill list.
- There is no structured payload for:
  - enacted/watch/archive buckets
  - ESA-featured bills
  - timeline items
  - confidence/data-quality bars
  - top risk/upside callouts

### Change
- Expand the server-side loader to compute a **pack-specific view model** instead of passing raw fragments.
- Fetch the bill population needed for the pack sections, then derive:
  - full state bill counts by impact/status
  - enacted/watch/archive lists with explicit slice limits
  - ESA-related featured bills
  - top enacted oversight-risk bill
  - next-dated effective bills for the action timeline
  - average impact confidence
  - average ESA-related confidence
  - bill text coverage count if available
- Keep Stripe verification exactly where it is.

### Impact
- Prevents fake-looking counts caused by the current 30-row cap.
- Gives the client a stable, explicit contract for the redesign.
- Reduces layout logic leakage into the UI layer.

---

## Fix 2 — Hero and top-of-pack architecture

### Current state
- The current cover is a generic dark card with grade bubble and four metrics.
- It does not match the provided Iowa pack’s hierarchy:
  - report identity
  - two-column hero
  - score/risk panel
  - explicit next deadline/action tiles
  - visible ESA opportunity strip
- Generated timestamp and family-facing report framing are present, but lighter than the redesign.

### Change
- Replace the existing top card with a redesign-aligned hero:
  - left: report title, state name, brief framing, three action tiles
  - right: score/grade/risk panel
  - below: ESA strip when applicable, null-state strip when not
- Preserve live data for score, level, bills tracked, next deadline, ESA program, and generated date.

### Impact
- Makes the purchased pack look like the product shown in the HTML concept.
- Moves the most actionable information above the fold.
- Sets the tone for family-facing delivery instead of dashboard export.

---

## Fix 3 — “Your Bearings” / action-priority section

### Current state
- The current download flow has an action checklist later in the page.
- It does **not** have the redesign’s bearings structure:
  - time-sensitive
  - annual / evergreen
  - already-in-effect skim list
  - get-started items
- There is no prioritized narrative ordering of what a family should do first.

### Change
- Add a dedicated **Your Bearings** section near the top.
- Populate with live or rule-derived items:
  - ESA deadline card when available
  - upcoming enacted bill effective dates when future-dated
  - annual compliance placeholders derived from state regulation level / available schema
  - enacted skim list from recent enacted bills
  - account/setup CTA item
- Include null states where data is absent rather than hiding the section.

### Impact
- Converts raw legislative data into an ordered action sequence.
- Matches the Iowa concept’s strongest usability improvement.
- Gives non-expert families a “do this first” briefing instead of a pile of cards.

---

## Fix 4 — ESA opportunity + Concierge framing

### Current state
- The current ESA section is functional but minimal.
- It surfaces program name, award, eligibility, deadline, and docs.
- It does not match the concept’s richer presentation:
  - stronger opportunity framing
  - “bills that shaped this program” subsection
  - Concierge pricing/value block
  - document checklist framed as tracked application work

### Change
- Rebuild the ESA area into two layers:
  1. **ESA Opportunity** — live state program data + featured ESA bills
  2. **ESA Concierge** — product framing block with live checklist shell and explicit “designed, not yet operational” guardrails where needed
- Keep the concierge section visually present even if backend application flow is not built yet.
- Use language/layout that clearly distinguishes live state facts from future service capabilities.

### Impact
- Preserves Jack’s preference to show the full canvas now.
- Keeps product strategy visible inside the paid artifact.
- Avoids misleading users into thinking a not-yet-built concierge workflow is already active.

---

## Fix 5 — “Why this score” and legislative context

### Current state
- The current pack has summary stats and legal disclaimer, but the “why” story is thin.
- It does not mirror the redesign’s narrative score explanation plus subscore visualization.
- Some counts currently come from the limited bill slice rather than full-state totals.

### Change
- Add a dedicated **Why This Score** section with:
  - subscore bars from `state.subscores`
  - narrative explanation derived from level/score/subscores
  - statewide activity cards for total / increase / decrease / ESA / enacted
- Ensure counts are computed from the full state bill population used for pack metrics, not the visible slice alone.

### Impact
- Makes the score legible and defensible.
- Aligns the pack with the HTML mockup’s persuasive structure.
- Fixes misleading undercount risk.

---

## Fix 6 — Bill triage queue redesign

### Current state
- The current “Law Change Queue” is directionally correct.
- It already groups bills into enacted, watch, and archive.
- However, it is still closer to an internal product card list than the redesigned family-facing queue.
- It lacks stronger section framing, more deliberate limits, and concept-aligned explanatory copy.

### Change
- Refactor the bill display into the redesign’s triage model:
  - Enacted / Signed first
  - Watch / Proposed second
  - Archive last
- Tighten card presentation to emphasize:
  - bill number
  - plain-language title/summary
  - impact direction
  - confidence
  - effective date
  - action note
- Add cross-reference behavior so ESA-featured bills do not feel duplicated without explanation.

### Impact
- Preserves the existing useful structure while making it feel intentional.
- Keeps the legislative section readable for families.
- Reduces “why is this here twice?” confusion.

---

## Fix 7 — Confidence/data-quality + disclaimer treatment

### Current state
- The current page has a legal disclaimer only.
- It does not expose the redesign’s data-quality framing.
- There is no visible pack section for confidence bars or bill-text coverage progress.

### Change
- Add a **Confidence + Data Quality** section with:
  - impact-analysis confidence bar
  - ESA-detection confidence bar
  - bill-text coverage bar/count when data available
  - explanatory note on what confidence means
- Keep the legal disclaimer visibly in the body, not buried in the footer.

### Impact
- Makes the AI-generated nature of parts of the pack legible instead of hidden.
- Matches the appendix concerns surfaced in the provided HTML.
- Improves trust without pretending certainty.

---

## Fix 8 — Footer, print, and family-facing finish

### Current state
- The current page prints, but the overall layout is still closer to a web page than a designed packet.
- The provided HTML treats the artifact like a report with a clear beginning and end.

### Change
- Add redesign-aligned footer/closing treatment.
- Tune print classes for:
  - cleaner section breaks
  - no sticky UI in print
  - no awkward clipping for long cards
  - family-facing PDF output
- Keep the existing print button.

### Impact
- Delivers the thing Jack actually wants sold: a pack, not a route.
- Improves save-to-PDF quality for buyers.

---

## Audit checklist to run immediately after plan approval

- Compare current `KitDownloadClient` sections vs provided HTML sections.
- Identify all data fields already available in schema vs inferred placeholders.
- Mark which concept sections can be live now vs must be null-state/future-state.
- Confirm whether `states.subscores` shape exactly matches current rendering assumptions.
- Confirm whether confidence/data-quality metrics need extra queries beyond the current bill fetch.
- Confirm whether `effectiveDate` values need defensive parsing/filtering before timeline use.

## Verification plan

1. Run ESLint on frontend scope.
2. Run production build for the frontend app.
3. Manually inspect the Iowa download page rendering path for:
   - no TS/React errors
   - correct payment-verified code path unchanged
   - redesign sections present in expected order
   - no broken null states on non-ESA scenarios
4. Summarize any remaining gaps separately from completed work.

## Expected result

A live `/download/[state]` experience that looks substantially closer to the provided Iowa pack, uses real Neon-backed data, preserves the existing Stripe verification flow, and prints cleanly as a family-facing compliance packet.
