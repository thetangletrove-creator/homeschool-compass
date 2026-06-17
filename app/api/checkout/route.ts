import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { db } from "@/lib/db/index"
import { subscriptions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { CONFIG } from "@/lib/config"

/**
 * Creates a Stripe Checkout Session for a subscription flow.
 *
 * POST /api/checkout
 * Body: { plan: "tracker" | "esa" }
 *
 * Returns { url } → client redirects to Stripe-hosted Checkout page.
 * Requires authentication — uses getUserId() to tag the session
 * with client_reference_id so the webhook can link subscription → user.
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
  } as unknown as Stripe.StripeConfig)
  return stripe
}

const PRICE_IDS: Record<string, string> = {
  tracker: process.env.STRIPE_PRICE_TRACKER || "",
  esa: process.env.STRIPE_PRICE_ESA || "",
}

export async function POST(request: Request) {
  // 1. Auth
  const userId = await getUserId()

  // 2. Parse plan from body
  let body: { plan?: string }
  try {
    body = (await request.json()) as { plan?: string }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    )
  }

  const plan = body.plan
  if (!plan || !["tracker", "esa"].includes(plan)) {
    return NextResponse.json(
      { error: 'Invalid plan. Must be "tracker" or "esa".' },
      { status: 400 },
    )
  }

  const priceId = PRICE_IDS[plan]
  if (!priceId) {
    return NextResponse.json(
      { error: `No price configured for plan "${plan}". Set STRIPE_PRICE_TRACKER or STRIPE_PRICE_ESA env var.` },
      { status: 500 },
    )
  }

  // 3. Look up existing Stripe customer, or create one
  let customerId: string
  const existing = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)

  if (existing.length > 0 && existing[0].stripeCustomerId) {
    customerId = existing[0].stripeCustomerId
  } else {
    const session = await getSession()
    const email = session?.user.email || undefined
    const name = session?.user.name || undefined

    const customer = await getStripe().customers.create({
      email,
      name,
      metadata: { userId },
    })
    customerId = customer.id

    // Persist customer ID immediately so the webhook can link it
    await db
      .insert(subscriptions)
      .values({
        userId,
        stripeCustomerId: customerId,
        plan: null,
        status: "inactive",
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: { stripeCustomerId: customerId },
      })
  }

  // 4. Create the Checkout Session
  const domain = process.env.NEXT_PUBLIC_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_DOMAIN}`
    : request.headers.get("origin") || "http://localhost:3000"

  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: userId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${domain}${CONFIG.STRIPE_SUCCESS_URL}`,
    cancel_url: `${domain}${CONFIG.STRIPE_CANCEL_URL}`,
    subscription_data: {
      metadata: { userId, plan },
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  })

  if (!checkoutSession.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 500 },
    )
  }

  return NextResponse.json({ url: checkoutSession.url })
}

// Lazy import to avoid circular dependency at module level
async function getSession() {
  const { getSession } = await import("@/lib/auth")
  return getSession()
}
