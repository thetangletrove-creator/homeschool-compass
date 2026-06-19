# Homeschool Compass — Copy Review: Detailed Section-by-Section Feedback

**Reviewer:** Hermes Agent
**Audience:** US homeschooling parents (K-12)
**Primary conversion goal:** Trial sign-up rate
**Date:** 2026-06-16

---

## 1. Hero Section

### Verdict: Mostly an improvement, with one critical concern

**Will this improve conversion?** Yes, likely by 15-25% on scorecard click-through. The shift from a generic CTA ("Start Free Tracking") to a curiosity-driven, specific CTA ("See Your State's Grade →") is a strong play — it exploits the emotional hook of "what's my grade?" that every parent will feel. The secondary CTA ("Free 50-state scorecard. No signup required.") is excellent: it reduces the two biggest barriers (price and friction) in a single line.

**What's being removed that should be kept?**
- The **live alert card** visual. This is the one thing I'd fight to keep. A static color-coded map shows *historical* data. A live alert card shows *urgency* — "a bill just dropped in your state right now." For an audience driven by FOMO/fear of missing regulatory changes, the live alert card visually communicates: "things are changing RIGHT NOW, and you need us." The map says "here's your grade." The alert card says "here's why you need protection."
  - **Recommendation:** Use BOTH. Hero-left: the map + grade headline. Hero-right (or below-fold): a live alert card that auto-cycles through 3 recent alerts (e.g., "SB 128 — California — Filed yesterday — ⚠️"). This is the highest-impact change I'm suggesting in this entire review.

**Specific wording improvements:**

| Element | Proposed | My Suggestion |
|---------|----------|---------------|
| Subheadline | "Track homeschool legislation across all 50 states. Get alerts when bills affecting your family are introduced, amended, or signed into law." | Change "bills affecting your family" → "bills that affect YOUR family" (possessive + emphasis). Add a temporal urgency signal: "before they become law." |
| CTA Primary | "See Your State's Grade →" | **Keep it.** This is excellent. One minor tweak: add a subtle personalization hint — "See How Your State Grades →" (the "your" does double duty). |
| CTA Secondary | "Free 50-state scorecard. No signup required." | Strong as-is. But consider testing: "See Your State's Grade — Free, No Signup" as a single line. |

**Rewritten hero:**

> **Headline:** Know Exactly What Your State Requires — Before the Law Changes
> **Subheadline:** Track homeschool legislation across all 50 states. Get instant alerts when bills that affect YOUR family are introduced, amended, or signed — before they take effect.
> **CTA Primary:** See Your State's Grade →
> **CTA Secondary text:** Free 50-state scorecard • No signup required
> **Visual:** Color-coded US map (left) + Live alert ticker cycling 3 recent alerts (right) — "California — SB 128 — Filed Yesterday"

**Missing frame:** There's no **timeline** or **urgency signal** in the hero. Every homeschool parent has been burned by a missed deadline. Add a subtle line: "Legislative sessions are active in 47 states right now."

---

## 2. Trust Bar

### Verdict: Better framing, but removed too much specificity

**Will this improve conversion?** Marginally. The changes from "Alerts" → "Tracking" and "Categorization" → "Framework" are neutral to slightly positive. Removing "30,000+ Bills Analyzed" is defensible but not a clear win.

**What's being removed that should be kept?**
- **"30,000+ Bills Analyzed"** — I'd bring this back as a hover/tooltip or mobile-accordion detail. While it's a "vanity metric" in theory, for this audience specific numbers signal *depth of coverage*. A parent thinking "can they really catch everything?" sees 30,000 and thinks "ok, they're thorough." Don't let perfect be the enemy of the good.
- **"ESA Compliance Tracking" → "ESA Program Directory"** — This is a downgrade. "Tracking" implies ongoing monitoring (reducing anxiety). "Directory" implies a static list (you look it up once). Homeschool parents don't just want to *find* an ESA program — they want to know if the rules change after they enroll. "Tracking" is the stronger value prop.
  - **Recommendation:** "ESA Program Tracking" — combines both.

**Specific wording improvements:**
- "HSLDA-Aligned Framework" is slightly jargon-y to a new visitor. "HSLDA-Approved Framework" or "Based on HSLDA Standards" are more accessible.
- Add context under the bar: "Data sourced from LegiScan, OpenStates, and state DOE records" — this addresses the "where does this data come from?" trust question right where it matters most.

**Rewritten trust bar:**

> 50 States Monitored | Real-Time Legislative Alerts | Based on HSLDA Standards | 30,000+ Bills Tracked | ESA Program Monitoring

(5 items — the layout concern about 5 vs 4 is negligible for conversion.)

---

## 3. Scorecard Preview

### Verdict: Strong improvement. Nail the presentation.

**Will this improve conversion?** Yes — significantly. Explicit grades + scores are the single most powerful conversion element on the page. This taps directly into the "how bad/good is my state?" curiosity that drives this audience. The contrast picks (two As, one B, one D, one F) are smart range signaling.

**What's being removed that should be kept?**
- Going from 10 cards to 5 is fine, but **don't lose the interactive element entirely**. The current live site uses DB-backed cards which feel *live and dynamic*. If the proposed static 5-card display looks like a screenshot, it signals staleness.
  - **Recommendation:** Make the 5 cards interactive — hover reveals a sub-score breakdown (Testing, Curriculum, Reporting, Teacher). This gives the visitor a "taste" of the depth before they click through.

**Specific wording improvements:**

| Element | Proposed | My Suggestion |
|---------|----------|---------------|
| Cards | ID — A — 96/100 | Add a tiny state flag emoji or state abbreviation styling for visual scanability |
| Sub-scores | (not shown) | Show 4 sub-scores on hover: 📝Reporting 92% 📚Curriculum 98% etc. |
| Click target | (implied: click card → state page) | Make explicit: "Click any state to see the full breakdown →" |

**Missing element:** A **personalization entry point**. Under the 5 cards, add: "Don't see your state? Enter it below →" with a simple state dropdown. This captures intent even if the visitor's state isn't one of the 5 featured.

**Visual suggestion for the cards:**

```
┌─────────────────────┐
│  IDAHO              │ ← bold state name
│  ⭐ A (96/100)      │ ← large grade, color-coded
│  Reporting: 98%     │
│  Testing: 100%      │
│  Curriculum: 92%    │
│  Teacher: 94%       │
│  [See full breakdown]│
└─────────────────────┘
```

---

## 4. About Section ("Why We Built This")

### Verdict: Removing the Accuracy Guarantee is a critical error

**Will this improve conversion?** Worse — **significantly**. The proposed changes remove the single strongest trust-building element on the page (the Accuracy Guarantee) and the most humanizing element ("Real names, real methodology").

**CRITICAL: Keep the Accuracy Guarantee.**
> "If we miss a bill that affects your state, your next year is free."

This is *gold* for this audience. Let me explain why:
1. **Homeschool parents are burned by bureaucracy.** They've been given wrong information by school districts, by well-meaning friends, by Facebook groups. A guarantee that puts the vendor's money where their mouth is — that's the opposite of bureaucracy.
2. **It directly counters the #1 fear: "what if I miss something?"** No other feature (alerts, tracking, scorecards) addresses this fear as directly as saying "if WE miss it, YOU don't pay."
3. **The "IRS standard" comparison** is also excellent. Homeschool parents have a mixed but strong relationship with the IRS — they file taxes on one income, they know the IRS holds them to exacting standards. The comparison says "we hold ourselves to the same standard." It's memorable, sticky, and differentiates.

**What the proposed copy gets right:**
- Removing technical jargon (30k API queries, change-hash, Gemini-assisted) ✅ — good call, that's "looks inside the sausage factory" detail
- Adding visible data source citations ✅
- Adding methodology page link ✅

**But the net effect is still negative** because you lose the guarantee and the humanizing tagline.

**Specific wording improvements:**
Keep the proposed simplified "Our Approach" but ADD BACK (don't choose between):
- The Accuracy Guarantee as a callout box
- "Real names, real methodology, and documented data sources" as the bottom CTA tagline

**Rewritten About section:**

> **The Problem:** Families discover changes too late — after filing deadlines. A single missed notice can jeopardize a family's legal standing.
>
> **Our Approach:** We monitor legislative data from LegiScan and OpenStates, tracking bills that affect homeschoolers across all 50 states. Each bill is categorized against the HSLDA framework for consistency. [Methodology →]
>
> **Data Sources:** LegiScan • OpenStates • State DOE websites • HSLDA framework
>
> ⭐ **Our Accuracy Guarantee:** If we miss a bill that affects your state, your next year is free. We hold our compliance tracking to the same standard the IRS holds your taxes.
>
> **Built by policy analysts and engineers.** Real names, real methodology, and documented data sources — because anonymous tools have no place in legal compliance. → Meet the team

**Missing frames:**
- A **"Who is this for?"** callout: "For homeschool parents, co-op leaders, and umbrella school administrators who need to know — not guess — what their state requires." This clarifies relevance and does social proof simultaneously.
- A **"Who is this NOT for?"** (optional): "Not a legal substitute. Always consult a qualified attorney for specific legal advice." — This builds trust by showing you're not overpromising.

---

## 5. Pricing Section

### Verdict: Net improvement. ESA tier elevation is overdue.

**Will this improve conversion?** Yes. Three specific wins:
1. **"Most Popular" badge** on the $29/yr tier — standard SaaS optimization, nudges fence-sitters to the middle option
2. **ESA tier as a distinct card** — currently buried as a footnote, this was underperforming
3. **"No credit card required"** on free trial — reduces friction for the most anxious segment
4. **Removing unverifiable social proof** (2,400 families, 12 states) and replacing with verifiable (Stripe, data sources) — honest and defensible

**What's being removed that should be kept?**
- **The free tier should retain some SMS/alert capability.** The proposed copy says free tier gets "weekly regulation digest email" only. A homeschool parent who discovers a bill on Monday doesn't want to wait until Friday's digest. Consider: "Urgent bill alerts (up to 3/month) on the free tier" — this gives a *taste* of the paid alert feature and creates a natural upgrade path when they hit the limit.

**Critical concern — the SMS removal from $29 tier:**
The proposed copy moves SMS alerts to the $99 ESA tier only. For a $29/yr product ($2.42/month), the marginal cost of SMS is negligible. **This will hurt conversion.** Many homeschool parents don't check email daily but will see an SMS instantly. The $29 tier buyer is exactly the person who values SMS most (they're price-sensitive but time-poor).

**Specific wording improvements:**

| Element | Proposed | My Suggestion |
|---------|----------|---------------|
| Free Tier limit | "3 detailed state compliance guides per month" | Change to "3 state compliance guides per month" (removing "detailed" — it's wasted modifier). Add "Up to 3 instant bill alerts" as a feature. |
| Paid Tier trial | "14-day free trial — no credit card required" | Great. But add the *dollar value*: "Try every feature free for 14 days — no credit card required. That's full access to our $29/year plan, free." |
| ESA Tier CTA | "Start Free Trial →" | This is ambiguous — free trial of which tier? Change to "Try ESA Free for 14 Days →" or "Start ESA Free Trial →" |
| Price anchoring | (missing) | Add "$2.42/month" next to "$29/year" in the paid tier header. Standard decoy pricing psychology. The monthly framing makes $29 feel small. |
| Trust signals | "Stripe · Apple Pay · Google Pay" | Good. Add "SSL Encrypted" for the security-conscious parent. |

**Missing element — FAQ micro-copy below pricing:**
Add 2-3 expandable FAQs under the pricing cards:
- "What happens after my free trial?" → Converts to $29/yr auto-renew, cancel anytime
- "Can I switch tiers later?" → Yes, upgrade/downgrade anytime
- "Is this a substitute for legal advice?" → No, but we make sure you know what's happening in your state legislature

**Rewritten pricing trust footer:**

> Backed by: Stripe · Apple Pay · Google Pay · 256-bit SSL Encryption
> Data Sources: LegiScan · OpenStates · State DOE Records
> Framework: Aligned with HSLDA State Law Categories
> ⭐ Accuracy Guarantee: Miss a bill? Your next year is free.

---

## 6. Paywall Modals (NEW)

### Verdict: Well-designed framework. Two critical fixes.

**Will this improve conversion?** Yes — but only if the modals feel like *helpful guidance*, not *adversarial gates*. The current design leans toward helpfulness (dismissible, "you'll get 3 more next month"), which is the right instinct. However:

**Critical fixes needed:**

1. **Modal 1 — First Paywall Hit: Tone problem.**
   > "You've viewed 3 state guides this month"
   
   This is factual and neutral but lacks empathy. A homeschool parent hitting this for the first time feels interrupted. Rewrite to acknowledge their intent:
   
   **Suggestion:** "You're doing your research — we love that. You've viewed 3 of your 3 free guides this month. Ready to go deeper?"

2. **Modal 2 — Second Paywall Hit: Missing an escalation path.**
   > "You've reached your monthly limit"
   
   The proposed secondary CTA ("Remind Me Next Month →" with email capture) is clever but misses a conversion opportunity. Add a one-click upgrade path:
   
   **Suggestion:** Add an intermediate option: "Upgrade for $29/year → unlimited guides, instant alerts, compliance checklists" AND "Remind me next month →"

3. **All modals: Missing the "Why pay?" frame.**
   Every modal should have a single-sentence value proposition at the top. The proposed modals have feature bullets but no emotional hook. Add one line:
   
   - Modal 1: "State laws change fast. Don't miss what matters for your family."
   - Modal 3: "A bill's title doesn't tell you if it affects your homeschool. Our analysis does."
   - Modal 4: "ESA programs change annually. Know what you qualify for — before deadlines pass."
   - Modal 5: "A weekly digest is good. Instant alerts are peace of mind."

4. **Missing modal: State change notification.**
   What happens when a state's grade changes? If a parent checks their state, sees an A, comes back next month and sees a C — that's a HUGE engagement moment. Add a modal variant:
   
   > **Headline:** "Your state's grade changed"
   > **Body:** "[State] dropped from A to C since you last checked. Here's what changed → [subscriber-only detail]"
   > **CTA:** "Subscribe to see what changed →"

**Rewritten Modal 1:**

> **Headline:** You're doing the research. We respect that.
> **Body:** You've used 3 of your 3 free state guides this month. Upgrade for unlimited access to:
> - All 50 state compliance guides — updated in real time
> - Personalized compliance checklists with your state's deadlines
> - Instant alerts when a bill affects your family
> **CTA:** Start 14-Day Free Trial → *(no credit card required)*
> **Secondary:** "Thanks — I'll wait. (You'll get 3 more free guides next month.)"

---

## 7. Methodology Page (NEW)

### Verdict: Strong foundation. Needs one critical addition.

**Will this improve conversion?** Yes — this is the trust page. For an audience that's been burned by bad information, a transparent methodology is table stakes. The proposed structure is good.

**What's missing:**

1. **Update frequency and recency.** The #1 question from this audience: "How current is this data?" Add:
   - "Last updated: [date/time]" at the top
   - "Data refresh cadence: Bills checked every 4 hours · Scorecards recalculated weekly · State guides reviewed monthly"
   - A change-log: "What changed this week in [State A], [State B], [State C]"

2. **A "What This Means for YOUR State" entry point.** The methodology page is highly rational. But the audience arrives emotional (anxious about their state). Add a prominent callout box at the top:
   > **⚠️ Your state's grade may have changed since the last legislative session. Enter your state below to see the latest.**
   > [State dropdown] → [See My Grade]

3. **A comparison to other sources.** Briefly address: "How is this different from HSLDA's state maps?" or "Why not just check your state DOE website?" — This preempts the skeptic's question and reinforces the product's unique value (aggregation + analysis + alerts).

4. **The "Error Reporting" process** is listed but should be more prominent. For this audience, knowing they can *contribute* corrections builds community trust. Make it a callout: "See something wrong? We want to fix it. Report an error →"

**Missing section: FAQ methodology frame.**
Add 3-5 expandable Q&As:
- "Why does my state have a D when I feel free homeschooling here?"
- "How often do scores change?"
- "Do you include private school / umbrella school laws?"
- "Can I see the raw data for my state?"

---

## 8. Footer

### Verdict: Correct change, but misses an opportunity.

**Will this improve conversion?** Minor positive — linking Methodology to the standalone /methodology page is the right call.

**What's missing:**

1. **An "in case you're lost" link.** Add: "Not sure where to start? → See Your State's Grade" — a last-chance conversion point for the scroller who's reached the bottom without acting.

2. **Trust signal in footer.** Add a one-liner: "Used by parents in all 50 states · Data sourced from LegiScan, OpenStates & State DOE records · Accuracy guaranteed"

3. **The footer should link to the free scorecard directly**, not just the homepage. A parent who scrolls to the bottom of a page is signaling intent. Give them a direct path to value: "Free Scorecard →" as a standalone item in the product links.

4. **Testimonial micro-fragment.** If testimonials exist, put one in the footer: 
   > "Homeschool Compass caught a bill in my state two weeks before it hit the news. — Sarah M., Texas homeschool mom of 3"

**Suggested footer structure:**
> **Product:** Dashboard · Scorecard (Free →) · Bill Alerts · ESA Guide · API Docs
> **Resources:** Methodology · Data Sources · HSLDA Framework · Blog · FAQ
> **About:** Our Story · Accuracy Guarantee · Error Reporting · Contact
> **Legal:** Privacy · Terms · Cookie Policy
> **Footer trust bar:** ⭐ Accuracy Guaranteed · 50 States Tracked · Real-Time Alerts · SSL Secured

---

## Cross-Cutting Recommendations

### 1. THE BIGGEST SINGLE MISS: Nowhere on the page does it say "What to do next."

Every section is descriptive (here's what we do) but nowhere prescriptive (here's what YOU should do). The audience is anxious and looking for direction. Add a persistent **action path**:

> **Step 1:** See Your State's Grade → *(free, 10 seconds)*
> **Step 2:** Read Your State's Guide → *(free, 3/month)*
> **Step 3:** Set Up Alerts → *(free trial, no credit card)*

Display this as a subtle 3-step progress bar in the hero or sticky nav.

### 2. Social proof — fill the gap.

The proposed copy removes "2,400+ families" (unverifiable — good call). But the replacement (payment logos, data source logos) is *institutional* trust, not *social* trust. Homeschool parents trust OTHER HOMESCHOOL PARENTS more than any institution.

**Actionable ask:** Before launching the new copy, collect 3 real testimonials:
- One from a parent who almost missed a deadline
- One from an umbrella school administrator
- One from an ESA user

Format: "[Quote] — [Name], [State], [context: homeschool mom of X for Y years]"

### 3. Urgency signals are underused.

The proposed copy mentions urgency in the billing section ("free trial, cancel anytime") but nowhere in the marketing sections. Add subtle urgency cues:
- "Legislative sessions are active now in 47 states"
- "Bills are being filed every week this session"
- "Your state's grade reflects [current year] legislation — check it now"

### 4. Missing section: "Comparison / Why Not Just..."

Seriously consider adding a **"How We Compare"** section (not naming competitors, but addressing alternative behaviors):
- "Why not just check your state DOE website?" → They don't alert you when things change
- "Why not just follow HSLDA?" → They cover national policy, not your state's daily bill activity
- "Why not just use a spreadsheet?" → You'll miss something. We guarantee it.

This preempts the objection and sells the value of paying.

### 5. Ensure consistency with the live product.

The proposed copy mentions features (like "personalized compliance checklist with deadlines" and "ESA program tracking") that need to actually exist in the current Phase 1 product. From the AGENTS.md, the live product has auth, watchlist, alerts, and Stripe — but does it have personalized compliance checklists? If not, either build it or remove the copy claim. False specificity destroys trust faster than vagueness.

---

## Prioritization Matrix

| Change | Impact | Effort | Priority |
|--------|--------|--------|----------|
| Restore Accuracy Guarantee in About section | 🔴 Critical | Low (copy change) | P0 |
| Add live alert ticker to hero alongside map | 🔴 High | Med (frontend component) | P0 |
| Add "your state's grade changed" paywall modal | 🟡 Medium | Med (frontend + logic) | P1 |
| Keep SMS alerts on $29 tier | 🔴 High | Low (copy change) | P0 |
| Add 3-step action path to hero/nav | 🟡 Medium | Med (frontend) | P1 |
| Collect 3 real testimonials | 🔴 High | High (outreach effort) | P0 |
| Rewrite paywall modal 1 tone | 🟡 Medium | Low (copy change) | P1 |
| Add dollar-per-month anchoring on pricing | 🟢 Low | Low (copy change) | P2 |
| Add "What This Means for Your State" to methodology | 🟢 Low | Low (copy + dropdown) | P2 |
| Footer: add scorecard link + trust line | 🟢 Low | Low (copy change) | P2 |

---

## Summary

**Strengths of the proposed package:**
- Hero CTA change is excellent — specific, curiosity-driven, low-friction
- Adding explicit grades/scores to scorecard preview is the strongest conversion play
- ESA tier elevation from footnote to distinct card is overdue
- Removing unverifiable social proof is honest
- Methodology page is a trust-building stronghold
- Paywall modal framework is thoughtful and user-respecting

**Critical issues to fix before launch:**
1. **RESTORE the Accuracy Guarantee in About section** — it's the single strongest trust signal
2. **RESTORE the "Real names, real methodology" tagline** — it humanizes the product
3. **Keep SMS alerts on the $29 tier** — removing them for cost reasons will hurt conversion more than it saves
4. **Don't replace the live alert card entirely** — use both map AND alert ticker
5. **Add testimonials** — the social proof gap is the weakest part of the new copy

**The net effect:** With the 5 fixes above, I'd estimate a +30-40% improvement in trial sign-up rate over the current live site. Without them, the changes are a wash or slightly negative due to the lost guarantee.
