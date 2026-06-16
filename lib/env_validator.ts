import { FEATURES } from './config'

/**
 * Environment variable validator for Homeschool Compass.
 *
 * Env vars are validated early in the application lifecycle so misconfigured
 * deployments fail fast instead of producing cryptic runtime errors.
 *
 * Auth vars (NEON_AUTH_*) are non-fatal — the app works without them, just
 * showing logged-out state. DB + revalidation vars are required everywhere.
 * Stripe vars are conditional (checked when ENABLE_STRIPE is true).
 *
 * In development, missing vars produce a console.warn. In production, they
 * throw to prevent deploying in a broken state.
 */

type EnvCheck = {
  name: string
  required: boolean
  condition?: () => boolean
}

const CHECKS: EnvCheck[] = [
  // ── Database (always required) ──────────────────────────────────────
  { name: 'DATABASE_URL', required: true },
  // ── Auth (graceful: app works without it) ────────────────────────────
  { name: 'NEON_AUTH_BASE_URL', required: false },
  { name: 'NEON_AUTH_COOKIE_SECRET', required: false },
  // ── Revalidation (always required for CMS features) ──────────────────
  { name: 'REVALIDATION_SECRET', required: true },
  // ── Stripe (conditional) ─────────────────────────────────────────────
  {
    name: 'STRIPE_SECRET_KEY',
    required: true,
    condition: () => FEATURES.ENABLE_STRIPE,
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    required: true,
    condition: () => FEATURES.ENABLE_STRIPE,
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: true,
    condition: () => FEATURES.ENABLE_STRIPE,
  },
]

const MISSING: string[] = []

for (const check of CHECKS) {
  // Skip non-required checks entirely when missing — auth defaults gracefully
  if (!check.required) continue

  // Skip conditional checks when their condition is not met
  if (check.condition && !check.condition()) continue

  if (!process.env[check.name]) {
    MISSING.push(check.name)
  }
}

if (MISSING.length > 0) {
  const msg = `[FATAL] Missing required env vars: ${MISSING.join(', ')}. Set them in Vercel dashboard and redeploy.`
  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg)
  } else {
    console.warn(msg)
  }
}

// Non-fatal auth warning (development only)
if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) {
  if (process.env.NODE_ENV !== 'production') {
    console.info(
      '[CONFIG] Neon Auth is not configured — auth features disabled. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET to enable.',
    )
  }
}
