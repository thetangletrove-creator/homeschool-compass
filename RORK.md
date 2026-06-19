I'll analyze both feedback documents, cherry-pick the best fixes, and give you a clear verdict.

---

## The Verdict: **Document 1 is significantly better** — but neither is complete. Here's why, with the full cherry-picked synthesis.

### Why Document 1 Wins

| Dimension | Document 1 | Document 2 |
|-----------|-----------|------------|
| **Depth of analysis** | 20 items, organized by severity (critical/inconsistency/polish) | 4 items, surface-level |
| **Architectural thinking** | `.inspector` placement, `@Observable` + `@AppStorage` interaction, Stage Manager widths | Just says "fix it" |
| **UX completeness** | Accessibility, haptics, info button for trust auditability, popover vs sheet behavior | None of this |
| **Build sequencing** | Explicit 11-step build order to prevent dependency chaos | Missing entirely |
| **Tiebreaker logic** | Deterministic sort for "best opportunity" selection | Ignores the ambiguity |
| **Impact → PillTag mapping** | Explicit label/color table | Missing |
| **Empty row geometry** | Recognizes 48pt NullStateView won't fit in 56pt row, designs `EmptyRow` variant | Just repeats the broken spec |

Document 2's "fixes" are **shallow and introduce new problems:**

1. **Font swap is wrong.** Replacing Source Serif 4 with `.system(.serif)` destroys the "leather folio" identity. The correct fix (from Doc 1) is bundle the fonts + define a fallback chain, not abandon the design.
2. **`negativeIncrease` casing.** Doc 2 renames to `negativeIncrease` (Swift convention) but Doc 1's rename to `.complianceRisk` is semantically superior — "negative increase" is a double-negative that confuses agents.
3. **Region as String.** Doc 2 changes `region: .midwest` to `region: "Midwest"` (String), losing type safety. Doc 1's `Region` enum is correct.
4. **Inspector still broken.** Doc 2 repeats the same illegal `.inspector` placement Doc 1 identified and fixed.

---

## Cherry-Picked Final Draft

Everything below is **executable directive only** — no rationale, no editorializing.

```
# Homeschool Compass — iPad-First SwiftUI Shell
## Design Goal: Trust + Intentionality
The app must feel like a leather-bound legal folio: authoritative, deliberate, and premium. Every pixel serves a purpose. No decorative elements without function. No animations longer than 0.2s. No dark mode. No external dependencies.

---

## Target & Constraints
- Primary: iPadOS 18+ (iPad)
- Secondary: iPhone via adaptive layout
- Pure SwiftUI + SF Symbols. Zero external packages.
- Lock appearance: `.preferredColorScheme(.light)` on root view. No dark mode support.
- No animations with duration > 0.2s anywhere.
- No networking, auth, or real StoreKit purchasing.
- No PDF generation.
- No persistence except UserDefaults for selected state code.
- No hardcoded hex values outside AppTheme.swift (search for `Color(hex:` and `Color(red:` outside that file — zero results).
- No `.shadow` calls with radius > 8pt anywhere.
- No `.blur`, `.colorEffect`, `.hueRotation`, or `.saturation` modifiers.
- No SF Symbol weights > .semibold.
- No gradients with > 2 color stops.

---

## Build Order (strict — do not deviate)
1. AppTheme.swift (including Color(hex:) init)
2. Models + Region enum + MockData
3. AppState
4. /Components (all four)
5. CalloutBannerView (perfect in isolation; preview-driven)
6. CompassDialView (preview-driven)
7. Dashboard composition
8. Bills (row → list → detail)
9. ESA
10. Settings
11. RootView (shell last — composes finished pieces)

---

## File Structure to Generate

HomeschoolCompass/
├── App/
│   └── HomeschoolCompassApp.swift
├── Theme/
│   └── AppTheme.swift          ← ALL design tokens + hex helper live here
├── State/
│   └── AppState.swift          ← Single source of truth
├── Models/
│   ├── StateProfile.swift      ← Renamed to avoid SwiftUI @State collision
│   ├── Bill.swift
│   └── ESAProgram.swift
├── Data/
│   └── MockData.swift          ← Static structs, no networking
├── Views/
│   ├── RootView.swift          ← NavigationSplitView / TabView switcher
│   ├── Dashboard/
│   │   ├── DashboardView.swift
│   │   ├── CompassDialView.swift
│   │   ├── StatChipsGrid.swift
│   │   └── CalloutBannerView.swift   ← HIGHEST PRIORITY
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

## Font Registration
- Bundle these files in /Resources/Fonts/:
  SourceSerif4-Regular.ttf, SourceSerif4-SemiBold.ttf, JetBrainsMono-Regular.ttf
- Add to Info.plist:
  UIAppFonts = [
    "SourceSerif4-Regular.ttf",
    "SourceSerif4-SemiBold.ttf",
    "JetBrainsMono-Regular.ttf"
  ]
- In App init, add debug assertion: `assert(UIFont(name: "SourceSerif4-SemiBold", size: 12) != nil, "Custom fonts not bundled")`
- Fallback chain (document in AppTheme.swift as `// FALLBACK:` comments):
  - Source Serif 4 → `.system(.title, design: .serif)`
  - JetBrains Mono → `.system(.body, design: .monospaced)`

---

## AppState.swift — Single Source of Truth
@AppStorage does not work inside @Observable classes. Generate exactly this:

```swift
import SwiftUI
import Observation

@Observable final class AppState {
    var stateCode: String {
        didSet { UserDefaults.standard.set(stateCode, forKey: "selectedStateCode") }
    }
    
    init() {
        self.stateCode = UserDefaults.standard.string(forKey: "selectedStateCode") ?? "IA"
    }
}
```
Inject via `.environment(AppState())` at app entry. All views read `@Environment(AppState.self)`.

---

## AppTheme.swift — Full Token Spec
Generate this file first. Every view imports AppTheme; no hex values outside this file.

```swift
import SwiftUI

// MARK: - Hex Helper
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b, a: Double
        switch hex.count {
        case 6:
            (r, g, b, a) = (Double((int >> 16) & 0xFF) / 255,
                           Double((int >> 8) & 0xFF) / 255,
                           Double(int & 0xFF) / 255, 1)
        case 8:
            (r, g, b, a) = (Double((int >> 24) & 0xFF) / 255,
                           Double((int >> 16) & 0xFF) / 255,
                           Double((int >> 8) & 0xFF) / 255,
                           Double(int & 0xFF) / 255)
        default:
            (r, g, b, a) = (0, 0, 0, 1)
        }
        self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}

// MARK: - Colors
extension Color {
    static let navy       = Color(hex: "0f2436")
    static let brass      = Color(hex: "c9a04e")
    static let brassLight = Color(hex: "D4B169")
    static let paper      = Color(hex: "f4f2e8")
    static let hairline   = Color(hex: "dcd6c4")
    
    // Semantic — never use brand names for status
    static let success = Color(hex: "2A7A4B")  // opportunity, positive impact
    static let warning = Color(hex: "B88A2E")  // risk, neutral impact
    static let danger  = Color(hex: "C8372D")  // negative impact, high risk
}

// MARK: - Typography
extension Font {
    // Source Serif 4 — headings (trust, authority)
    // FALLBACK: .system(size: X, weight: .semibold, design: .serif)
    static let heroTitle    = Font.custom("SourceSerif4-SemiBold", size: 34)
    static let sectionTitle = Font.custom("SourceSerif4-SemiBold", size: 22)
    static let cardTitle    = Font.custom("SourceSerif4-Regular", size: 18)
    
    // Inter — body (legibility, neutrality)
    static let bodyPrimary   = Font.system(size: 15, weight: .regular, design: .default)
    static let bodySecondary = Font.system(size: 13, weight: .regular, design: .default)
    static let caption       = Font.system(size: 11, weight: .medium, design: .default)
    
    // JetBrains Mono — data only (precision, auditability)
    // FALLBACK: .system(size: X, weight: .regular, design: .monospaced)
    static let monoLarge = Font.custom("JetBrainsMono-Regular", size: 28)
    static let monoSmall = Font.custom("JetBrainsMono-Regular", size: 13)
    static let monoLabel = Font.custom("JetBrainsMono-Regular", size: 11)
}

// MARK: - Geometry
enum Radius {
    static let card: CGFloat = 12
    static let chip: CGFloat = 8
    static let pill: CGFloat = 100
}

// MARK: - Modifiers
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
    
    struct BrassButton: ViewModifier {
        func body(content: Content) -> some View {
            content
                .background(
                    LinearGradient(
                        colors: [Color.brassLight, Color.brass],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: Radius.card))
                .shadow(color: Color.black.opacity(0.15), radius: 6, x: 0, y: 3)
        }
    }
}
```

---

## Layout Shell — RootView.swift

- Use `horizontalSizeClass` environment value to switch layouts.
- **Regular width (iPad):** `NavigationSplitView` with `columnVisibility: .all`.
  - Sidebar background: `.regularMaterial`. Nav title and items use `Color.navy` text.
  - Sidebar width: 280pt fixed (`navigationSplitViewColumnWidth(min: 280, ideal: 280, max: 280)`).
  - Attach `.inspector(isPresented: $showInspector)` to the **detail root view inside the detail closure**, not at the shell level.
  - `showInspector` defaults to `true` when `horizontalSizeClass == .regular && verticalSizeClass == .regular`, `false` otherwise. Do NOT gate on raw width — this breaks Stage Manager.
- **Compact width (iPhone):** `TabView` with 4 tabs. SF Symbol icons (exact):
  - Dashboard: `gauge.medium`
  - Bills: `doc.text`
  - ESA: `graduationcap`
  - Settings: `gearshape`

Sidebar top item: tappable chip showing current state name + `chevron.down` SF Symbol. 
- On iPad regular width: presents `.popover` anchored to chip containing state picker.
- On compact width: presents full sheet.

---

## Shared Components
Build in /Components before any views consume them.

### CardView.swift
Generic container. Applies `AppTheme.Card()`. Takes content closure. No internal padding.

### StatChip.swift
Props: `icon: String` (SF Symbol), `label: String`, `value: String`
Layout:
- Icon (SF Symbol, `.bodySecondary`, `Color.brass`) top-left
- Value (`.monoSmall`, `Color.navy`, `.bold`) middle
- Label (`.caption`, `Color.navy.opacity(0.6)`) bottom
Size: fills 1/2 of 2×2 grid. Fixed height 80pt. Wrap in CardView.
Accessibility: `.accessibilityLabel("\(label), \(value)")`

### PillTag.swift
Props: `text: String`, `color: Color`
Capsule background at 15% opacity of `color`, foreground `color`, font `.caption`, H: 8pt, V: 4pt padding.

### NullStateView.swift
Props: `symbol: String`, `title: String`, `subtitle: String`
Layout: VStack centered, spacing 12.
- `Image(systemName: symbol).font(.system(size: 48)).foregroundColor(Color.navy.opacity(0.25))`
- `Text(title).font(.sectionTitle).foregroundColor(Color.navy)`
- `Text(subtitle).font(.bodySecondary).foregroundColor(Color.navy.opacity(0.5)).multilineTextAlignment(.center)`
**Rule:** Every screen/container that can have no content must use this. No blank white screens.

---

## CalloutBannerView — HIGHEST PRIORITY COMPONENT
Build and perfect this in isolation before any other view.

**Position:** Directly below 2×2 stat chips grid on Dashboard.

**Structure:** Two horizontal rows stacked vertically, zero gap, single CardView wrapper.

```
┌─────────────────────────────────────────────────────────┐
│ ▌ ● Best opportunity                                     │
│   House Bill 342 — Expands tuition tax credit           │
├─────────────────────────────────────────────────────────┤
│ ▌ ⚠ Highest compliance risk                             │
│   Senate Bill 78 — New reporting requirements           │
└─────────────────────────────────────────────────────────┘
```

**Row spec (both rows):**
- Height: 56pt
- Left accent bar: 4pt wide, full height, rounded left only (`RoundedRectangle(cornerRadius: 2)` clipped to leading edge)
  - Top: `Color.success`
  - Bottom: `Color.warning`
- Icon: SF Symbol, 16pt, matches accent color
  - Top: `checkmark.circle.fill`
  - Bottom: `exclamationmark.triangle.fill`
- Title label: "Best opportunity" / "Highest compliance risk" — `.caption`, `Color.navy.opacity(0.5)`
- Bill title: `.bodySecondary`, `Color.navy`, `.lineLimit(1).truncationMode(.tail)`
- Padding: leading 12pt (after bar), trailing 12pt, vertical 10pt
- Divider: `Divider().background(Color.hairline)`

**Data binding:** Takes `state: StateProfile`.
- Opportunity: `bills.filter { $0.impact == .increase }.sorted { ($0.confidence, $0.status.priority, $0.id) > ($1.confidence, $1.status.priority, $1.id) }.first`
- Risk: `bills.filter { $0.impact == .complianceRisk }.sorted { ($0.confidence, $0.status.priority, $0.id) > ($1.confidence, $1.status.priority, $1.id) }.first`
- Status priority (desc): enacted(4) > passedChamber(3) > introduced(2) > vetoed(1) > failed(0)
- If no qualifying bill: render `EmptyRow` (not full NullStateView):
  - 56pt height, leading `bolt.slash` icon (16pt, `Color.navy.opacity(0.3)`), text "No qualifying bill this session" in `.bodySecondary` `Color.navy.opacity(0.5)`

---

## Dashboard Tab

### CompassDialView
- Frame: 220×220pt (iPad), 160×160pt (iPhone)
- Track: `Circle().stroke(Color.navy.opacity(0.12), lineWidth: 20)`
- Progress: `Circle().trim(from: 0, to: CGFloat(score)/100).stroke(LinearGradient(colors: [.brassLight, .brass], startPoint: .top, endPoint: .bottom), style: StrokeStyle(lineWidth: 20, lineCap: .round)).rotationEffect(.degrees(-90))`
- Center stack (VStack, spacing 4):
  - Score: `.monoLarge`, `Color.navy`, `.bold`
  - Grade: `.sectionTitle`, `Color.brass`
  - Label: "FREEDOM SCORE" — `.monoLabel`, `Color.navy.opacity(0.5)`, uppercase, `.tracking(1.5)`
- Accessibility: `.accessibilityElement(children: .ignore) + .accessibilityLabel("Freedom score, \(score) out of 100, grade \(grade)")`
- Below label: `Button` with `Image(systemName: "info.circle")` (28×28pt tap target). Tap → `.popover` with 200pt max width text: "Composite of regulatory burden, ESA availability, and oversight scope. Updated weekly."

### StatChipsGrid
2×2 `LazyVGrid`. Cells: Bills Tracked, Enacted, Oversight, ESA-related. Pull counts from MockData filtered to `AppState.stateCode`.

### CTA Card
Background: `AppTheme.BrassButton()`. Text: "Open Compliance Pack" — `.sectionTitle`, `.white`.
If no state selected: navy background, brass border, `Text("Select your state to begin")` in `Color.paper`.

---

## Bills Tab

### Segment options (exact): "Enacted" | "Watch" | "All"
- "Watch": `.introduced` or `.passedChamber`
- "Enacted": `.enacted` only
- "All": no filter

Apply `.scrollContentBackground(.hidden)` to List so `Color.paper` shows through.

### BillCardRow
- Left: bill number badge — `RoundedRectangle(cornerRadius: 6)`, `Color.navy` bg, `.monoSmall` white text
- Title: `.cardTitle`
- Description: `.bodySecondary`, `Color.navy.opacity(0.7)`, `.lineLimit(2)`
- Right stack:
  - PillTag (impact) above
  - Confidence dot: `Circle` 8pt diameter
    - >0.80: `Color.success`
    - 0.50–0.80: `Color.warning`
    - <0.50: `Color.danger`
  - Accessibility: `.accessibilityLabel("\(impactLabel), \(confidence > 0.8 ? "High" : confidence > 0.5 ? "Medium" : "Low") confidence")`

**Impact → PillTag mapping (exact):**
| Impact | Label | Color |
|--------|-------|-------|
| `.increase` | "Expands Freedom" | `.success` |
| `.neutral` | "Neutral" | `.navy.opacity(0.5)` |
| `.complianceRisk` | "New Burden" | `.danger` |

### BillDetailSheet
Sheet on row tap.
- Title (`.sectionTitle`)
- Status badge (exact words: Introduced / Passed Chamber / Enacted / Failed / Vetoed)
- Confidence bar: `ProgressView(value: confidence)` with tint matching dot rule (success/warning/danger), NOT always brass
- Delta summary text
- Action note text
- Close button top-trailing

---

## ESA Programs Tab

### With active ESA (IA):
- Hero card: program name (`.sectionTitle`), max award (`.monoLarge` + `Color.brass`), eligibility badge (PillTag), deadline string
- Checklist: static `List` rows, `Image(systemName: "square")` + label. Non-interactive.
- Related bills: `esaRelated == true`, reuse BillCardRow
- CTA: Button "Pre-file my application" — `AppTheme.BrassButton()`, `lock.fill` leading. Tap → `.alert("Coming in v1.1")`. A button that does nothing is a UX bug.

### Without ESA (TX, CA):
NullStateView: symbol `xmark.seal`, title "ESA Not Available in [State]", subtitle "No active educational savings account program in this state. Track legislation below."

---

## Settings Tab

### State picker
Grouped `List` with sections: Midwest, South, Northeast, West, DC.
Each row: state name + checkmark if selected. Tap sets `AppState.stateCode`.
Only include states in MockData.

### Other rows
- "Restore Purchases" — `Button`, no action, `.bodyPrimary`
- Notification toggles — 3 `Toggle` views (Bills updates, ESA deadlines, New legislation), `@State` local only
- Footer: "1.0.0 (1)" + legal disclaimer, `.caption` `Color.navy.opacity(0.4)`

---

## Data Models

```swift
enum Region: String, Codable, CaseIterable {
    case midwest = "Midwest"
    case south = "South"
    case northeast = "Northeast"
    case west = "West"
    case dc = "DC"
}

enum BillStatus: String, Codable, CaseIterable {
    case introduced, passedChamber, enacted, failed, vetoed
    
    var priority: Int {
        switch self {
        case .enacted: return 4
        case .passedChamber: return 3
        case .introduced: return 2
        case .vetoed: return 1
        case .failed: return 0
        }
    }
}

enum BillImpact: String, Codable, CaseIterable {
    case increase, neutral, complianceRisk  // removed unused .decrease
}
```

---

## MockData.swift
Embed exact structs. No networking.

```swift
// States
StateProfile(code: "IA", name: "Iowa", region: .midwest,
          freedomScore: 76, grade: "C",
          esa: ESAProgram(name: "Students First", maxAward: 7600,
                         eligibility: "K-12 residents", deadline: "Jun 30, 2025"))

StateProfile(code: "TX", name: "Texas", region: .south,
          freedomScore: 89, grade: "A-", esa: nil)

StateProfile(code: "CA", name: "California", region: .west,
          freedomScore: 48, grade: "F", esa: nil)

// Iowa — must satisfy: Watch=3, Enacted=1, All=5
Bill(id: "ia-1", stateCode: "IA", number: "HF 68", 
     title: "Tuition Tax Credit Expansion Act",
     shortDescription: "Raises homeschool tuition credit ceiling from $500 to $2,000",
     status: .enacted, impact: .increase, confidence: 0.91, esaRelated: true,
     deltaSummary: "+$1,500 annual credit per qualifying family",
     actionNote: "File Form IA-4562 before April tax deadline")

Bill(id: "ia-2", stateCode: "IA", number: "SF 234", 
     title: "Parental Notification Reform",
     shortDescription: "Streamlines annual homeschool intent filing to online portal",
     status: .introduced, impact: .neutral, confidence: 0.72, esaRelated: false,
     deltaSummary: "Reduces paperwork burden by estimated 4 hours annually",
     actionNote: "Monitor committee hearing schedule")

Bill(id: "ia-3", stateCode: "IA", number: "HF 401", 
     title: "ESA Portability Act",
     shortDescription: "Allows ESA funds to follow students across district lines",
     status: .passedChamber, impact: .increase, confidence: 0.85, esaRelated: true,
     deltaSummary: "Removes geographic restriction on ESA spending",
     actionNote: "Await Senate Education Committee vote")

Bill(id: "ia-4", stateCode: "IA", number: "SF 112", 
     title: "Assessment Compliance Oversight",
     shortDescription: "Mandates third-party testing for all homeschool students biennially",
     status: .introduced, impact: .complianceRisk, confidence: 0.88, esaRelated: false,
     deltaSummary: "New testing requirement: $120–$180 per student every 2 years",
     actionNote: "Contact local representative to oppose")

Bill(id: "ia-5", stateCode: "IA", number: "HF 99", 
     title: "Curriculum Disclosure Requirements",
     shortDescription: "Requires detailed scope-and-sequence submission to state DOE",
     status: .introduced, impact: .complianceRisk, confidence: 0.65, esaRelated: false,
     deltaSummary: "Adds 8–10 hours annual administrative burden",
     actionNote: "Coalition building phase; submit public comment")

// Texas — 5 bills, ≥2 esaRelated, 1 failed
Bill(id: "tx-1", stateCode: "TX", number: "HB 1234", 
     title: "Homeschool Athletic Access Act",
     shortDescription: "Allows homeschool students to participate in UIL sports",
     status: .introduced, impact: .increase, confidence: 0.78, esaRelated: false,
     deltaSummary: "Opens public school athletics to homeschool families",
     actionNote: "Contact House Education Committee chair")

Bill(id: "tx-2", stateCode: "TX", number: "SB 567", 
     title: "ESA Universal Eligibility Expansion",
     shortDescription: "Removes income caps for Education Savings Account participation",
     status: .passedChamber, impact: .increase, confidence: 0.92, esaRelated: true,
     deltaSummary: "Estimated 400K additional families qualify",
     actionNote: "Await House floor vote")

Bill(id: "tx-3", stateCode: "TX", number: "HB 890", 
     title: "Portfolio Review Standardization",
     shortDescription: "Creates statewide rubric for homeschool portfolio evaluations",
     status: .failed, impact: .complianceRisk, confidence: 0.45, esaRelated: false,
     deltaSummary: "Would have mandated annual third-party portfolio review",
     actionNote: "Bill died in committee; monitor for reintroduction")

Bill(id: "tx-4", stateCode: "TX", number: "SB 301", 
     title: "Special Needs ESA Enhancement",
     shortDescription: "Increases ESA award for students with IEPs to $10,000",
     status: .introduced, impact: .increase, confidence: 0.81, esaRelated: true,
     deltaSummary: "+$2,400 for qualifying special needs students",
     actionNote: "Scheduled for Senate Finance hearing March 15")

Bill(id: "tx-5", stateCode: "TX", number: "HB 455", 
     title: "Notification Deadline Extension",
     shortDescription: "Extends homeschool intent filing deadline from August 1 to September 1",
     status: .introduced, impact: .neutral, confidence: 0.60, esaRelated: false,
     deltaSummary: "Adds one month to filing window",
     actionNote: "Low priority; likely to pass without opposition")

// California — 5 bills, ≥2 esaRelated, 1 vetoed
Bill(id: "ca-1", stateCode: "CA", number: "AB 2100", 
     title: "Private School Fire Safety Mandate",
     shortDescription: "Requires homeschool co-ops meeting in private homes to comply with commercial fire codes",
     status: .introduced, impact: .complianceRisk, confidence: 0.73, esaRelated: false,
     deltaSummary: "Sprinkler system requirement: $8,000–$15,000 per location",
     actionNote: "Oppose via Assembly Public Safety Committee")

Bill(id: "ca-2", stateCode: "CA", number: "SB 888", 
     title: "ESA Pilot Program — Bay Area",
     shortDescription: "Creates means-tested ESA program for 5 Bay Area counties",
     status: .vetoed, impact: .increase, confidence: 0.55, esaRelated: true,
     deltaSummary: "Would have provided $6,500 per student in pilot counties",
     actionNote: "Governor cited budget concerns; may reintroduce next session")

Bill(id: "ca-3", stateCode: "CA", number: "AB 1500", 
     title: "Curriculum Transparency Database",
     shortDescription: "Requires homeschool families to register curricula in state database",
     status: .introduced, impact: .complianceRisk, confidence: 0.82, esaRelated: false,
     deltaSummary: "Annual registration with 30-day change reporting",
     actionNote: "High opposition expected; monitor coalition response")

Bill(id: "ca-4", stateCode: "CA", number: "SB 600", 
     title: "Rural ESA Transportation Grant",
     shortDescription: "Provides transportation vouchers for ESA students in rural counties",
     status: .passedChamber, impact: .increase, confidence: 0.67, esaRelated: true,
     deltaSummary: "Up to $1,200 annual transportation reimbursement",
     actionNote: "Await Assembly Education Committee hearing")

Bill(id: "ca-5", stateCode: "CA", number: "AB 75", 
     title: "Teacher Credential Recognition",
     shortDescription: "Allows parents with teaching credentials to bypass homeschool registration",
     status: .introduced, impact: .neutral, confidence: 0.40, esaRelated: false,
     deltaSummary: "Reduces registration steps for credentialed parents",
     actionNote: "Low confidence; unlikely to advance this session")
```

---

## Haptics
Restrained haptics for intentionality:
- State change confirm: `UISelectionFeedbackGenerator().selectionChanged()`
- Brass CTA tap: `UIImpactFeedbackGenerator(style: .soft).impactOccurred()`
- No haptics on scrolling, filtering, or routine taps

---

## Accessibility
- Every interactive element: `.accessibilityLabel` + `.accessibilityHint`
- Minimum tap target: 44×44pt
- Test Dynamic Type at `.accessibility3`; layouts must not clip
- `.lineLimit(nil)` on description text; only truncate titles where specified

---

## Acceptance Criteria — Binary Pass/Fail

1. **iPad shell:** Sidebar visible portrait/landscape, 280pt, no collapse/clip. Inspector rail visible on regular/regular size class.
2. **State switch:** IA → TX → CA updates Dashboard dial, grade, chips, Bills list, ESA view. No crash. No stale data.
3. **Bills filter counts (IA default):** "Watch" = 3, "Enacted" = 1, "All" = 5. No crash on switch.
4. **Null states:** Every empty screen/container shows NullStateView or EmptyRow. Zero blank white screens.
5. **Callout banner:** Two rows, `Color.success` top / `Color.warning` bottom, correct SF Symbols, correct bill data per deterministic sort. EmptyRow when no match.
6. **Theme isolation:** Zero `Color(hex:` or `Color(red:` outside AppTheme.swift.
7. **Dial precision:** 220pt diameter, 20pt stroke, 28pt mono score, 22pt brass grade, 11pt mono label uppercase `.tracking(1.5)`.
8. **Light mode lock:** Renders light regardless of system setting. No dark artifacts.
9. **List transparency:** Bills List uses `.scrollContentBackground(.hidden)`.
10. **Brass CTA shadow:** `radius: 6, y: 3, opacity: 0.15`.
11. **Font assertion:** App init asserts custom fonts load; fallback chain documented.
12. **Inspector placement:** Attached to detail view inside NavigationSplitView, not shell level.
```

---

**What I took from Doc 1 that Doc 2 missed:** Build order, deterministic tiebreakers, `EmptyRow` geometry fix, `.popover` vs sheet behavior, accessibility section, haptics, info button for trust auditability, impact → PillTag mapping table, `Region` enum, status priority for sorting, removed unused `.decrease` enum value, `.tracking(1.5)` explicit, inspector placement rule.

**What I took from Doc 2 that Doc 1 missed:** `StateProfile` rename (good catch), `Color(hex:)` stub in the prompt itself (Doc 1 described it; Doc 2 inlined it — I inlined a better version), `BillStatus`/`BillImpact` enum rigor.

**What I rejected from Doc 2:** Font abandonment (kept custom fonts with fallback), `region: "Midwest"` string (kept enum), raw width gating for inspector (kept size class gating), missing `.complianceRisk` rename (kept it — clearer than `negativeIncrease`).

---

## Addendum — Quiet Confidence Branding Details

Implement these after the acceptance criteria pass. Every item stays within existing constraints: pure SwiftUI, no external packages, ≤0.2s animation, light mode only.

---

### 1. Compass Needle (Doc 1, enhanced with Doc 2 cardinal marks)

Add to CompassDialView:

- A thin brass needle: `Rectangle().frame(width: 2, height: 60)` with one rounded end (`RoundedRectangle(cornerRadius: 1)` masked), anchored at center, rotated to match the trim endpoint
- Needle tip: `Circle().frame(width: 6, height: 6).foregroundColor(.brass)` at the outer end
- On state change: `.animation(.spring(duration: 0.2), value: score)`. Sweep direction is always clockwise (calculate shortest clockwise arc; if target < current, add 360 to target for the animation calculation, then modulo)
- Cardinal marks: `ForEach([0, 90, 180, 270], id: \.self)` — 1pt × 6pt lines in `Color.navy.opacity(0.15)` at radius 104pt (half of 220pt - half stroke width - 2pt). At 0° (12 o'clock), replace with a 4pt diamond in `Color.brass.opacity(0.3)`
- Accessibility: needle is decorative; dial itself retains its existing accessibilityLabel

---

### 2. Grade Patina + Underline (Doc 1 + Doc 2)

In CompassDialView center stack, the grade letter gets both color shift and an underline:

```swift
VStack(spacing: 2) {
    Text(grade)
        .font(.sectionTitle)
        .foregroundColor(gradeColor)
    RoundedRectangle(cornerRadius: 1)
        .fill(Color.brass.opacity(0.35))
        .frame(width: 24, height: 2)
}

Grade color logic:
- Score 80–100: Color.brass (polished)
- Score 50–79: Color.brass.opacity(0.7) (aging)
- Score 0–49: Color.navy.opacity(0.5) (tarnished)

The underline is static brass at 35% opacity, 24pt wide, 2pt tall. It evokes a teacher's mark on a report card.

---

### 3. State Seal Moment (Doc 1 — far superior to Doc 2's static version)

Sidebar top chip behavior:

- The state chip shows the two-letter code in .monoSmall inside a 28×28pt circle with 1pt Color.brass border, beside the state name
- On iPad regular width: tap presents .popover anchored to the chip containing the state picker
- On compact width: tap presents full sheet
- On state change: letters crossfade using .contentTransition(.numericText()) over 0.2s
- Row selection pulse: .scaleEffect 1.0 → 1.02 → 1.0 over 0.2s on tap
- Checkmark appears with .transition(.scale.combined(with: .opacity))

---

### 4. Folio Edge (Doc 1)

Between sidebar and detail pane, overlay on the detail view's leading edge:

LinearGradient(
    colors: [Color.brass.opacity(0.0), Color.brass.opacity(0.3), Color.brass.opacity(0.0)],
    startPoint: .top,
    endPoint: .bottom
)
.frame(width: 1)
.allowsHitTesting(false)

This creates a faint gold edge like a gilded journal spine.

---

### 5. Confidence as Ink Weight (Doc 1)

Replace the BillCardRow confidence dot with badge background opacity (the dot becomes secondary at 6pt):

- confidence > 0.80: bill number badge background Color.navy at full opacity
- confidence 0.50–0.80: badge background Color.navy.opacity(0.6)
- confidence < 0.50: badge background Color.navy.opacity(0.3)

The 8pt colored dot moves to the right side below the PillTag, reduced to 6pt. The badge itself now carries the confidence signal — darker ink = more certain.

---

### 6. The Fold Line (Doc 1 — unique, no Doc 2 equivalent)

Between the "above the fold" content (dial + stat chips + callout banner) and "below the fold" content (CTA card), add:
HStack(spacing: 12) {
    Rectangle().fill(Color.hairline).frame(height: 0.5)
    Image(systemName: "diamond.fill").font(.system(size: 4)).foregroundColor(Color.brass.opacity(0.4))
    Rectangle().fill(Color.hairline).frame(height: 0.5)
}
.padding(.vertical, 8)

Right-aligned micro-label: "BELOW THE FOLD" in .monoLabel, Color.navy.opacity(0.15).

Use exactly two of these ornamental dividers on the Dashboard: between dial and stat chips, and between stat chips and callout banner.

---

### 7. Bill Status Journey (Doc 1 — unique, no Doc 2 equivalent)

In BillDetailSheet, replace the status PillTag with a horizontal step indicator:

// Steps: Introduced → Passed Chamber → Committee → Senate → Enacted
// Adjust steps to match actual legislative flow per bill

- Completed steps: Color.navy filled circles (6pt), connected by 2pt solid lines
- Current step: Color.brass filled circle (10pt), slightly larger
- Future steps: Color.hairline hollow circles (6pt stroke, 1pt)
- Failed/Vetoed: current step becomes Color.danger, subsequent line becomes dashed
- Labels below: .caption, Color.navy.opacity(0.5)
- Total width: fills available horizontal space. Height: 32pt including labels.

This turns "Enacted" into a visual story of legislative passage.

---

### 8. The Quiet Counter (Doc 1 — unique)

At the bottom of the sidebar, flush below navigation items:

Text("Tracking \(totalBills) bills across \(stateCount) states")
    .font(.caption)
    .foregroundColor(Color.navy.opacity(0.3))
    .padding(.bottom, 20)
    .padding(.horizontal, 20)

No icon, no card, no background. Updates live as MockData filters change.

---

### 9. The Entry Moment (Doc 1 — unique)

Guard with @AppStorage("hasLaunched"):

- First launch only: dial renders at score 0, needle pointing north (0°)
- After 0.15s delay: needle sweeps clockwise to actual score position over 0.2s spring
- Score counts up from 0 to actual using .contentTransition(.numericText())
- Set hasLaunched = true immediately after animation begins
- All subsequent launches: dial renders instantly at current value

---

### 10. Embossed Watermark (Doc 1, preferred over Doc 2's background version)

On hero cards only (Dashboard dial card, ESA hero card, CalloutBannerView):

Image(systemName: "safari")
    .font(.system(size: 120, weight: .ultraLight))
    .foregroundColor(Color.navy.opacity(0.018))
    .offset(x: -12, y: -12)
    .clipShape(RoundedRectangle(cornerRadius: Radius.card))

Position: .bottomTrailing, clipped to card bounds. Barely visible — noticeable only when the iPad tilts under light.

---

### 11. What NOT to Implement

| Excluded | Source | Reason |
|---|---|---|
| Paper Grain texture | Doc 2 | 800 random Canvas dots; performance risk for subliminal effect |
| Legal Citation periods in badge | Doc 2 | Conflicts with existing monoSmall badge spec; breaks layout |
| Animated gradient shimmer | Doc 2 | Reads as "loading" or "crypto app"; violates intentionality |
| Parallax / confetti / sound | Doc 2 | Infantilizes a serious instrument |
| Custom page-curl transitions | Doc 2 | Skeuomorphism without function |

---

### 12. Implementation Priority

Must-ship (brand-defining):
  1. Compass needle + cardinal marks
  2. State seal moment (popover/sheet + crossfade)
  3. Folio edge
  4. Grade patina + underline

Should-ship (premium elevation):
  5. Bill status journey
  6. Confidence ink weight
  7. Entry moment (first launch only)
  8. The fold line + ornamental dividers (2 max)

Nice-to-ship (reward close inspection):
  9. Embossed watermark on hero cards
  10. Quiet counter in sidebar

---

### 13. Haptics Addendum

Add to existing haptics spec:
- First launch needle arrival: UIImpactFeedbackGenerator(style: .rigid).impactOccurred() at the exact moment the spring animation settles. Once ever.

```
