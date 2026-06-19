/**
 * One-time Checkout for Annual Compliance Kit
 *
 * POST /api/checkout/kit
 * Body: { state: "IA" }
 *
 * Creates a Stripe Checkout Session for a one-time $29 compliance kit purchase.
 * No auth required — the kit is a downloadable product anyone can buy.
 * On success, redirects to /download/{state} with the session ID.
 */
import { NextResponse } from "next/server"
import Stripe from "stripe"

let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (stripe) return stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
  stripe = new Stripe(key, {
    apiVersion: "2025-06-16.acacia",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  return stripe
}

const VALID_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA",
  "MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX",
  "UT","VT","VA","WA","WV","WI","WY",
]

const KIT_PRICE_ID = process.env.STRIPE_PRICE_KIT || ""

export async function POST(request: Request) {
  // 1. Parse body
  let body: { state?: string }
  try {
    body = (await request.json()) as { state?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const state = body.state?.toUpperCase()
  if (!state || !VALID_STATES.includes(state)) {
    return NextResponse.json(
      { error: `Invalid state code. Must be a 2-letter US state abbreviation.` },
      { status: 400 },
    )
  }

  if (!KIT_PRICE_ID) {
    return NextResponse.json(
      { error: "Compliance kit is not configured yet. Set STRIPE_PRICE_KIT env var." },
      { status: 500 },
    )
  }

  // 2. Create a one-time checkout session
  const domain = process.env.NEXT_PUBLIC_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_DOMAIN}`
    : request.headers.get("origin") || "http://localhost:3000"

  try {
    const checkoutSession = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: KIT_PRICE_ID,
          quantity: 1,
        },
      ],
      metadata: { state },
      success_url: `${domain}/download/${state}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/compliance-kit?cancelled=true`,
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
  } catch (err) {
    console.error("Stripe checkout error:", err)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    )
  }
}
