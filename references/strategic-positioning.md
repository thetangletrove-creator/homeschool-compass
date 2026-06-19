# Homeschool Compass — Strategic Positioning

**Last updated:** 2026-06-19
**Source:** Product positioning review (Sherri feedback, distilled)

---

## North Star Statement

> **Operational clearinghouse for the funded homeschool.**

We do not compete on day-to-day academic planning minutiae. Our moat is the intersection where **scholastic proof meets financial compliance** — eliminating double data entry for families managing ESA funds, state portfolios, and reimbursement claims.

---

## The Three Moats (Aspirational Architecture)

These define the long-term product vision. **Moat 1 is partially built** — the provider invoice portal with ZK encryption is live. The other two are north stars for future architecture decisions:

### 1. Unified Receipt & Lesson Tagging (🔨 PARTIALLY BUILT)

The provider invoice portal is the first vertical slice — a tutor submits a session invoice + credentials, parent receives a ClassWallet-compliant PDF. What's built: magic link flow, itemized session rows, PDF generation, ZK-encrypted provider profile storage. What's next: parent-side receipt upload with OCR → link to expense record → one-tap portfolio export.

**Concrete differentiator:** Zero-Knowledge (ZK) encryption using RSA-OAEP+AES-256-GCM — provider credentials, phone, and email are encrypted before reaching the server. No other homeschool or ESA tool offers end-to-end encrypted provider data. The server holds only opaque ciphertext.

A parent uploads a receipt image (e.g., a $45 chemistry kit). The app doesn't just record the expense — it prompts linking to a specific course/track/standard. The output is a **one-tap PDF packet** that packages the financial invoice + corresponding graded work samples, ready for state audit or ClassWallet/Odyssey submission.

**What this eliminates:** The recurring headache of reconciling receipts against lesson plans at quarter-end.

### 2. High-Density, Offline-First Mobile UX

Local SQLite retains full scheduling, editing, logging, and photo capture without cell service. Data queues locally and auto-syncs via background workers when connectivity returns.

**Why this matters:** Learning happens at co-ops, museums, field trips. Parents shouldn't need signal to log a day's work.

### 3. Contextual Fixed-Anchor Rescheduling

When a parent logs a sick day or missed lesson, the scheduler cascades internal lesson counts *around* fixed calendar events (co-op classes, paid tutors, family vacations, pre-paid field trips) rather than shifting everything.

**Why typical schedulers fail:** They treat all events as equally movable. Real homeschool lives around anchored commitments.

---

## Pricing Strategy

| Concept | Implication |
|---------|-------------|
| **Flat family rate** | $50-70/yr annual, unlimited students. No per-child step-ups — large families (core demographic) don't hit friction. |
| **Frame as audit insurance** | $50-70 is expensive for a planner, negligible for protecting $6K-$10K in annual state ESA funding. |
| **Tier gate** | Free Sandbox (single student, manual ledger) → Paid Family (OCR, portfolio export, offline) — gate the export tool for quarterly submission season. |

## GTM Strategy

**Vector:** Local co-op Facebook groups, enrichment co-op networks, ESA parent forums in high-allocation states (AZ, FL, UT).

**Hook:** "The administrative assistant that keeps you state-compliant."

**Mechanism:** Free sandbox tier for term planning → portfolio exporter gates for quarterly ESA submission periods. Let organic sharing in co-op groups do the distribution.

---

## What This Doesn't Mean

We do not build:
- A curriculum provider
- A class marketplace
- Another daily lesson planner
- A payment processor for tutors

We **integrate with** all of the above. The value is the bridge layer.
