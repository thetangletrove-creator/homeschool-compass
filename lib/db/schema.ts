import {
  boolean,
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core"

/**
 * App tables (public schema). Managed Neon Auth owns the `neon_auth` user/
 * session tables; we never redefine those here. Every table carries a plain
 * `userId` (the Neon Auth user uuid, stored as text) for per-user scoping. No
 * foreign keys by design — scoping is enforced in queries via getUserId().
 */

// Bills a user is tracking. billId references the (mock/Python-backed) bill id.
export const watchlist = pgTable(
  "watchlist",
  {
    id: serial("id").primaryKey(),
    userId: text("userId").notNull(),
    billId: text("billId").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    byUser: index("watchlist_user_idx").on(t.userId),
    uniqueBill: unique("watchlist_user_bill_unique").on(t.userId, t.billId),
  }),
)

// Per-user alert configuration that drives notifications from the pipeline.
export const alertPreferences = pgTable("alert_preferences", {
  userId: text("userId").primaryKey(),
  // State codes the user wants to monitor, e.g. ["CA","TX"].
  states: jsonb("states").$type<string[]>().notNull().default([]),
  // Which impact types to alert on: "increase" | "decrease" | "neutral".
  impactTypes: jsonb("impactTypes")
    .$type<string[]>()
    .notNull()
    .default(["increase"]),
  esaOnly: boolean("esaOnly").notNull().default(false),
  channelEmail: boolean("channelEmail").notNull().default(true),
  channelSms: boolean("channelSms").notNull().default(false),
  weeklyDigest: boolean("weeklyDigest").notNull().default(true),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// Stripe subscription mirror, kept in sync by the webhook.
export const subscriptions = pgTable(
  "subscriptions",
  {
    userId: text("userId").primaryKey(),
    stripeCustomerId: text("stripeCustomerId"),
    stripeSubscriptionId: text("stripeSubscriptionId"),
    // "tracker" | "esa" | null (free)
    plan: text("plan"),
    // Stripe status: active, trialing, past_due, canceled, etc.
    status: text("status").notNull().default("inactive"),
    currentPeriodEnd: timestamp("currentPeriodEnd", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").notNull().default(false),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    byCustomer: index("subscriptions_customer_idx").on(t.stripeCustomerId),
  }),
)

export type Watchlist = typeof watchlist.$inferSelect
export type AlertPreferences = typeof alertPreferences.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
