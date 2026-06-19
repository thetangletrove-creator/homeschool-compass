# Homeschool Compass — Proposed Marketing Copy for Conversion Review

## Target Audience

Homeschooling parents and guardians in the United States, primarily:
- Current homeschoolers (K–12) seeking regulatory clarity
- Families considering homeschooling who need to understand state requirements
- Parents using or considering Education Savings Accounts (ESAs)
- Umbrella school administrators and homeschool co-op leaders

**Primary pain point:** Fear of missing a regulation change that could jeopardize their family's legal standing. Secondary pain point: confusion about what their state requires vs what other states require.

## Product Overview

Homeschool Compass tracks homeschool legislation across all 50 states. Free tier: 50-state scorecard, 3 state guides/month, bill title+status search. Paid tier ($29/yr): unlimited guides, instant bill alerts, personalized compliance checklists, ESA tracking. ESA tier ($99/yr): multi-state, SMS alerts, API access, priority support.

---

## 1. Hero Section

### Current (Live Site)
> **Headline:** Know exactly what your state requires — before the law changes.
> **Subheadline:** Track homeschool legislation across all 50 states. Get instant alerts when bills affecting your family are introduced, amended, or signed into law.
> **CTA Primary:** Start Free Tracking
> **CTA Secondary:** See the Scorecard →
> **Visual:** Live alert card (real data from database)

### Proposed (Marketing Package)
> **Headline:** Know Exactly What Your State Requires — Before the Law Changes
> **Subheadline:** Track homeschool legislation across all 50 states. Get alerts when bills affecting your family are introduced, amended, or signed into law.
> **CTA Primary:** See Your State's Grade →
> **CTA Secondary:** Free 50-state scorecard. No signup required.
> **Visual:** Color-coded US map with state grades (A-F)

**Key changes from current:**
- Primary CTA redirects to /scorecard first (free, no friction) instead of /pricing
- "Start Free Tracking" → "See Your State's Grade →" (more specific, curiosity-driven)
- Removed secondary arrow icon CTA in favor of text-based "Free 50-state scorecard. No signup required." (value + friction removal)
- "instant alerts" → "alerts" (minor trim)
- Live alert card → static color-coded map (trade: real data vs at-a-glance comprehension)

---

## 2. Trust Bar

### Current (Live Site)
> 50 States Monitored | Real-Time Legislative Alerts | HSLDA-Aligned Categorization | 30,000+ Bills Analyzed | ESA Compliance Tracking

### Proposed (Marketing Package)
> 50 States Monitored | Real-Time Legislative Tracking | HSLDA-Aligned Framework | ESA Program Directory

**Key changes:**
- "Real-Time Legislative Alerts" → "Real-Time Legislative Tracking" (broader, positions as watching everything)
- "HSLDA-Aligned Categorization" → "Based on HSLDA Standards" (less jargon-y for new visitors)
- Keep "30,000+ Bills Tracked" — review found specific numbers signal depth of coverage for this anxious audience
- "ESA Compliance Tracking" → "ESA Program Monitoring" (Tracking implies ongoing protection, not a static directory lookup)
- 5 items → 5 items (review found no layout concern)

---

## 3. Scorecard Preview

### Current (Live Site)
> **Headline:** The 2026 Homeschool Freedom Scorecard
> **Subheadline:** How does your state rank on regulation burden, testing mandates, and curriculum freedom?
> **Cards:** Shows 10 state cards (from DB, no explicit scores shown)

### Proposed (Marketing Package)
> **Headline:** The 2026 Homeschool Freedom Scorecard
> **Subheadline:** How does your state rank on regulation burden, testing mandates, and curriculum freedom?
> **Cards:** Shows 5 state cards WITH explicit scores:
> - ID — A — 96/100
> - TX — A — 89/100
> - FL — B — 84/100
> - CA — D — 48/100
> - NY — F — 38/100

**Key changes:**
- 10 cards → 5 cards (fewer, more focused)
- Explicit A-F grade and numerical score on each card (current just shows scorecard layout, no numbers)
- Picks clear contrasts: two As, one B, one D, one F — shows the full range

---

## 4. About Section ("Why We Built This")

### Current (Live Site)
> **3 blocks:**
> 1. **The Problem:** Families discover changes too late — after filing deadlines. A single missed notice can jeopardize a family's standing.
> 2. **Our Approach:** We process 30,000+ API queries monthly across LegiScan and OpenStates, with change-hash detection for incremental sync and Gemini-assisted analysis categorized against the HSLDA framework.
> 3. **The Accuracy Guarantee:** If we miss a bill that affects your state, your next year is free. We hold our compliance tracking to the same standard the IRS holds your taxes.
>
> **Bottom CTA card:** "Built by policy analysts and engineers. Real names, real methodology, and documented data sources — because anonymous tools have no place in legal compliance. → Meet the team"

### Proposed (Marketing Package)
> **Problem:** Same as current.
> **Our Approach:** Simplified: "We monitor legislative data from LegiScan and OpenStates, tracking bills that affect homeschoolers across all 50 states. Each bill is categorized against the HSLDA framework for consistency."
> **Accuracy Guarantee: REMOVED entirely.**
> **Data Sources section added:** LegiScan, OpenStates, State DOE websites (primary source verification), HSLDA framework
> **Adds link:** "Methodology: How We Score States →" to /methodology
> **Removes:** "Real names, real methodology"

**Key changes (incorporating review feedback):**
- Simplifies technical jargon (30k API queries, change-hash, Gemini-assisted) — ✅ keep
- Adds visible data source citations for trust — ✅ keep
- Adds methodology page link — ✅ keep
- **KEEPS the Accuracy Guarantee** — review found this is the single strongest trust signal. Reword: drop "IRS standard" comparison, keep the guarantee.
- **KEEPS "Real names, real methodology" tagline** — review found it humanizes the product
- **Adds "Who is this for?" callout** — new frame addressing audience fit

---

## 5. Pricing Section

### Current (Live Site)
> **Free Tier — "Scorecard Access"**
> Price: Free Forever
> Features: Full scorecard, bill search/filtering, public bill summaries, weekly digest
> CTA: Get Free Access
>
> **Paid Tier — "Regulation Tracker"** ($29/yr)
> Features: Everything in Scorecard + instant alerts (SMS/email/webhook), compliance checklists, ESA tracking, historical archive, API access
> Note below: "or $99/year for ESA Compliance"
> CTA: Start Tracking — $29/year | ESA Compliance — $99/year
> Trial: "14-day free trial. Cancel anytime."
> Trust footer: "Used by 2,400+ homeschool families | Trusted by umbrella schools in 12 states | Stripe · Apple Pay · Google Pay"

### Proposed (Marketing Package)
> **Free Tier — "Scorecard Access"**
> Price: Free Forever
> Features:
> - Full 50-state scorecard with grades A-F
> - State summary pages (freedom score + 4 sub-scores)
> - **3 detailed state compliance guides per month** (NEW limit, current has no limit)
> - Bill search **(title + status only)** (NEW specificity, current says full search)
> - Weekly regulation digest email
> CTA: Get Started Free → (links to /sign-up, not /api/checkout)
>
> **Paid Tier — "Regulation Tracker"** ($29/yr)
> **Badge: "Most Popular"** (NEW)
> Features:
> - Everything in Scorecard, plus:
> - **Unlimited state compliance guides** (NEW, clarifies what free limit buys)
> - Instant bill alerts **(email, webhook)** (removes SMS from base tier)
> - Personalized compliance checklist with deadlines
> - ESA program tracking and deadline reminders
> - Historical bill archive
> - **14-day free trial — no credit card required** (NEW, current site already has this but doesn't emphasize it)
> CTA: Start Free Trial →
>
> **ESA Tier — "Full Protection"** ($99/yr) (NEW — currently just a footnote)
> Features:
> - Everything in Regulation Tracker, plus:
> - Multi-state tracking (up to 3 states)
> - SMS alerts for urgent bills (up to 5/month)
> - Webhook/API access
> - Priority email support (24-hour response)
> - Annual deadline reminder + personalized checklist
> CTA: Start Free Trial →
>
> **Trust signals (replacing current):**
> - REMOVED: "Used by 2,400+ homeschool families" (unverifiable)
> - REMOVED: "Trusted by umbrella schools in 12 states" (unverifiable)
> - ADDED: Verifiable trust: Stripe · Apple Pay · Google Pay
> - ADDED: Data Sources: LegiScan · OpenStates · State DOE Records
> - ADDED: Framework: Aligned with HSLDA State Law Categories
> - ADDED (when available): 3 testimonials with real names and locations

**Key changes:**
- Free tier gets explicit limits (3 guides/month, title+status only) — clarifies upgrade value
- Paid tier gets "Most Popular" badge — standard SaaS conversion optimization
- ESA tier becomes distinct card with its own feature list — currently a footnote
- "Start Free Trial" replaces "Start Tracking — $29/year" (action-verb focused)
- "No credit card required" added to trial copy
- Unverifiable social proof removed, replaced with verifiable trust signals (payment logos, data source logos)
- Free tier CTA links to /sign-up (registers account) not /checkout

---

## 6. Paywall Modals (NEW — Not Currently Implemented)

Five modal variants triggered by monthly view-count tracking (3 free guides/month):

**Modal 1: First Paywall Hit (3rd guide viewed)**
> Headline: "You've viewed 3 state guides this month"
> Body: Upgrade value proposition with 4 bullet features
> CTA: "Start 14-Day Free Trial →"
> Secondary: "Maybe Later (you'll get 3 more views next month)"

**Modal 2: Second Paywall Hit (4th+ guide viewed)**
> Headline: "You've reached your monthly limit"
> Body: Shows reset date, upgrade offer
> CTA: "Start Free Trial →"
> Secondary: "Remind Me Next Month →" (email capture for notification)

**Modal 3: Bill Page Paywall**
> Headline: "Bill analysis available for subscribers"
> Body: Upgrade from bill title+status to full analysis
> CTA: "Start Free Trial →"
> Secondary: "Back to Bill List →"

**Modal 4: ESA Section Paywall**
> Headline: "ESA program details available for subscribers"
> Body: Upgrade from "does state have ESA" to full program details
> CTA: "Start Free Trial →"
> Secondary: "Back to State Guide →"

**Modal 5: Alert Signup Paywall**
> Headline: "Bill alerts are a paid feature"
> Body: Upgrade from weekly digest to instant alerts
> CTA: "Start Free Trial →"
> Secondary: "Continue with Weekly Digest →"

**All modals are dismissible (not hard gates) to maintain goodwill.**

---

## 7. Methodology Page (NEW — Not Currently Implemented)

Full page at /methodology with:
- 4-category scoring rubric (Reporting 30%, Testing 25%, Curriculum 25%, Teacher 20%)
- Each category has A-F score descriptions with state examples
- Worked calculation examples (CA → 42 → D, ID → 100 → A)
- Data sources and update frequency
- Limitations and caveats
- Error reporting process
- CTA: "See the full 50-state scorecard →"
- **Linked from: every state page, footer, about section**

---

## 8. Site Footer

**Current:** Product links (Dashboard, Scorecard, Alerts, ESA Guide, API Docs) + Resources (Methodology→/about, Data Sources→/about, HSLDA Partnership→/about, Blog) + Legal

**Proposed:** Same structure, but "Methodology" should link to standalone /methodology page instead of /about.

---

## 9. A/B Test Plan (Reference)

10 tests proposed in the marketing package. Highest priority:
1. Paywall threshold (3 views vs 5)
2. Free trial (no-CC vs CC-required)
3. Pricing presentation ($29/yr vs $2.42/mo)
4. CTA copy ("Get alerts" vs "Protect your homeschool")
5. Landing page hero (Map vs Alert Preview vs Family Photo)
6. Email subject line (Specific vs Curiosity)
7-10. Ad creative, audience, blog length, influencer commission

---

## Review Request

Please review the proposed copy (Proposed column above) against the current live site (Current column). For each section:

1. **Will this improve conversion rate for homeschooling parents?** (primary KPI: trial sign-up rate, secondary: landing page → scorecard click-through)
2. **Is there anything in the current copy that we're removing that we should keep?** (e.g. "Accuracy guarantee" — some reviewers may feel removing a guarantee removes trust)
3. **Are there specific wording improvements you'd make to the proposed copy to better resonate with this audience?**
4. **Any missing sections or frames we should add?**

**Provide specific rewrite suggestions, not just "looks good." Target audience is US homeschool parents — value clarity, specificity, and reduced anxiety about legal compliance.**

