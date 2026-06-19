# Homeschool Compass — Product Polish Audit

**Date:** 2026-06-17
**Source:** Jack Ryan
**Purpose:** Frontend UX polish findings for Homeschool Compass production readiness.

## 1. Perceived Performance: Skeletons & Suspense Boundaries

Real products don't use full-page generic loading spinners or allow jarring layout shifts.

- Implement `loading.tsx`: use Next.js App Router's `loading.tsx` with skeleton components (pulsing gray placeholders shaped like your data cards). This gives the illusion of speed while the Neon database query resolves.
- Targeted `<Suspense>`: for the state/bill pages, wrap only the slow data fetching components in Suspense boundaries. The navigation bar and page title should render instantly.

## 2. Structured Empty States

Never show a blank screen or an empty table without context. If a user navigates to a state with zero active bills, the UI must explicitly acknowledge it.

- Create an `<EmptyState />` component featuring a subdued icon, a clear message (`No active legislation found for [State]`), and a next step (`View neighboring states` or `Check the national scorecard`).

## 3. The "Outside the App" Experience (Metadata & Assets)

Users will share specific bill pages in forums, iMessage, and Facebook. The link must unfurl professionally.

- Dynamic Open Graph (OG) Images: utilize the Next.js Metadata API to auto-generate social cards. A link to `bill/tx-hb-2674` should generate a preview image displaying `HB-2674: Texas` and its impact rating.
- Favicon & Touch Icons: replace the default Next.js Vercel triangle. Include an `apple-touch-icon.png` so users can add the tracker to their iOS home screens as an app-like shortcut.

## 4. Immediate User Feedback (Toasts)

When a user takes an action, they should not have to guess if it succeeded.

- Toast Notifications: integrate a lightweight library like `sonner` or `react-hot-toast`. If they save a bill to their watchlist or trigger a subscription change, fire a bottom-right toast: `✅ Bill HB-2674 saved to watchlist.`

## 5. Graceful Error Recovery

The default Next.js error pages scream "developer environment."

- `not-found.tsx` (404): create a custom 404 page for invalid state codes or bad bill IDs. Include a search bar or a button redirecting them to the main scorecard.
- `error.tsx` (500): if the database fails or the Stripe API times out, catch it gracefully. Show a branded "We're experiencing technical difficulties" page with a "Try Again" button to attempt a component re-render without a hard page reload.

## 6. Accessibility & Interaction Polish

Professional apps feel tight and responsive to every input device.

- Active Route Highlighting: the navigation bar should visually indicate which page the user is currently on (for example, a bolder font weight or underline on "Scorecard" when visiting `/scorecard`).
- Focus Rings: ensure all buttons, links, and form inputs use `focus-visible:ring-2 focus-visible:ring-blue-500` utility classes. This proves the site is accessible for keyboard navigators and prevents default, ugly browser outlines.
