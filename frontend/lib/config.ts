export const CONFIG = {
  PRODUCT_NAME: 'Homeschool Compass',
  TAGLINE: 'Regulation Tracker',
  DOMAIN: process.env.NEXT_PUBLIC_DOMAIN ?? 'homeschool-compass.vercel.app',
  STRIPE_SUCCESS_URL: '/account?checkout=success',
  STRIPE_CANCEL_URL: '/pricing?checkout=cancelled',
  REVALIDATE_RPM: parseInt(process.env.REVALIDATE_RATE_LIMIT || '5', 10),
}

export const FEATURES = {
  ENABLE_STRIPE: process.env.ENABLE_STRIPE === 'true',
}
