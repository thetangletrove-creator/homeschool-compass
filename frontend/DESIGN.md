---
name: Homeschool Compass
description: "Armor for the funded homeschool — regulatory intelligence and compliance tools for ESA families"
colors:
  primary: "#0a2540"
  neutral-bg: "#fdfcf8"
  neutral-surface: "#ffffff"
  neutral-cream: "#f5f0e8"
  accent-amber: "#d97706"
  accent-blue: "#2563eb"
  safe-green: "#059669"
  danger-red: "#dc2626"
  critical-red: "#b91c1c"
  muted-slate: "#94a3b8"
  muted-foreground: "#64748b"
  border-light: "#e2e8f0"
  text-primary: "#1e293b"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  heading:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 3vw, 1.75rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist Mono, JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.05em"
    textTransform: "uppercase"
rounded:
  sm: "0.3rem"
  md: "0.4rem"
  lg: "0.5rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "2rem"
  xl: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1.5rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    borderColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1.5rem"
  card-default:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input-field:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-primary}"
    borderColor: "{colors.border-light}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
---

# Design System: Homeschool Compass

## 1. Overview

**Creative North Star: "The Protective Compass"**

Homeschool Compass is an operational tool for an anxious, high-stakes job — protecting a family's education funding against bureaucratic complexity and regulatory change. The visual system projects **calm authority**, not alarmism. Every design decision serves the conviction that compliance paperwork, done well, is protection.

The palette is restrained (deep navy, off-white, one amber accent) to communicate trustworthiness and seriousness. Typography is clean and modern (Geist) with monospace used intentionally for regulatory identifiers. Cards and surfaces stay flat with soft corners — no shadows, no glassmorphism, no decorative effects. The system rejects every visual trope of both government websites and startup landing pages.

**Key Characteristics:**
- Calm, authoritative, protective — never panic-inducing
- Data-dense but navigable — the user's anxiety is reduced by clarity, not hidden
- Restrained palette with one meaningful accent (amber for alerts, action items)
- Flat surfaces with tonal layering — no decorative shadows or gradients
- Typographic hierarchy carries the weight — font scale and weight do the work that colors would do in a less confident system
- Feels like something a caseworker would take seriously when printed

## 2. Colors

The palette is restrained by design — three brand colors, three semantic colors, and a muted neutral.

### Primary
- **Deep Navy** (#0a2540 / oklch(22% 0.04 265)): Main brand color for nav, headings, primary buttons, and footer backgrounds. Communicates trust, stability, and seriousness.

### Accent
- **Warm Amber** (#d97706 / oklch(65% 0.16 70)): Exclusive accent for alerts, action-required flags, deadline markers, and pricing highlights. Used sparingly — its rarity is its power.
- **Action Blue** (#2563eb / oklch(53% 0.18 260)): Interactive elements only — links, secondary CTA buttons, focus rings. Separate from amber because interaction and warning are different jobs.

### Neutral
- **Warm Off-White** (#fdfcf8): Body background. Slightly warmer than pure white for reading comfort. Lightest tonal surface.
- **Cream** (#f5f0e8): Sectional background — hero, cards, callouts. One step darker than body.
- **White** (#ffffff): Card backgrounds, input fields, modals. Highest surface elevation in the tonal system.
- **Slate Muted** (#94a3b8 / #64748b): Secondary text, labels, footnotes, placeholder text.
- **Border Light** (#e2e8f0): Dividers, input borders, card outlines.

### Semantic
- **Safe Green** (#059669): Decreasing regulation, good news, compliance pass, positive trends.
- **Danger Red** (#dc2626): Increasing regulation, action required, deadlines missed.
- **Critical Red** (#b91c1c): Severe regulatory threats, urgent alerts.
- **Dark Ink** (#1e293b): Primary body text — high contrast against off-white backgrounds.

### Named Rules
**The One Voice Rule.** Amber appears on no more than 5% of any given screen. Its scarcity makes each appearance meaningful — a deadline, an alert, a pricing highlight. If amber is everywhere, nothing is urgent.

**The Flat-By-Default Rule.** No drop shadows on cards or containers. Depth is communicated through tonal layering (white card on cream section on off-white page). Shadows are reserved for interactive states only (button hover, focus ring).

## 3. Typography

**Display + Body Font:** Geist (system-ui, sans-serif fallback)
**Label/Mono Font:** JetBrains Mono (monospace fallback)

**Character:** Clean, modern, utilitarian without feeling cold. Geist is a geometric sans-serif that maintains readability at small sizes — important for the data-dense bill and compliance pages. The single-family approach (all weights from one typeface) creates a controlled, disciplined rhythm. Monospace is reserved for bill numbers, regulatory identifiers, and metric displays.

### Hierarchy
- **Display** (700, clamp(2rem, 5vw, 3.5rem), 1.1): Hero headlines only. `text-wrap: balance`. Letter-spacing -0.03em for tight editorial feel.
- **Heading** (600, clamp(1.25rem, 3vw, 1.75rem), 1.2): Page section titles, pricing plan names. `text-wrap: balance`.
- **Title** (600, 1rem, 1.4): Card titles, bill titles, navigation items. Never uppercase.
- **Body** (400, 0.9375rem, 1.6): All reading text. Max line length 65–75ch.
- **Label** (500, 0.75rem, 1.4, +0.05em tracking, uppercase): Small metadata — table headers, timestamps, tags, section markers.

### Named Rules
**The Balance Rule.** Every heading (`h1`–`h3`) uses `text-wrap: balance`. On the form-filling and bill-tracking pages, even line endings reduce cognitive load for an already-anxious user.

## 4. Elevation

This system is **flat by default**. Cards sit on the cream section background without shadows — the tonal contrast (white on cream on off-white) provides all the separation needed. Buttons lift on hover via a subtle `translateY(-1px)` with a 200ms ease-out transition — the only elevation change in the system.

No box-shadows on any container element. No glassmorphism. No gradient overlays.

### Named Rules
**The Layer-By-Tone Rule.** Every surface knows its place through color, not shadow. Page body = off-white. Section = cream. Component (card, modal, sheet) = white. The hierarchy is visible in lightness, not blur.

## 5. Components

### Buttons
- **Shape:** Slightly rounded (0.4rem / --radius-md)
- **Primary:** Deep Navy background, off-white text, full uppercase label in Geist SemiBold. Hover: darker navy (oklch(18% 0.05 265)), translateY(-1px). Active: oklch(15% 0.04 265), no translate.
- **Outline:** 1.5px Deep Navy border, transparent background, navy text. Hover: navy/5 background fill. Active: navy/10.
- **Ghost:** No border, no background, navy text. Hover: navy/5 rounded fill. Used for icon buttons and tertiary actions.
- **Transition:** All buttons use `transition: all 0.2s ease-out` with `prefers-reduced-motion: reduce` fallback.

### Cards / Containers
- **Corner Style:** Soft (0.5rem / --radius-lg)
- **Background:** White (#ffffff) on cream sections; cream (#f5f0e8) on off-white sections
- **Shadow:** None by default. Data cards (state scorecard, bill cards) include a thin 1px border-light stroke.
- **Internal Padding:** `px-6 py-5` (1.5rem horizontal, 1.25rem vertical) minimum

### Chips / Tags
- **Style:** Full border (1px colored, matching semantic meaning), transparent background with 5-10% tint, uppercase Geist Mono label at 0.6875rem
- **State:** Active chips maintain a solid-color background. Filter chips are outline until selected.

### Inputs / Fields
- **Style:** 1px border-light stroke, white background, 0.4rem radius
- **Focus:** 2px action-blue ring (`--ring: #2563eb`), no offset. Disappears on blur.
- **Error:** 2px danger-red border, red label text, red outline on focus.
- **Disabled:** border-muted, muted label, cursor-not-allowed.

### Navigation
- **Style:** Sticky top bar, white background, full bleed. Deep Navy logo + text; cream highlight on active section.
- **Mobile:** Sheet drawer (hamburger), full-height, white background with navy links and amber accent for active items.
- **Auth indicators:** User icon + avatar on right; sign-in / sign-up text links in Geist Medium at 0.875rem.

### State Scorecard Grid
- **Style:** Auto-fill grid (`repeat(auto-fit, minmax(200px, 1fr))`), each state as a white card with 1px border-light, navy state code in 1.5rem Geist Mono, grade badge, restriction level chip, and click-through to state detail page. Hover: border-darkens to navy/20.

### Bill Cards
- **Style:** Two-column layout (desktop) or stacked (mobile). Left column: bill number + status timeline. Right column: title + impact badge + action summary. White card with 1px border-light, rounded-lg.

### Breadcrumbs
- **Style:** Home icon + ChevronRight dividers + text labels. Muted-foreground text, navy on current page. Flex-wrap with 0.375rem gap. Fully responsive.

## 6. Do's and Don'ts

### Do:
- **Do** use Deep Navy as the dominant color across surfaces — it communicates trust and stability
- **Do** reserve Warm Amber for urgent items only — deadlines, alerts, action required, pricing value
- **Do** keep cards flat — tone separation is sufficient
- **Do** use Geist across all text; maintain a controlled single-family typography
- **Do** lead every page with the user's fear and reframe it as manageable certainty — "Know Before the Laws Change"
- **Do** test every component with screen readers and keyboard-only navigation
- **Do** use `text-wrap: balance` on all headings

### Don't:
- **Don't** look like a government website — no serif-heavy title blocks, no seal-style logos, no multi-column forms in small print
- **Don't** look like a B2B SaaS clone — no teal-and-white, no "enterprise-grade" badge, no gradient hero backgrounds
- **Don't** use side-stripe borders (colored `border-left` greater than 1px) — use full borders or background tints instead
- **Don't** use gradient text (`background-clip: text` + gradient) — emphasis comes from weight and size
- **Don't** use glassmorphism or decorative blur — the system is flat by principle
- **Don't** use identical card grids with icon + heading + text repeated — vary layout by content
- **Don't** use tiny uppercase-tracked kickers ("ABOUT" "PROCESS") above every section — one intentional kicker per page is voice; one per section is AI grammar
- **Don't** add numbered section markers (01 / 02 / 03) unless the content is an ordered sequence
- **Don't** let body text drop below WCAG AA (4.5:1 contrast) against any background
- **Don't** show decorative-only illustrations — if you can't render the scene with real data, ship no illustration
- **Don't** use hand-drawn/sketchy SVG illustrations, repeating-linear-gradient stripe backgrounds, or "ghost cards" (1px border + wide box-shadow)
- **Don't** use `border-radius` above 16px on cards or sections — full pill (32px+) is for chips and badges only
