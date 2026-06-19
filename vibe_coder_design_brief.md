# Vibe Coder Design Brief: Homeschool Regulation Tracker
# Frontend Build — Full Component Spec

## 1. Design Philosophy & Positioning

**Core thesis:** This is not a blog. This is not a SaaS dashboard. This is a regulatory intelligence platform that happens to serve homeschool families.

The visual language must communicate: "A team of policy analysts and engineers built this, and they treat your compliance as seriously as the IRS treats your taxes — except they actually want you to succeed."

**Authority + Clarity + Warmth.** Not authority + cool. Not authority + corporate sterile. The warmth matters because the user is making a decision about their child's future. Coldness reads as indifferent. Warmth reads as "we care about getting this right."

**Bloomberg Terminal → Civic Dashboard.** The Bloomberg instinct (dense data, no fluff) is correct, but the execution needs to feel like a well-designed government service portal crossed with a premium financial tool. Think: UK Gov.uk meets Morningstar meets a really good state DOE website.

---

## 2. Color Palette

### Primary
- **Navy Authority:** `#0A2540` — Headers, primary text, trust anchors. Not black. Navy signals institutional knowledge without the harshness of pure black.
- **Warm White:** `#FDFCF8` — Background. Not pure white. Slightly warm to reduce eye strain and signal "this is for humans, not robots."
- **Soft Cream:** `#F5F0E8` — Card backgrounds, alternating sections. Creates depth without shadows.

### Accent
- **Alert Amber:** `#D97706` — Warnings, status changes, "attention needed" badges. Not red. Red = panic. Amber = "this matters, stay informed."
- **Safe Green:** `#059669` — Positive changes, compliant status, ESA active. Muted, not neon.
- **Action Blue:** `#2563EB` — CTAs, links, interactive elements. Standard enough to feel familiar, saturated enough to feel intentional.

### Semantic
- **Regulation Increase:** `#DC2626` (muted red, used sparingly)
- **Regulation Decrease:** `#059669` (safe green)
- **Neutral/No Change:** `#6B7280` (warm gray)
- **High Priority Alert:** `#B91C1C` background + white text (only for enacted bills that increase burden)

### Text
- **Primary Text:** `#1E293B` (slate-800, not pure black)
- **Secondary Text:** `#64748B` (slate-500)
- **Tertiary/Meta:** `#94A3B8` (slate-400)

---

## 3. Typography

### Headings
- **Font:** `Inter` or `Geist` (variable font, weights 400-700)
- **H1:** 48px / 700 weight / -0.02em letter-spacing / line-height 1.1
- **H2:** 32px / 600 weight / -0.01em / line-height 1.2
- **H3:** 24px / 600 weight / 0 / line-height 1.3
- **H4:** 18px / 600 weight / 0 / line-height 1.4

### Body
- **Font:** `Inter` or `Source Sans Pro` (system fallback: -apple-system, BlinkMacSystemFont)
- **Body Large:** 18px / 400 weight / line-height 1.6
- **Body:** 16px / 400 weight / line-height 1.6
- **Body Small:** 14px / 400 weight / line-height 1.5
- **Caption:** 12px / 500 weight / uppercase / letter-spacing 0.05em / color: tertiary

### Monospace (for data)
- **Font:** `JetBrains Mono` or `SF Mono`
- **Usage:** Bill numbers, statute citations, scores, dates, hashes
- **Size:** 13px / 400 weight / line-height 1.4

---

## 4. Layout System

### Grid
- **Max Width:** 1280px centered
- **Breakpoints:** Mobile 360px, Tablet 768px, Desktop 1024px, Wide 1280px+
- **Gutter:** 24px (desktop), 16px (mobile)
- **Section Padding:** 80px vertical (desktop), 48px (mobile)

### Spacing Scale
- 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 96px
- Use this scale religiously. No arbitrary values.

### Borders & Radii
- **Cards:** 8px radius, 1px border `#E2E8F0`
- **Buttons:** 6px radius
- **Tags/Badges:** 4px radius (pill shape for status badges: 999px)
- **Dividers:** 1px `#E2E8F0`, never drop shadows for separation

---

## 5. Component Specifications

### 5.1 Navigation

**Desktop:**
- Fixed top, height 64px, background: warm white with 1px bottom border `#E2E8F0`
- Left: Logo (see 5.1.1) + "Regulation Tracker" in caption style, uppercase, slate-400
- Center: Links — Dashboard, Scorecard, Alerts, ESA Guide, About
  - Active link: navy text + 2px bottom border navy
  - Hover: slate-800 text, no underline animation
- Right: "Sign In" (text button) + "Start Tracking" (solid navy button, 6px radius, 14px font)

**Mobile:**
- Hamburger menu, slide-in drawer from right, 280px width, cream background
- Logo + tagline at top of drawer

**5.1.1 Logo:**
- No generic house icon. No graduation cap.
- Concept: Abstract shield or document silhouette with a checkmark. Or a stylized state boundary outline.
- Monochrome navy. No gradients.
- Text: "Tangle Trove" in Inter 600, 16px. Tagline "Regulation Tracker" in caption style below or beside.

### 5.2 Hero Section (Homepage)

**What to avoid:**
- NO stock photos of moms at kitchen tables
- NO smiling children with laptops
- NO abstract illustrations of "learning"
- NO video backgrounds
- NO gradient overlays on photos

**What to build:**
- Background: warm white
- Left column (60%): 
  - H1: "Know exactly what your state requires — before the law changes."
  - Body large: "Track homeschool legislation across all 50 states. Get instant alerts when bills affecting your family are introduced, amended, or signed into law."
  - CTA row: Primary button "Start Free Tracking" (navy, 16px, padding 16px 32px) + Secondary link "See the Scorecard" (text with arrow)
- Right column (40%):
  - A live-updating "Regulation Alert" card mockup (see 5.6 Alert Card, but larger)
  - Show a real bill: "CA SB 1234 — Portfolio Review Requirement Added"
  - Status: "Passed Senate | Awaiting Assembly Vote"
  - Impact badge: "Regulation Increase" in amber
  - This is the "product in action" — not a photo, the actual UI

### 5.3 Trust Bar (Below Hero)

- Background: soft cream
- Height: ~80px
- Content: 4-5 trust signals in a row, evenly spaced
  - "50 States Monitored" + small map icon
  - "Real-Time Legislative Alerts" + bell icon
  - "HSLDA-Aligned Categorization" + checkmark icon
  - "30,000+ Bills Analyzed" + document icon
  - "ESA Compliance Tracking" + dollar icon
- Icons: 20px, slate-400. Text: caption style, slate-500. No hover effects.

### 5.4 Scorecard Preview Section

- Background: warm white
- H2: "The 2026 Homeschool Freedom Scorecard"
- Subhead: "How does your state rank on regulation burden, testing mandates, and curriculum freedom?"
- Layout: Horizontal scroll on mobile, grid on desktop
- Cards: 50 state cards, each showing:
  - State abbreviation (monospace, 24px, bold)
  - State name (body small)
  - Grade badge (pill, grade color background, white text)
  - Score (monospace, 32px, bold)
  - Mini bar: 4 segments (reporting, testing, curriculum, teacher) colored by score
- Hover: Card lifts 2px (subtle shadow appears), border darkens to slate-300
- Click: Expands to state detail modal (see 5.10)
- Include a "View Full Scorecard" CTA at bottom

### 5.5 Bill Feed / Dashboard

This is the core product surface. Dense, scannable, actionable.

**Layout:**
- Left sidebar (280px, fixed on desktop): Filters
  - State multi-select (checkbox list, scrollable, search at top)
  - Regulation impact: "Any", "Increases Burden", "Decreases Burden", "Neutral"
  - Status: "Introduced", "In Committee", "Passed Chamber", "Signed", "Enacted"
  - ESA-related toggle
  - Date range: "Last 7 days", "Last 30 days", "This session", "All time"
  - Saved filters (for logged-in users)
- Main area: Bill cards in a vertical list

**Bill Card:**
- Background: white, 1px border, 8px radius
- Padding: 24px
- Layout:
  - Top row: State badge (pill, navy bg, white text) + Bill number (monospace, 14px, action blue) + Date (caption style)
  - Title: H4 style, navy, clickable
  - Status bar: Horizontal timeline showing bill progress
    - Dots: Introduced → Committee → Chamber → Other Chamber → Governor → Law
    - Active step: filled circle, navy
    - Completed steps: filled circle, safe green
    - Future steps: empty circle, slate-300
    - Labels below each dot in caption style
  - Impact row: 
    - If regulation increase: amber badge "Increases Regulation" + brief text: "Adds annual portfolio review requirement"
    - If decrease: green badge "Decreases Regulation"
    - If neutral: gray badge "Monitoring"
  - Action row: "View Full Text" (text link) + "Track This Bill" (outline button) + "Share" (icon button)
- Hover: Border darkens, subtle shadow

**Empty State:**
- Centered illustration (simple line art, not stock photo)
- "No bills match your filters"
- "Try broadening your search or check back tomorrow — we scan for new bills every 4 hours."

### 5.6 Alert Card (Critical Component)

Used in hero, dashboard, and email notifications.

- Background: white
- Left border: 4px solid, color matches severity
  - Critical: regulation increase + signed/enacted = `#B91C1C`
  - Warning: regulation decrease or passed chamber = `#D97706`
  - Info: new bill or monitoring = `#2563EB`
- Padding: 20px
- Content:
  - Severity badge (pill, left border color bg, white text)
  - Bill reference: "CA SB 1234" (monospace, action blue link)
  - Title: "Adds Annual Portfolio Review Requirement"
  - Delta summary: "Changes from: No review required → Annual review by certified teacher" (this is the key value prop)
  - Action required: "If enacted, families must submit portfolios by July 2027."
  - CTA: "Read Full Analysis" (solid button) + "Add to Watchlist" (outline)

### 5.7 Pricing Section

**What to avoid:**
- NO 3-column card layout with "Basic / Pro / Enterprise" headers
- NO checkmark lists that all look identical
- NO "Most Popular" ribbon
- NO toggle for monthly/annual with a sliding pill

**What to build:**
- Background: navy `#0A2540`
- Text: warm white and cream
- H2: "Choose Your Level of Protection"
- Layout: Two options, side by side, clearly differentiated

**Option 1: "Scorecard Access" (Free)**
- Price: "Free Forever" in H2 style
- Description: "Browse the 50-state scorecard, read bill summaries, and see basic status updates."
- Features (checkmarks in safe green):
  - Full scorecard rankings
  - Bill search and filtering
  - Public bill summaries
  - Weekly digest email
- CTA: "Get Free Access" (outline button, cream border, cream text)

**Option 2: "Regulation Tracker" (Paid)**
- Price: "$29/year" in H2 style, with "or $99/year for ESA Compliance" below
- Description: "Real-time alerts, detailed analysis, and compliance checklists tailored to your state."
- Features:
  - Everything in Scorecard, plus:
  - Instant bill alerts (SMS, email, webhook)
  - Detailed compliance checklists per state
  - ESA program tracking and deadline reminders
  - Historical bill archive
  - API access (B2B tier)
- CTA: "Start Tracking — $29/year" (solid button, safe green bg, navy text)
- Below CTA: "14-day free trial. Cancel anytime." in caption style, cream color

**Trust signals below pricing:**
- "Used by 2,400+ homeschool families"
- "Trusted by umbrella schools in 12 states"
- Payment icons: Stripe, Apple Pay, Google Pay (small, monochrome)

### 5.8 About / Trust Page

This section is non-negotiable. The audience needs to know who built this and why they should trust them.

- Background: soft cream
- H2: "Why We Built This"
- Content blocks:
  1. "The Problem" — Brief paragraph about how homeschool families discover regulation changes too late, often after filing deadlines pass.
  2. "Our Approach" — Explain the dual-source API ingestion, Gemini analysis, and HSLDA-aligned categorization. Use technical language here — it signals competence. "We process 30,000+ API queries monthly across LegiScan and OpenStates, with change-hash detection for incremental sync."
  3. "Who We Are" — Photos (real, not stock) of the team. Names, roles, and one-line bios. Include a homeschool parent on the team if possible.
  4. "Data Sources" — Logos of LegiScan, OpenStates, HSLDA (with permission). Link to methodology.
  5. "Accuracy Guarantee" — "If we miss a bill that affects your state, your next year is free." This is the trust anchor.

### 5.9 State Detail Modal / Page

Triggered from scorecard or bill feed.

- Header: State name + grade badge + overall score
- Tabs: Overview | Current Bills | Requirements | ESA Program | Legal Precedent
- **Overview Tab:**
  - 4 metric cards: Reporting Burden, Testing Mandate, Curriculum Freedom, Teacher Qualification
  - Each: score (0-100), progress bar, brief explanation
  - Regulation level badge: "No Notice" / "Low Regulation" / "Moderate" / "High"
- **Current Bills Tab:**
  - Filtered bill feed for this state only
- **Requirements Tab:**
  - Checklist format: "What you must do"
  - Each item: requirement name, deadline, link to official form, status (compliant / pending / not applicable)
  - Source citations: "Per CA Ed Code §48222" (monospace, action blue link)
- **ESA Program Tab:**
  - If active: program name, max award, eligibility, required documentation, deadlines
  - If inactive: "No ESA program in [State]. Track bills that could create one."
- **Legal Precedent Tab:**
  - Case law table: Case name, citation, decision date, impact summary

### 5.10 Footer

- Background: navy `#0A2540`
- 4 columns:
  1. Logo + one-line description + social icons (minimal)
  2. Product: Dashboard, Scorecard, Alerts, ESA Guide, API Docs
  3. Resources: Methodology, Data Sources, HSLDA Partnership, Blog
  4. Legal: Privacy, Terms, Disclaimer ("This is not legal advice. Consult an attorney for your situation.")
- Bottom bar: "© 2026 The Tangle Trove. Built with legislative data from LegiScan and OpenStates."

---

## 6. Interaction Specifications

### Hover States
- Buttons: darken 10% (no scale transform)
- Cards: border darkens, 0 2px 8px rgba(0,0,0,0.04) shadow appears
- Links: underline appears (1px, action blue), no color change
- Table rows: background shifts to soft cream

### Loading States
- Skeleton screens for bill feed (3-5 placeholder cards)
- Spinner: simple rotating circle, navy, 24px
- No "Loading..." text — skeletons communicate state silently

### Empty States
- Always explain WHY it's empty and WHAT to do next
- Example: "No alerts yet. Add your state to your watchlist and we'll notify you when relevant bills are introduced."
- Include a CTA: "Browse All Bills" or "Set Up Alerts"

### Animations
- **Page transitions:** None. Instant. This is a tool, not a marketing site.
- **Card entrance:** Fade in + translateY(8px → 0), 200ms, ease-out. Stagger 50ms per card.
- **Alert banner:** Slide down from top, 300ms. Dismiss with X.
- **Modal:** Fade in backdrop (rgba(0,0,0,0.3)), scale modal from 0.95 → 1.0, 200ms.

### Mobile Behavior
- Scorecard: Horizontal scroll with snap points
- Bill feed: Full width cards, filters in bottom sheet
- Alert cards: Stack vertically, full width
- Navigation: Bottom tab bar (4 items: Dashboard, Scorecard, Alerts, Menu)

---

## 7. What to Avoid (Anti-Patterns)

| Anti-Pattern | Why It Kills Conversion | What To Do Instead |
|-------------|------------------------|-------------------|
| Stock photos of families | Signals "generic blog," undermines authority | Use UI mockups, data visualizations, or no images |
| Dark mode default | Mismatch with audience (75-80% female, planning-oriented) | Light mode default, optional dark mode |
| 3-column pricing cards | Template fatigue, no differentiation | Two clear options, narrative layout |
| "Sign up for our newsletter" as primary CTA | Weak commitment, no value signal | "Start Tracking" or "Get Free Scorecard" |
| Generic testimonials ("This changed my life!") | Unverifiable, feels fake | Specific quotes with names, states, and bill references |
| No "About" or team section | Anonymous = untrustworthy for legal compliance | Real photos, real names, real methodology |
| Auto-playing anything | Violates user control, increases bounce | Nothing auto-plays |
| Cookie consent banner that blocks content | Friction on first visit | Minimal, bottom-aligned, dismissible |
| Social proof counters without context | "10,000 users" is meaningless | "2,400 families tracking in 34 states" |
| Legal disclaimer hidden in footer | Feels evasive | Prominent but tasteful: "Not legal advice" near pricing and in footer |

---

## 8. Performance Requirements

- **First Contentful Paint:** < 1.5s on 4G
- **Largest Contentful Paint:** < 2.5s
- **Cumulative Layout Shift:** < 0.1
- **Time to Interactive:** < 3.5s
- **Mobile:** All interactions must work smoothly on iPhone SE (375px width)
- **Accessibility:** WCAG 2.1 AA minimum. All charts need alt text or data tables.

---

## 9. Tech Stack Recommendation

- **Framework:** Next.js 14+ (App Router) or Astro + React islands
- **Styling:** Tailwind CSS (matches the spacing scale and color system perfectly)
- **Components:** shadcn/ui base, heavily customized
- **Charts:** Recharts or Tremor (for scorecard visualizations)
- **Data:** Server-side rendering for bill feeds (SEO + performance)
- **State:** Zustand or Jotai (lightweight)
- **API:** REST endpoints wrapping the Python pipeline

---

## 10. Copy Voice & Tone

**Voice:** Informed, direct, calm, precise.

**Tone rules:**
- No exclamation points. Ever.
- No "empowering" language. No "unlock your potential."
- Use active voice: "This bill requires" not "Families may be required to"
- Quantify when possible: "180 instructional hours" not "sufficient hours"
- Cite sources: "Per CA Ed Code §48222" not "According to California law"
- For alerts: "Action required by [date]" not "Don't forget to..."

**Example transformation:**
- ❌ "Stay on top of homeschool laws so you can focus on what matters most — your kids!"
- ✅ "Track regulation changes before they affect your filing deadline."

---

## 11. Assets Needed

| Asset | Description | Priority |
|-------|-------------|----------|
| Logo (SVG) | Shield/document + checkmark, monochrome navy | P0 |
| Favicon | Simplified logo mark | P0 |
| OG Image | 1200x630, scorecard preview + logo + tagline | P1 |
| State boundary silhouettes | 50 state outlines, SVG, monochrome | P1 |
| Icon set | Lucide icons preferred: FileText, Bell, Map, Shield, CheckCircle, AlertTriangle, DollarSign, BookOpen, Gavel, Calendar | P0 |
| Team photos | Real photos, consistent background, 400x400 | P2 |
| Data source logos | LegiScan, OpenStates, HSLDA (with permission) | P2 |

---

## 12. Success Metrics (Design)

- Time to first alert setup: < 60 seconds
- Scorecard share rate: > 5% of visitors
- Mobile bounce rate: < 40%
- Pricing page → trial start: > 8%
- "About" page view rate: > 15% of unique visitors

---

Build this as a single-page application with the following routes:
- `/` — Homepage (hero + trust bar + scorecard preview + pricing + about)
- `/dashboard` — Bill feed with filters (requires auth)
- `/scorecard` — Full 50-state scorecard
- `/state/[code]` — State detail page
- `/bill/[id]` — Individual bill detail
- `/pricing` — Pricing page
- `/about` — Trust page
- `/esa` — ESA compliance guide
