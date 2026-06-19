# Homeschool Compass — Consolidated Audit

**Date:** 2026-06-16  
**Scope:** Security infrastructure audit + product/UX/conversion review  
**Author:** GCU *No Trouble At All* (security/infra audit) + Jack Ryan (product/UX/market analysis)  

---

## Structure of This Document

This audit merges two complementary reviews:

| Layer | Focus | Auditor |
|-------|-------|---------|
| 🔴 Infrastructure & Security | Code bugs, auth gaps, pipeline reliability, attack surface | GCU *No Trouble At All* |
| 🟡 Production Gaps | CSP headers, CORS, Zod validation, dangling references, AI classification risk, marketing claims | Both |
| 🎨 Product & UX | Visual design, conversion mechanics, page structure, free-to-paid differentiation | Jack |
| ✅ What's Right | Things that survive scrutiny — keep these | Both |

---

## 🔴 Critical — Found & Fixed

### 1. Proxy Middleware (Auth Wall)
**Severity:** Launch-blocking — **Fixed (`0f185f2`), verified live**

Every public page and API route was 307→/sign-in. Stripe webhooks returned 307 instead of 200 — paid checkout succeeded, subscription was never created. Silent data loss for every paying user.

**Routes fixed:**

| Route | Pre-fix | Post-fix |
|-------|---------|----------|
| `/scorecard` | 307 | 200 |
| `/pricing` | 307 | 200 |
| `/bill/*` | 307 | 200 |
| `/state/*` | 307 | 200 |
| `POST /api/webhooks/stripe` | 307 | 400 (reached handler) |
| `POST /api/revalidate` | 307 | 401 (reached handler) |
| `/api/bff/*` | 307 | 401 (properly gated) |
| `/dashboard` | 200 (un-authable) | 307 (correctly protected) |

**Fix:** Explicit `PUBLIC_ROUTES` + `PUBLIC_PREFIXES` allowlist. Protected routes: `/dashboard`, `/account`, `/api/me`, `/api/checkout`, `/api/portal`. Verified all 11 affected endpoints live.

### 2. Pipeline systemd Timer (Doppler in Non-Login Shell)
**Severity:** Launch-blocking — **Fixed, verified (47 CA bills, 0 failures)**

systemd timers run without Doppler context. Script called `doppler secrets get` → silent failure. Database had zero live bills.

**Fix:** `.env`-sourcing version. Python already had `python-dotenv` support.

---

## 🟡 Production Gaps — Pushback / Acknowledgment / Fix Path

### G1: Missing CSP / XFO / CTO Headers

**Finding (both agree):** No Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, or Referrer-Policy headers.

**Pushback (GCU):** Vercel edge handles HSTS (verified), blocks source maps (403), handles DDoS. No user uploads, no iframe embedding, no third-party widgets. **This is defense-in-depth, not a vulnerability.**

**Acknowledgment (both):** CSP becomes necessary if user-generated content, embedded widgets, or ads are added. `frame-ancestors 'self'` trivially closes the clickjacking gap.

**Fix path (GCU):** Add to `next.config.ts` — 5-line headers config. See original audit for exact block.

**Priority:** Medium. Pre-launch for public announcement.

---

### G2: CORS Wildcard (`Access-Control-Allow-Origin: *`)

**Finding (GCU):** Vercel default edge config.

**Pushback (GCU):** API routes auth via bearer tokens + Stripe sigs, not cookies. Pipelines run server-side. Nothing to exfiltrate across origins. Cookie-based auth only flows through server components.

**Acknowledgment (GCU):** If session-cookie-authenticated GET endpoints are ever added, CORS + CSRF becomes necessary. Currently not a vector.

**Fix path:** Restrict to deployed origin in vercel.json, or leave — architecture makes it safe.

**Priority:** Low.

---

### G3: Alert Preferences — No Zod Input Validation

**Finding (GCU):** JSONB data stored without schema validation.

**Pushback (GCU):** `getUserId()` gates submission — authenticated users only. JSONB handles arbitrary JSON safely. Malformed data only corrupts the submitter's own row.

**Acknowledgment (GCU):** A frontend change that shuffles preference structure could silently write corrupt data that downstream readers can't parse. Good hygiene.

**Fix path (GCU):** 10-line Zod schema before the action body. See original audit for exact block.

**Priority:** Low. Safe in practice.

---

### G4: Dangling Subscription on User Delete

**Finding (GCU):** No cleanup path for Stripe subscriptions, auth sessions, preference rows on account deletion.

**Pushback (GCU):** No user-facing "delete account" action exists in the MVP. This isn't a live gap.

**Acknowledgment (GCU):** This becomes a problem the moment someone asks to delete. Orphaned subscriptions still ping Stripe for renewal.

**Fix path:** When adding account deletion (not yet planned), cancel Stripe sub, delete Neon Auth user, clean up preferences/watchlists.

**Priority:** Low. Only actionable when deletion is implemented.

---

### G5: Pipeline AI Classifier — False Negative Risk

**Finding (both agree):** The LLM-assisted bill classification uses keyword + pattern matching on bill titles/summaries. It's bounded classification, not legal analysis. False positives are acceptable. False negatives are the real risk — bills that restructure education code without saying "homeschool."

**Pushback (GCU):** Current approach is good enough for MVP. The pipeline filters 200K+ annual bills down to a manageable signal. False positives are cheap (flag + user dismisses).

**Acknowledgment (both agree):** Two real risks:
1. **False negatives** — a bill that restructures Title 20 (education) without the word "homeschool" could affect homeschoolers silently
2. **LLM drift** — model swap changes classification behavior without notice

**Fix path (GCU):**
- Near-term: Add pipeline audit table logging every classification + model version. Add "report missed bill" button on frontend.
- Medium-term: Add secondary pass using LegiScan's subject tags and bill topic analysis (no LLM dependency). Cross-reference with keyword results.

**Priority:** Medium — address before user base grows.

---

### G6: Opaque State Scoring Methodology

**Finding (both agree):** Scorecard shows 0–100 scores with 4 sub-categories but no published methodology explaining weights or rubric.

**Pushback (GCU):** HSLDA-aligned, matches established consensus (Idaho/Texas permissive, NY restrictive). This is a documentation task, not a correctness issue.

**Acknowledgment (both agree):** Without a published methodology, users can't evaluate fairness. If a score seems wrong, there's no way to verify.

**Fix path (GCU):** Add `/methodology` page with:
- 4 sub-categories and what they measure
- Weight per category (e.g., Reporting 30%, Testing 25%, Curriculum 25%, Teacher 20%)
- Rubric for each score (what earns 0/25 vs 25/25)
- Last reviewed date
- Citations linked to statutes/DOE pages

**Priority:** Medium. Trust-build before paid users ask.

---

### G7: "30,000+ Bills Analyzed" — Marketing Claim

**Finding (both agree):** Unverifiable. Conflates "API queries" with "unique bills analyzed."

**Pushback (GCU):** The LegiScan sync does accumulate API calls across 34 states every 4h. After a few weeks, 30K is directionally real — each sync processes hundreds of bill updates depending on session activity. But it conflates two different metrics.

**Jack's take (stronger):** This claim doesn't add trust — it raises questions. Presenting 30K as impressive for an API-based tracker is odd.

**Fix path (both agree):** Either remove it, or rephrase to something specific and verifiable: "Tracking [live count] bills across 50 states from the 2025–2026 session." Show a live counter on the dashboard.

**Execution vehicle:** The marketing playbook's TEMPLATE D (blog post outline) and Pinterest strategy (TEMPLATE C) are the content engine that will produce the live-verifiable claims and SEO authority needed to replace these placeholder numbers. See `marketing/Homeschool_Compass_Agent_Playbook.txt`.

**Priority:** Low — copy change.

---

### G8: "2,400+ Families" — Marketing Claim

**Finding (both agree):** Unverifiable externally.

**Pushback (GCU):** If Neon Auth shows 2,400+ registered users, the claim is literally true. The gap is presentability, not integrity — there's no publicly visible evidence.

**Jack's take (stronger):** Without testimonials, case studies, or reviews, this undermines credibility. It reads as a vanity metric.

**Fix path (both agree):**
1. Remove until independent validation exists, OR
2. Replace with a verifiable real-time counter from the database, OR
3. Replace with qualitative testimonials if any exist

**Execution vehicle:** The playbook's TEMPLATE F (testimonial request) and email drip sequence (Automation Workflow 1) are the mechanisms for collecting and surfacing real user stories. See `marketing/Homeschool_Compass_Agent_Playbook.txt`.

**Priority:** Low — copy change.

---

### G9: "Accuracy Guarantee" — Legally Dubious

**Finding (both agree):** "If we miss a bill that affects your state, your next year is free." Terms undefined — what counts as "affects your state"? How is "missed" defined? Who adjudicates?

**Pushback (GCU):** For an MVP, this is marketing copy to signal confidence. Expected claim volume near zero — a keyword-based classifier pulling from LegiScan's comprehensive database has high coverage. It translates to "we're confident."

**Acknowledgment (both agree):** If someone actually files a claim, there's no refund process, no escalation path, no defined terms. Paper tiger.

**Fix path (both agree):**
1. Formalize: "If you identify a bill affecting homeschooling in your state that we did not track, email [support] with [details]. We'll review within 5 business days and, if confirmed, extend your subscription by 12 months."
2. Or remove until legal infrastructure exists.

**Execution vehicle:** The playbook's decision trees (Part 6) and escalation templates provide the operational framework for handling guarantee claims. See `marketing/Homeschool_Compass_Agent_Playbook.txt`.

**Priority:** Medium — consumer protection exposure.

---

## 🎨 Product & UX — Jack's Review, GCU Commentary

### Visual Design — What's Broken

**Jack's findings (agreed by GCU):**

| Issue | Why It Hurts |
|-------|-------------|
| Hero is text dump, not a visual hook | Landing page reads like a markdown file |
| Scorecard is a wall of text | 50 states in a list, no scanning/filtering/visual cues |
| State pages are data-poor | CA/NY show 4 numbers and a sentence — no actionable info |
| No visual identity | No logo, no color system, no typography hierarchy |
| Trust signals are text-only | "2,400+ families" is just words, no faces, no proof |

**GCU addition:** The `Requirements`, `ESA Program`, `Legal Precedent` tabs on state pages appear to be empty or placeholder — they render with no content when clicked (confirmed live).

### Visual Design — Recommended Fixes (Jack)

**A. Landing Page — Add a Visual Hook**
- Replace hero text with color-coded US map showing A–F grades
- Live alert card as an actual notification card (timestamp, state badge, timestamp)
- Scorecard preview as a 5-state teaser with badges + "See all 50 states →"

**B. Scorecard — Make It Scannable**
- Filters: grade, ESA availability, search by name
- Sort toggle: freedom score high/low, alphabetical
- Visual cards: state abbreviation badge, colored grade letter, score bar (0–100), 4 mini-bars for sub-categories, "View requirements →"
- Sticky header: "National average: 76/100 | 13 A states | 20 ESA programs"

**C. State Pages — Make Them Actionable**
A parent needs to know:
- What do I file? How? Where (link)?
- What records do I keep?
- What subjects are required?
- Do I need to test my kids?
- Am I qualified to teach?
- When's the deadline?
- What happens if I miss it?

Structure as a checklist, not a paragraph. Each requirement = checkbox icon + one-line summary + "Expand for details."

**GCU caveat:** The tabs infrastructure (Requirements/ESA/Legal Precedent) already exists in the DB schema and state JSON data. Wiring the content into the tabs is simpler than building a checklist from scratch — and the tabs give you a clear migration path toward checklists. Don't rebuild, repurpose.

**D. Color System**
- Green (#10B981): A-grade, success, "you're good"
- Yellow (#F59E0B): B-grade, warning, "pay attention"
- Orange (#F97316): C-grade, moderate concern
- Red (#EF4444): D/F-grade, danger, "action needed"
- Blue (#3B82F6): CTAs, primary actions
- Slate (#1E293B): text, headers
- Gray (#F1F5F9): backgrounds, cards

**GCU note:** Tailwind's built-in palette already maps to this. No custom CSS needed — just add `@apply text-green-500` / `bg-red-100` consistently.

---

### Conversion — Free-to-Paid Strategy

**Jack's core thesis (GCU agrees):** The free tier is too generous. Free users see the full scorecard AND full state pages AND unlimited bill search — nothing compels them to upgrade.

**Jack's recommended free tier:**
- Scorecard: full list, no restrictions ✅ (GCU agrees — this is the SEO/viral hook)
- State summary: grade + 4 scores + one-sentence description ✅ (GCU agrees)
- State detail pages: **3/month** → paywall on the 4th 🔥 (GCU agrees — creates the "I need more" moment)
- Bill search: title + status only, no summary/analysis ✅ (GCU agrees)
- Alerts: none — no email, no digest, nothing ✅ (GCU agrees)
- ESA information: none ✅ (GCU agrees)

**GCU pushback: 3 state views/month vs. 5 views/month**
At 3, a parent researching their own state + 2 neighboring states hits the wall immediately. That feels like a squeeze, not a graduated ceiling. **5 views/month** gives breathing room before the paywall — a parent researching "my state + potential move state + grandma's state where the kids spend summers" hits the wall at the right psychological moment. Worth A/B testing.

**Jack's recommended paid tier ($29/yr) — "Peace of Mind"**
- Unlimited state detail pages (checklists, deadlines, filing links)
- Bill alerts for your state (email on introduce/amend/sign)
- Compliance checklist: personalized, printable, with deadlines
- ESA program tracker (application windows, deadlines, eligible expenses)
- Historical bill archive

**GCU agrees.** The personal checklist is the killer feature — it's something no existing product does well. HSLDA has PDFs, but nothing dynamic or personalized.

**Jack's recommended ESA tier ($99/yr) — "Full Protection"**
- Multi-state alerts (up to 3 states — military families, move planners, state-line zones)
- SMS alerts (urgent bills)
- Webhook/API access (umbrella schools, co-ops, power users)
- Priority support (24h email)
- Annual compliance review (personalized email before filing deadline)

**GCU pushback — two items:**

1. **SMS alerts cost real money.** Twilio charges ~$0.0079/SMS. At scale (500 users getting 3 alerts/week = 78K messages/year = ~$616/year), it's manageable. But the pipeline needs a Twilio integration, a message queue, opt-in/opt-out compliance (TCPA), and budget monitoring. **SMS is not a $99-tier throw-in — it's a feature with ongoing operational cost.** Either price the tier at $129 to cover SMS overhead, or flag SMS as "coming soon" and ship the $99 tier without it.

2. **"Annual compliance review" doesn't scale at 2,400+ users** without hiring a human. If this is an automated email template ("Your state's filing deadline is approaching — here's your checklist") that's fine. If it implies personalized review, that's a labor cost that doesn't fit a $99 price point. **Name it "annual deadline reminder + personalized checklist" — same value, scalable.**

**GCU agrees** on the rest. $99 is negligible for ESA families spending thousands on education. Multi-state is critical for the military/relocation segment.

---

### Conversion Mechanics to Add

**GCU note:** The conversion mechanics below feed directly into the playbook's paid funnel. The playbook's email drip sequence (Automation Workflow 1, Part 4) and ad ops (Part 2, Weeks 5–12) are the execution layer. See `marketing/Homeschool_Compass_Agent_Playbook.txt` for the full 12-week loop.

**Jack's recommendations (GCU responses inline):**

1. **Paywall gates (soft, not hard)**
   - "You've viewed 3 state guides this month. Upgrade for unlimited." ✅ Agree
   - Bill pages: "Summary available for subscribers. Free users see title + status only." ✅ Strong agree — creates contrast
   - Don't block the scorecard. ✅ Strong agree — SEO + viral loop

2. **"Set Your State" flow**
   - First visit: "Which state do you homeschool in?" → Select → See grade → "See what you need to do in [State]" → Detail page → 3rd view = paywall
   - **GCU addition:** Save choice in localStorage so returning visitors skip the prompt. Also: add a "This isn't my state" link for people researching other states.

3. **Urgency triggers**
   - D/F state pages: "12 families in [State] missed their deadline last year. Get alerts."
   - Bill pages: "This bill introduced 3 days ago. 47 subscribers notified."
   - Landing page: "3 bills affecting homeschoolers introduced this week."
   - **GCU agrees.** These are cheap (compute only) and effective. Use live numbers from the database, not placeholders.

4. **Social proof**
   - Jack: Replace "2,400+ families" with real testimonials, or remove. ✅ Agree
   - **GCU addition:** If you remove it, you lose the number entirely. If you keep it, add a real-time counter from the auth DB. "2,456 families tracking homeschool legislation" with a live count is verifiable and trust-building. This requires: a lightweight `/api/count` endpoint, and a counter component. Total: ~30 lines of code.

5. **Free trial mechanics**
   - Jack: "14-day free trial, no credit card required. Ask for payment info at day 10."
   - **GCU pushback:** No-CC trials convert at 2–3× higher sign-up rates, but have 50% lower paid conversion than CC-required trials. This is a strategic tradeoff with no universally right answer. For an MVP with no brand trust, no-CC might be correct — but be aware you're trading trial users for paying users.

---

### Page-by-Page Recommendations

**Jack's recommendations + GCU notes:**

#### Landing Page (`/`)
| Jack's recommendation | GCU note |
|----------------------|----------|
| US map with color-coded grades + headline | Requires a map component. `react-simple-maps` or `nivo-geo`. ~1 day |
| "How it works" 3-column section | Simple. Tailwind grid, 3 cards with icons. ~2 hours |
| Live alert card as notification mockup | Add a real alert from DB, not a mockup. Show the most recent bill alert. ~30 min |
| Scorecard preview: 5-state teaser + CTA | Already have the data. Just repackage. ~1 hour |
| Pricing cards, highlight $29/yr | Already wired with Stripe. Just visual polish. ~2 hours |

#### Scorecard (`/scorecard`)
| Jack's recommendation | GCU note |
|----------------------|----------|
| Filters: grade, ESA, search | Client-side filter on the existing data. ~3 hours |
| Grid of cards (responsive) | CSS grid + Tailwind responsive classes. The data model supports this. ~4 hours |
| Each card: badge, grade, score bar, 4 mini-bars | The 4 sub-scores already exist in the DB. Mini-bar is a `w-[X]%` div. ~3 hours |
| Sticky summary bar | `position: sticky` + `bg-white/90`. ~30 min |

#### State Page (`/state/XX`)
| Jack's recommendation | GCU note |
|----------------------|----------|
| Compliance checklist (core value) | The Requirements tab exists but is empty. Wire real content from the state data JSON. ~4 hours |
| Active Bills section | Already wired via `getBillsForState()` — just surface it visually. ~2 hours |
| ESA Info section | DB has ESA data. Wire into the ESA tab. ~1 hour |
| CTA: "Get alerts for [State] → $29/yr" | Link to `/api/checkout` with state prefilled in metadata. ~30 min |

---

### Quick Wins — Priority Order

**Merged priority from both reviews:**

|| # | What | Est. effort | Who flagged | Impact |
||---|------|-------------|-------------|--------|
|| 1 | Restrict free tier: gate state detail pages at 3/month | 2h (middleware check) | Jack | Conversion |
|| 2 | State pages as actionable checklists | 4h (wire existing data into tabs) | Jack | Value |
|| 3 | Color-coded grade badges everywhere | 2h (Tailwind classes) | Both | Visual |
|| 4 | "Set your state" flow on landing page | 3h (localStorage + redirect) | Jack | Funnel |
|| 5 | Remove/rephrase dubious marketing claims | 30m (copy edit) | Both | Credibility |
|| 6 | Add CSP/XFO/CTO headers | 30m (next.config.ts) | GCU | Defense |
|| 7 | Publish /methodology page | 3h (documentation) | Both | Trust |
|| 8 | Add Zod validation for alert prefs | 30m (schema) | GCU | Hygiene |
|| 9 | Pipeline audit log table | 2h (schema + deploy) | GCU | Classification |
|| 10 | Live user counter on landing page | 30m (API + component) | Both | Social proof |
|| — | **Growth engine: deploy automated agent playbook** | **4h (one-time setup)** | **Jack** | **Acquisition** |

**Growth note:** The 10 quick wins above optimize the existing product. The playbook at `marketing/Homeschool_Compass_Agent_Playbook.txt` is a parallel workstream — it doesn't touch code and runs on a separate 12-week loop. It should start as soon as the marketing claims are cleaned up (item #5 above), independent of the code changes. Hand to a junior VA/agent with 15 min/week oversight.

---

### A/B Test Ideas (Jack + GCU)

| Test | Variant A | Variant B | Metric | GCU note |
|------|-----------|-----------|--------|----------|
| Pricing presentation | "$29/year" | "$2.42/month" | Click-through | Start with A — $29/yr is cleaner for the homeschool audience |
| CTA copy | "Get alerts" | "Protect your homeschool" | Sign-up rate | Run A (control) vs C (both feel right — test it) |
| Free trial | No card required | Card required | Trial → paid rate | Run after you have data on current conversion baseline |
| Paywall threshold | 3 state views/month | 5 state views/month | Upgrade rate | See GCU pushback above — recommend testing 3 vs 5 |
| Landing page hero | US map | Alert preview card | Time-on-page, scroll depth | Map wins if you do it well. Static mockup first, interactive later |

---

## ✅ What's Right — Things That Survived Both Audits

| Component | Both agree | Notes |
|-----------|-----------|-------|
| General state ranking | ✅ | HSLDA-aligned: ID/AK/MT = permissive, NY = restrictive |
| LegiScan + OpenStates as data sources | ✅ | Legitimate legislative APIs, industry standard |
| The core concept | ✅ | Automated homeschool regulation tracking is a valid gap in the market |
| Stripe integration | ✅ | Checkout, webhook + idempotency, Customer Portal all correct |
| Pipeline reliability (post-fix) | ✅ | Verified: 47 CA bills, 0 failures |
| Auth architecture | ✅ | HttpOnly cookies, server-side validation, session refresh active |
| Drizzle schema + 10 tables | ✅ | Watchlist, alert prefs, subscriptions — clean migrations |
| No security vulnerabilities in 14 probe vectors | ✅ | All probed, none critical |
| Pricing ($29/$99) | ✅ | Reasonable anchors. Low enough for impulse, high enough for real product |
| Proxy middleware fix | ✅ | 11 endpoints verified live |
| ISR + on-demand revalidation | ✅ | Working architecture for a data-changing product |

---

## 🎯 Bottom Line

**Security verdict (GCU):** Ships clean. Two launch-blocking bugs found and fixed. Nine yellow flags remain — none are safety issues, all have documented fix paths.

**Product verdict (Jack):** Strong concept, weak execution on conversion. The product has the data but doesn't present it in a way that compels upgrade. The free tier is too generous, the pages are too text-heavy, and the marketing claims raise more questions than they answer.

**Growth vehicle:** The [Automated Growth Agent Playbook](../marketing/Homeschool_Compass_Agent_Playbook.txt) (in `marketing/`) is the execution engine for post-launch organic + paid acquisition. It covers Facebook Group engagement, Pinterest content farming, email drip sequences, blog engine, and a 12-week loop for a junior VA/agent to run independently. This audit's conversion recommendations (state detail gating, "Set Your State" flow, urgency triggers, social proof) feed directly into the playbook's paid funnel.

**Combined priority:**
1. **Fix the copy** (30K bills, 2.4K families, accuracy guarantee) — 30 minutes, highest ROI per hour
2. **Gate state detail pages** — 2 hours, creates upgrade pressure
3. **Publish methodology** — 3 hours, builds trust
4. **Checklist-ify state pages** — 4 hours, fixes the core value prop
5. **CSP headers** — 30 minutes, defense-in-depth you want before public launch

**The product sells if it answers one question:** "What do I need to do to homeschool legally in my state, and what's changing?" Right now it answers "how free is my state?" — interesting but not compelling. The checklist pages make it compelling.

---

## Appendices

### A. Probe Results Summary

| # | Vector | Result | Severity |
|---|--------|--------|----------|
| 1 | Unauth dashboard | ✅ 307 | None |
| 2 | IDOR watchlist | ✅ Scoped to userId | None |
| 3 | Rate limit revalidation | ✅ 429 after 5/min | None |
| 4 | Stripe webhook replay | ✅ Idempotent via ON CONFLICT | None |
| 5 | SQL injection via bill ID | ✅ Parameterized query | None |
| 6 | Source map exposure | ✅ 403 | None |
| 7 | Path traversal | ✅ 404 | None |
| 8 | Stripe metadata tamper | ✅ Server-side price resolution | None |
| 9 | Cross-user BFF access | ✅ 401 without token | None |
| 10 | Mass assignment prefs | 🟡 Auth gated, no Zod | Low |
| 11 | Dangling subscription | 🟡 No delete-account feature | Low |
| 12 | CORS wildcard | 🟡 Architecture safe | Low |
| 13 | Missing CSP/XFO/CTO | 🟡 Defense-in-depth | Low |
| 14 | Build ID disclosure | ✅ Not exposed | None |

### B. Live Verification Checklist

| Check | Status |
|-------|--------|
| Landing page | ✅ HSTS active |
| Scorecard | ✅ 200, 50 states A–F |
| State page (CA) | ✅ 200, tabs present |
| Bill page | ✅ 200 |
| Pricing | ✅ 200, 2 plans |
| ESA guide | ✅ 200 |
| Auth page | ✅ 200 |
| Dashboard | ✅ 307 (protected) |
| Webhook endpoint | ✅ 400 (reached handler) |
| Revalidation | ✅ 401 (reached handler) |
| BFF routes | ✅ 401 (properly gated) |
| Pipeline sync | ✅ 47 CA bills, 0 failures |

### C. Commit Log

```
0f185f2 fix: proxy middleware blocking all public pages + API routes
8b5b0f6 fix: resolve 19 TypeScript errors
2213451 chore: vercel.json with ENABLE_STRIPE=true
5c9ee90 feat: Phase 1 — full SaaS
```

### D. Attack Surface Notes (Non-Standard Vectors)

**The site is statically rendered via Next.js ISR.** This means:
- No server-side state to leak
- No SSR injection vectors
- API routes are minimal and scoped
- The only write surface is:
  - Webhook endpoint (Stripe signature verified)
  - Revalidation endpoint (Bearer token gated)
  - Server actions (session-gated)

**The weakest point in the system is not the code — it's the marketing copy.** Overclaiming to signal confidence when you don't need to.
