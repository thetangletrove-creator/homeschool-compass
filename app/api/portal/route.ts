import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { db } from "@/lib/db/index"
import { subscriptions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

/**
 * Creates a Stripe Billing Portal session so users can self-manage their
 * subscription — upgrade, cancel, or update payment method.
 *
 * POST /api/portal
 *
 * Returns { url } — client redirects to the Stripe-hosted Portal page.
 * After the user finishes, Stripe sends them back to /settings.
 *
 * Requires authentication.
 */

// Stripe SDK singleton — lazily initialized so the app boots
// without STRIPE_SECRET_KEY when Stripe is gated behind ENABLE_STRIPE.
import Stripe from "stripe"

let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (stripe) return stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
  stripe = new Stripe(key, {
    apiVersion: "2025-06-16.acacia",
  } as any)
  return stripe
}

export async function POST(request: Request) {
  // 1. Auth
  let userId: string
  try {
    userId = await getUserId()
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // 2. Look up the user's Stripe customer ID
  const [sub] = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)

  const customerId = sub?.stripeCustomerId
  if (!customerId) {
    // No subscription yet — send them to the pricing page
    return NextResponse.json({ url: "/pricing" })
  }

  // 3. Create the Billing Portal session
  const domain = process.env.NEXT_PUBLIC_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_DOMAIN}`
    : request.headers.get("origin") || "http://localhost:3000"

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${domain}/settings`,
  })

  return NextResponse.json({ url: portalSession.url })
}
