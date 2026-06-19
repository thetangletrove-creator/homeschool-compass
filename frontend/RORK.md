# Homeschool Compass — iPad-First SwiftUI Shell

## Target
- Primary: iPadOS 18+ (iPad)
- Secondary: iPhone via adaptive layout
- Pure SwiftUI + SF Symbols + system fonts. Zero external packages.
- Lock light mode: `.preferredColorScheme(.light)` on root view.
- No animations with duration > 0.2s anywhere.

---

## File Structure to Generate

HomeschoolCompass/
├── App/
│   └── HomeschoolCompassApp.swift
├── Theme/
│   └── AppTheme.swift          ← ALL design tokens live here
├── Models/
│   ├── State.swift
│   ├── Bill.swift
│   └── ESAProgram.swift
├── Data/
│   └── MockData.swift          ← Static JSON structs, no networking
├── Views/
│   ├── RootView.swift          ← NavigationSplitView / TabView switcher
│   ├── Dashboard/
│   │   ├── DashboardView.swift
│   │   ├── FreedomDialView.swift
│   │   ├── StatChipsGrid.swift
│   │   └── CalloutBannerView.swift   ← HIGHEST PRIORITY component
│   ├── Bills/
│   │   ├── BillsView.swift
│   │   ├── BillCardRow.swift
│   │   └── BillDetailSheet.swift
│   ├── ESA/
│   │   └── ESAView.swift
│   └── Settings/
│       └── SettingsView.swift
└── Components/
    ├── CardView.swift
    ├── StatChip.swift
    ├── PillTag.swift
    └── NullStateView.swift

---

## AppTheme.swift — Full Token Spec

Generate this file first. Every view imports AppTheme; no hex values appear outside this file.

```swift
// Colors
extension Color {
    static let navy      = Color(hex: "0f2436")  // Primary background, sidebar
    static let paper     = Color(hex: "f4f2e8")  // Surface: card backgrounds
    static let hairline  = Color(hex: "dcd6c4")  // Card borders
    static let brass     = Color(hex: "c9a04e")  // Accent: CTAs, highlights
    static let brassLight = Color(hex: "D4B169") // gradient top stop for CTAs

    // Semantic palette (impact pills / callout bars)
    static let success  = Color(hex: "2A7A4B")  // opportunity / positive impact
    static let warning  = Color(hex: "B88A2E")  // risk / warning
    static let danger   = Color(hex: "C8372D")  // negative impact

    // Impact pill direct colors (keep for backward compat or use semantic names)
    static let impactRed   = Color(hex: "dc2626")
    static let impactGreen = Color(hex: "16a34a")
    static let impactAmber = Color(hex: "d97706")

    // Callout row colors
    static let riskAmber  = Color(hex: "d97706")
    static let oppGreen   = Color(hex: "2A7A4B")
}

// Typography
extension Font {
    // Source Serif 4 — headings only
    static let heroTitle     = Font.custom("SourceSerif4-SemiBold", size: 34)
    static let sectionTitle  = Font.custom("SourceSerif4-SemiBold", size: 22)
    static let cardTitle     = Font.custom("SourceSerif4-Regular", size: 18)

    // Inter — body
    static let bodyPrimary   = Font.system(size: 15, weight: .regular, design: .default)
    static let bodySecondary = Font.system(size: 13, weight: .regular, design: .default)
    static let caption       = Font.system(size: 11, weight: .medium, design: .default)

    // JetBrains Mono — data/numbers only
    static let monoLarge     = Font.custom("JetBrainsMono-Regular", size: 28) // dial score
    static let monoSmall     = Font.custom("JetBrainsMono-Regular", size: 13) // bill numbers
}

// CornerRadius
enum Radius {
    static let card: CGFloat = 12
    static let chip: CGFloat = 8
    static let pill: CGFloat = 100
}

// Shared card modifier
// Usage: .modifier(AppTheme.Card())
struct AppTheme {
    struct Card: ViewModifier {
        func body(content: Content) -> some View {
            content
                .background(Color.paper)
                .clipShape(RoundedRectangle(cornerRadius: Radius.card))
                .overlay(
                    RoundedRectangle(cornerRadius: Radius.card)
                        .strokeBorder(Color.hairline, lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 2)
        }
    }
}

// Brass gradient (use for primary CTA buttons)
extension LinearGradient {
    static let brass = LinearGradient(
        colors: [Color.brassLight, Color.brass],
        startPoint: .top,
        endPoint: .bottom
    )
}
```

---

## Layout Shell — RootView.swift

- Use horizontalSizeClass environment value to switch layouts.
- Regular width (iPad): `NavigationSplitView` with `.all` columnVisibility, sidebar pinned, detail pane fills remainder. On width > 1024pt (use GeometryReader), inject an `.inspector(isPresented:)` rail on the right (empty VStack with Text("Inspector") placeholder).
- Compact width (iPhone): `TabView` with 4 tabs (Dashboard, Bills, ESA, Settings). SF Symbol tab icons per section below.
- Sidebar width: `navigationSplitViewColumnWidth(min: 280, ideal: 280, max: 280)`.
- State selection persists via central state object (see State Architecture).
- Sidebar background: `.regularMaterial`.
- Sidebar top item: a tappable chip showing the current state name + down-chevron SF Symbol, which opens the Settings state picker as a sheet.

### State Architecture
Replace scattered `@AppStorage` usage with:
```swift
@Observable
class AppState {
    @AppStorage("selectedStateCode") var stateCode = "IA"
}
```
Inject via `.environment(AppState())` at root. Views read from `@Environment(AppState.self)`.

---

## Shared Components

Build these in /Components before any views consume them.

### CardView.swift
Generic container. Applies `AppTheme.Card` modifier. Takes a content closure. No padding inside — callers set their own internal padding.

### StatChip.swift
Props: icon: String (SF Symbol name), label: String, value: String
Layout:
- Icon (SF Symbol, .bodySecondary font, Color.brass) top-left
- Value (monoSmall, Color.navy, bold) middle
- Label (caption, Color.navy.opacity(0.6)) bottom
Size: fills 1/2 of a 2×2 grid. Fixed height 80pt. Applied CardView.

### PillTag.swift
Props: text: String, color: Color
Capsule background at 15% opacity of color, foreground text color, font .caption, horizontal padding 8pt vertical 4pt.

### NullStateView.swift
Props: symbol: String, title: String, subtitle: String
Layout: VStack centered, spacing 12.
- Image(systemName: symbol).font(.system(size: 48)).foregroundColor(Color.navy.opacity(0.25))
- Text(title) .font(.sectionTitle) .foregroundColor(Color.navy)
- Text(subtitle) .font(.bodySecondary) .foregroundColor(Color.navy.opacity(0.5)) .multilineTextAlignment(.center)

---

## CalloutBannerView — HIGHEST PRIORITY COMPONENT

Position: Directly below the 2×2 stat chips grid on Dashboard.

Structure: Two horizontal rows stacked vertically, no gap between them, sharing a single CardView wrapper.

```
┌─────────────────────────────────────────────────────────┐
│ ▌ ● Best opportunity                                     │
│   House Bill 342 — Expands tuition tax credit           │
├─────────────────────────────────────────────────────────┤
│ ▌ ⚠️ Highest compliance risk                             │
│   Senate Bill 78 — New reporting requirements           │
└─────────────────────────────────────────────────────────┘
```

Row spec (apply to both):
- Height: 56pt per row
- Left accent bar: 4pt wide, full row height, rounded corners on left side only, color `Color.success` (top row) / `Color.warning` (bottom row)
- Icon: SF Symbol `checkmark.circle` (opportunity) / `exclamationmark.triangle` (risk), size 16pt, color matches accent bar
- Title label: "Best opportunity" / "Highest compliance risk" — `.caption` font, `.navy.opacity(0.5)`, above the bill title
- Bill title: `.bodySecondary` font, `.navy`, single line with `.lineLimit(1).truncationMode(.tail)`
- Internal padding: leading 12pt (after accent bar), trailing 12pt, vertical 10pt
- Divider between rows: `Divider()` with `.background(Color.hairline)`

Data binding: CalloutBannerView takes `StateData`. Derive opportunity from the bill in that state's bill list with `impact == .increase` and highest confidence score. Derive risk from `impact == .negativeIncrease` (reporting/oversight) and highest confidence. If no qualifying bill exists, show NullStateView with symbol "bolt.slash" inside the banner row.

---

## CompassDial — Exact Pixel Spec

- Frame: 220×220pt
- Track ring: `Circle().stroke(Color.navy.opacity(0.12), lineWidth: 20)`
- Progress ring: `Circle().trim(from: 0, to: CGFloat(score)/100).stroke(LinearGradient(colors: [.brassLight, .brass], startPoint: .top, endPoint: .bottom), style: StrokeStyle(lineWidth: 20, lineCap: .round)).rotationEffect(.degrees(-90))`
- Center stack: score in 56pt serif bold navy / grade in 24pt brass / "FREEDOM SCORE" in 11pt JetBrains Mono uppercase, `letterSpacing: 1.5`

---

## Dashboard Tab

Build order: FreedomDialView → StatChipsGrid → CalloutBannerView → CTA card.

### StatChipsGrid
2×2 LazyVGrid. Cells: Bills Tracked, Enacted, Oversight, ESA-related. Pull counts from MockData filtered to selected state code.

### CTA Card (below callout banner)
Background: LinearGradient.brass. Corner radius: Radius.card. Shadow for lift: `.shadow(color: .black.opacity(0.15), radius: 6, x: 0, y: 3)`.
Text: "Open Compliance Pack" — .sectionTitle, .white.
If no state selected: replace with a state-picker prompt card (navy background, brass border, Text("Select your state to begin") in paper color).

---

## Bills Tab

### Segment options (exact strings): "Enacted" | "Watch" | "All"
- "Watch" = bills with status `.introduced` or `.passedChamber`
- "Enacted" = status `.enacted` only
- "All" = no filter

### BillCardRow
- Left: bill number badge — RoundedRectangle(cornerRadius: 6), navy bg, monoSmall white text
- Title: .cardTitle
- Description: .bodySecondary, .navy.opacity(0.7), 2 lines max
- Right side stack: PillTag (impact) above, confidence dot below

  Confidence mapping:
  - >80%: Color.success
  - 50–80%: Color.warning
  - <50%: Color.danger

### BillDetailSheet
Sheet on row tap. Content:
- Title (sectionTitle)
- Status badge (exact status words only: Introduced / Passed chamber / Enacted / Failed / Vetoed)
- Confidence bar: ProgressView(value: confidence) with brass tint
- Delta summary text
- Action note text
- Close button top-trailing

---

## ESA Programs Tab

### With active ESA (default state: IA)
- Hero card: program name (sectionTitle), max award (monoLarge + brass), eligibility badge (PillTag), deadline string
- Checklist: static List rows, each with Image(systemName: "square") + label. Non-interactive.
- Related bills: filtered bill rows (esa_related == true), same BillCardRow component
- CTA: Button "Pre-file my application" — LinearGradient.brass background, locked icon leading (`lock.fill`), triggers no action

### Without ESA (TX, CA)
NullStateView: symbol "xmark.seal", title "ESA Not Available in [State]",
subtitle "No active educational savings account program in this state. Track legislation below."

---

## Settings Tab

### State picker
Grouped List with sections: Midwest, South, Northeast, West, DC.
Each row: state name + checkmark if selected. Tap sets `stateCode`.
Include only states represented in MockData for now.

### Other rows
- "Restore Purchases" row — Button with no action, .bodyPrimary
- Notification toggles — 3 static Toggle views (Bills updates, ESA deadlines, New legislation), all @State local only, no persistence
- Footer: app version "1.0.0 (1)" + legal disclaimer in .caption .navy.opacity(0.4)

---

## Mock Data — MockData.swift
Embed these exact structs. No network calls anywhere. Wire mock data so acceptance #3 matches exactly: Watch = 3 bills, Enacted = 1 bill, All = 5 bills for IA.

// States
StateData(code: "IA", name: "Iowa", region: .midwest,
          freedomScore: 76, grade: "C",
          esa: ESAProgram(name: "Students First", maxAward: 7600,
                         eligibility: "K-12 residents", deadline: "Jun 30, 2025"))

StateData(code: "TX", name: "Texas", region: .south,
          freedomScore: 89, grade: "A-", esa: nil)

StateData(code: "CA", name: "California", region: .west,
          freedomScore: 48, grade: "F", esa: nil)

// Bills — 5 per state. Each bill needs:
// id, stateCode, number (e.g. "HB 342"), title, shortDescription,
// status (enum: introduced/passedChamber/enacted/failed/vetoed),
// impact (enum: increase/decrease/neutral/negativeIncrease),
// confidence (Double 0.0–1.0),
// esaRelated (Bool),
// deltaSummary (String), actionNote (String)

// Iowa — ensure these counts for acceptance #3:
// - Watch: 3 bills (status .introduced or .passedChamber)
// - Enacted: 1 bill
// - All: 5 bills
// Iowa sample:
Bill(id: "ia-1", stateCode: "IA", number: "HF 68",
     title: "Tuition Tax Credit Expansion Act",
     shortDescription: "Raises homeschool tuition credit ceiling from $500 to $2,000",
     status: .passedChamber, impact: .increase, confidence: 0.91, esaRelated: true,
     deltaSummary: "+$1,500 annual credit per qualifying family",
     actionNote: "File Form IA-4562 before April tax deadline")

// Texas — 5 bills; include 1 failed bill
Bill(id: "tx-1", stateCode: "TX", number: "HB 1847",
     title: "Private School Voucher Expansion",
     shortDescription: "Expands ESAs to cover accredited homeschool curricula and tutoring",
     status: .introduced, impact: .increase, confidence: 0.82, esaRelated: true,
     deltaSummary: "+$8,000 per student ESA eligibility expanded",
     actionNote: "Monitor House Education Committee markup")

// California — 5 bills; include 1 vetoed bill
Bill(id: "ca-1", stateCode: "CA", number: "SB 1105",
     title: "Home-school immunization reporting",
     shortDescription: "Requires annual proof of immunizations or validated personal belief exemption",
     status: .vetoed, impact: .negativeIncrease, confidence: 0.77, esaRelated: false,
     deltaSummary: "+1 new annual compliance event",
     actionNote: "Prepare tracking workflow before next session")

// Generate remaining bills to satisfy the lists above. At least 2 esa_related per state.

---

## What NOT to Build
- No networking, auth, or real StoreKit purchasing
- No PDF generation
- No persistence except selectedStateCode
- No external packages

---

## Nice-to-Haves

Worth exploring given low implementation cost relative to complexity already in the shell:

- StoreKit 2 — mock product IDs, no backend
- Push notifications — local `UNUserNotificationCenter`
- CloudKit sync — profile/preferences across devices
- External API stubs with sandbox data — networking layer with mock responses so live keys can be dropped in later

### Worth-the-pain items
Only pursue these if design fidelity is the actual goal, not speed:

- native SwiftUI Arc/Coversheet dial animation
- SF Symbols checklist
- iPad multi-window restore
- VoiceOver labels on every card

---

## Acceptance Criteria — Binary Pass/Fail

1. iPad simulator: sidebar remains visible in both portrait and landscape without collapsing or clipping
2. State picker in Settings: switching IA → TX → CA updates Dashboard dial score, grade, stat chips, Bills list, and ESA view without crash
3. Bills segmented control: "Watch" returns exactly 3 bills, "Enacted" returns exactly 1 bill, "All" returns exactly 5 bills, for default state IA. No crash on any filter switch.
4. Every screen that can have no content shows NullStateView — no blank white screens anywhere
5. CalloutBannerView renders with two rows, correct accent bar colors (green top / amber bottom), correct SF Symbols, and correct bill data derived from selectedStateCode
6. No hardcoded hex values outside AppTheme.swift (search for `Color(hex:` and `Color(red:` outside that file — zero results)
7. On device width > 1024pt, a third column inspector rail is visible (even if empty)
