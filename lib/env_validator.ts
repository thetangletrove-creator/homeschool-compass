import { FEATURES } from './config';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  // Stack Auth env vars — NOT NEON_AUTH_*
  'NEXT_PUBLIC_STACK_PROJECT_ID',
  'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
  'STACK_SECRET_SERVER_KEY',
  'REVALIDATION_SECRET',
  // Stripe vars are conditional — only required when ENABLE_STRIPE is true
  ...(FEATURES.ENABLE_STRIPE ? [
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ] : []),
] as const;

const MISSING: string[] = [];
for (const name of REQUIRED_ENV_VARS) {
  if (!process.env[name]) MISSING.push(name);
}

if (MISSING.length > 0) {
  const msg = `[FATAL] Missing required env vars: ${MISSING.join(', ')}. Set them in Vercel dashboard and redeploy.`;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg);
  } else {
    console.warn(msg);
  }
}
