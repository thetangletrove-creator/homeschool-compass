# Stripe Integration Reference — Homeschool Compass
## Billing, Subscriptions, Webhooks

**Source:** Stripe Documentation (docs.stripe.com)
**Filed:** 2026-06-16

---

## Keys (Doppler)

| Name | Value |
|------|-------|
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...SaSS1` → Doppler |
| `STRIPE_SECRET_KEY` | `sk_test_...0szw` → Doppler |
| `STRIPE_BACKUP_CODE` | `ulbl-yfnp-qdoj-cbvv-avge` → Doppler |
| `NEON_DATABASE_URL` | `postgresql://neondb_owner:***@ep-round-breeze-...` → Doppler |

---

## Quickstart: Subscriptions with Checkout

### Product + Price Setup
Create products and prices in the Stripe Dashboard. For $29/yr SaaS:

1. **Product:** "Homeschool Compass — Real-Time Alerts"
2. **Price (recurring):** $29.00/year, interval=year
3. **Price ID:** `price_xxxxx` (used in Checkout Session)

### Create Checkout Session (server-side)

```ruby
post '/create-checkout-session' do
  prices = client.v1.prices.list(
    lookup_keys: [params['lookup_key']],
    expand: ['data.product']
  )
  session = client.v1.checkout.sessions.create(
    mode: 'subscription',
    line_items: [{ quantity: 1, price: prices.data[0].id }],
    success_url: YOUR_DOMAIN + '/success.html?session_id={CHECKOUT_SESSION_ID}'
  )
  redirect session.url, 303
end
```

### Webhook Endpoint

```ruby
post '/webhook' do
  webhook_secret = 'whsec_...'
  payload = request.body.read
  sig_header = request.env['HTTP_STRIPE_SIGNATURE']
  event = Stripe::Webhook.construct_event(payload, sig_header, webhook_secret)

  case event.type
  when 'customer.subscription.created', 'customer.subscription.updated'
    # Grant/update access
  when 'customer.subscription.deleted'
    # Revoke access
  when 'invoice.paid'
    # Confirm payment received
  when 'invoice.payment_failed'
    # Notify customer, collect new method
  end

  status 200
end
```

### Key Subscription Events (Webhooks)

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Status may be `incomplete` if auth needed |
| `customer.subscription.updated` | Renewal, plan change, status transition |
| `customer.subscription.deleted` | Revoke access |
| `invoice.paid` | Payment succeeded — provision access |
| `invoice.payment_failed` | Notify customer, enable Smart Retries |
| `invoice.payment_action_required` | 3DS — notify customer to authenticate |
| `customer.subscription.trial_will_end` | 3 days before trial ends |

### Subscription Statuses

| Status | Meaning |
|--------|---------|
| `trialing` | In trial — safe to provision |
| `active` | Good standing |
| `incomplete` | Needs payment within 23 hours |
| `incomplete_expired` | Payment failed, no retry |
| `past_due` | Latest invoice unpaid — Smart Retries |
| `canceled` | Terminal — access revoked |
| `unpaid` | Latest invoice unpaid, no retries |

---

## Neon PostgreSQL

| Property | Value |
|----------|-------|
| Type | PostgreSQL (Neon Serverless) |
| Connection | `postgresql://neondb_owner:***@ep-round-breeze-adfqok7x.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require` |
| Doppler Key | `NEON_DATABASE_URL` |

---

## Test Cards

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0025 0000 3155` | 3DS required |
| `4000 0000 0000 9995` | Declined |

---

## Integration Plan Mapping (Phase D)

The Homeschool Compass Phase D (Products & Pricing) maps to:

1. **Create Products/Prices** in Stripe Dashboard
2. **Build Checkout Session** on the web frontend
3. **Subscribe webhook** to listen for `customer.subscription.*` and `invoice.*` events
4. **Set up Customer Portal** for self-service (upgrades/cancels)
5. **Provision access** based on subscription status + tier (free vs paid)

Pricing tiers to create:
- **Free:** $0 — state map, 1 state
- **Real-Time Compass:** $29/year — all states, real-time alerts, ESA + interstate
