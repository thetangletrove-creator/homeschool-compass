// This file configures the initialization of Sentry on the client.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring (10% sample rate — keep costs low)
  tracesSampleRate: 0.1,

  // Replays for debugging user sessions (5% sample rate)
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  // Only enable debug in development
  debug: process.env.NODE_ENV === "development",
})
