import { NextResponse } from "next/server"
import { db } from "@/lib/db/index"
import { subscriptions, webhookEvents } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import Stripe from "stripe"

/**
 * Stripe Webhook Handler
 *
 * Processes Stripe events for subscription lifecycle management.
 * Runs idempotently via the webhook_events table — duplicate events
 * are silently dropped.
 *
 * Routes (Next.js convention):
 * Body parsing is disabled so we can read the raw body for
 * signature verification. Stripe sends the signature in the
 * stripe-signature header.
 */

// Disable Next.js body parsing — we need the raw body for signature verification
export const config = { api: { bodyParser: false } }

let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (stripe) return stripe
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-06-16.acacia",
  } as unknown as Stripe.StripeConfig)
  return stripe
}

async function readRawBody(request: Request): Promise<string> {
  const reader = request.body?.getReader()
  if (!reader) return ""
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString("utf8")
}

export async function POST(request: Request) {
  const rawBody = await readRawBody(request)
  const signature = request.headers.get("stripe-signature")

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 })
  }

  // 1. Verify signature
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // 2. Idempotency — skip if already processed
  try {
    await db.insert(webhookEvents).values({ eventId: event.id })
  } catch {
    // ON CONFLICT DO NOTHING — already processed
    return NextResponse.json({ received: true, deduplicated: true })
  }

  // 3. Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      }
      case "invoice.paid": {
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      }
      case "invoice.payment_failed": {
        await handleInvoiceFailed(event.data.object as Stripe.Invoice)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[Stripe Webhook] Handler error:", (err as Error).message)
    // Still return 200 — Stripe will retry if we 4xx/5xx.
    // We logged the error; manual intervention may be needed if this persists.
    return NextResponse.json({ received: true, handlerError: true })
  }
}

// ── Event Handlers ─────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!session.subscription) return

  const userId = session.client_reference_id
  if (!userId) return

  // Determine plan from metadata or line items
  const plan = session.metadata?.plan || (await inferPlan(session))

  await db
    .insert(subscriptions)
    .values({
      userId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      plan: plan ?? null,
      status: "active",
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        plan: plan ?? null,
        status: "active",
        updatedAt: sql`NOW()`,
      },
    })
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const userId = sub.metadata.userId
  if (!userId) return

  const plan = sub.metadata.plan || undefined

  await db
    .update(subscriptions)
    .set({
      status: sub.status,
      plan: plan ?? null,
      currentPeriodEnd: (sub as unknown as Record<string, unknown>).current_period_end
        ? new Date(((sub as unknown as Record<string, unknown>).current_period_end as number) * 1000)
        : undefined,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      updatedAt: sql`NOW()`,
    })
    .where(eq(subscriptions.userId, userId))
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const userId = sub.metadata.userId
  if (!userId) return

  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      plan: null,
      updatedAt: sql`NOW()`,
    })
    .where(eq(subscriptions.userId, userId))
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Subscription renewed — set status to active
  if (!(invoice as unknown as Record<string, unknown>).subscription) return
  const sub = await getStripe().subscriptions.retrieve((invoice as unknown as Record<string, unknown>).subscription as string)
  const userId = sub.metadata.userId
  if (!userId) return

  await db
    .update(subscriptions)
    .set({
      status: "active",
      currentPeriodEnd: (sub as unknown as Record<string, unknown>).current_period_end
        ? new Date(((sub as unknown as Record<string, unknown>).current_period_end as number) * 1000)
        : undefined,
      updatedAt: sql`NOW()`,
    })
    .where(eq(subscriptions.userId, userId))
}

async function handleInvoiceFailed(_invoice: Stripe.Invoice) {
  // Payment failed — set status to past_due
  // Stripe's Smart Retries will attempt again automatically
  const customerId = _invoice.customer as string
  if (!customerId) return

  await db
    .update(subscriptions)
    .set({
      status: "past_due",
      updatedAt: sql`NOW()`,
    })
    .where(eq(subscriptions.stripeCustomerId, customerId))
}

/** Infer plan from the Checkout Session's line item metadata if not in session.metadata */
async function inferPlan(session: Stripe.Checkout.Session): Promise<string | null> {
  const items = session.line_items?.data
  if (!items || items.length === 0) return null

  const priceId = items[0].price?.id
  if (!priceId) return null

  const price = await getStripe().prices.retrieve(priceId)
  return (price.metadata.plan as string) || null
}
