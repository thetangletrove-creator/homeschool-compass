import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
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

// ── Pipeline data tables ────────────────────────────────────────────────

// Type helpers for JSONB columns on the states table
export type EsaProgram = {
  name: string
  status: "active" | "pending_launch" | "capped" | "blocked" | "paused" | "defunct"
  portal_url: string | null
  application_url: string | null
  platform: string | null
  max_award: string | null
  eligibility: string | null
  deadline: string | null
  documents_required: string[]
  forms: {
    name: string
    url: string | null
    type: "PDF" | "web_portal" | "form"
    access: "public" | "login_required" | "unknown"
  }[]
  deadlines: {
    label?: string
    type: "application_window" | "report" | "renewal" | "other"
    due: string | null
    open: string | null
    close: string | null
    frequency: string | null
    period_start: string | null
    period_end: string | null
    note: string | null
  }[]
}

export type ComplianceForms = {
  notification_url: string | null
  notification_form_url: string | null
  assessment_rules: string | null
  assessment_form_url: string | null
  immunization_rules: string | null
  instruction_days: string | null
  recordkeeping: string | null
  other_forms: {
    name: string
    url: string | null
    type: "PDF" | "web_portal" | "form"
    access: "public" | "login_required" | "unknown"
  }[]
}

export const states = pgTable(
  "states",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull(),
    score: integer("score").notNull(),
    subscores: jsonb("subscores"),
    level: text("level", {
      enum: ["No Notice", "Low Regulation", "Moderate", "High"],
    }).notNull(),
    esaActive: boolean("esa_active").default(false),
    esaName: text("esa_name"),
    esaMaxAward: text("esa_max_award"),
    esaEligibility: text("esa_eligibility"),
    esaDocumentation: jsonb("esa_documentation"),
    esaDeadline: text("esa_deadline"),
    // Phase 3: Structured program data with multi-program support
    esaPrograms: jsonb("esa_programs").$type<EsaProgram[]>(),
    // Phase 3: Generic compliance forms/links for ALL states (ESA and non-ESA)
    complianceForms: jsonb("compliance_forms").$type<ComplianceForms>(),
    // Phase 3: URL freshness tracking for the quarterly re-check cron
    esaUrlsVerifiedAt: timestamp("esa_urls_verified_at"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    esaProgramsIdx: index("idx_states_esa_programs").on(t.esaPrograms),
    complianceFormsIdx: index("idx_states_compliance_forms").on(t.complianceForms),
  }),
)

export const bills = pgTable(
  "bills",
  {
    id: text("id").primaryKey(),
    stateCode: text("state_code")
      .notNull()
      .references(() => states.code, { onDelete: "cascade" }),
    number: text("number").notNull(),
    title: text("title").notNull(),
    date: timestamp("date").notNull(),
    statusStep: integer("status_step").notNull(),
    impact: text("impact", {
      enum: ["increase", "decrease", "neutral"],
    }).notNull(),
    impactSummary: text("impact_summary"),
    delta: text("delta"),
    actionRequired: text("action_required", {
      enum: ["call", "donate", "email", "share", "none"],
    }),
    esaRelated: boolean("esa_related").default(false),
    analysis: jsonb("analysis"),
    legiscanBillId: integer("legiscan_bill_id"),
    impactConfidence: real("impact_confidence"),
    esaRelatedConfidence: real("esa_related_confidence"),
    effectiveDate: text("effective_date"),
    targetAudience: text("target_audience"),
    analyzedAt: timestamp("analyzed_at"),
    analysisVersion: text("analysis_version"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    stateIdx: index("idx_bills_state").on(t.stateCode),
    legiscanIdx: index("idx_bills_legiscan").on(t.legiscanBillId),
    impactIdx: index("idx_bills_impact").on(t.impact),
    esaIdx: index("idx_bills_esa_related").on(t.esaRelated),
    analyzedAtIdx: index("idx_bills_analyzed_at").on(t.analyzedAt),
  }),
)

export const billFullText = pgTable("bill_full_text", {
  billId: text("bill_id")
    .primaryKey()
    .references(() => bills.id, { onDelete: "cascade" }),
  fullText: text("full_text").notNull(),
  textUrl: text("text_url"),
  fetchStatus: text("fetch_status").default("pending"),
  fetchAttempts: integer("fetch_attempts").default(0),
  lastFetchAt: timestamp("last_fetch_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const pipelineMetadata = pgTable("pipeline_metadata", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const dlq = pgTable("dlq", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  rawPayload: jsonb("raw_payload").notNull(),
  errorMessage: text("error_message").notNull(),
  firstSeenAt: timestamp("first_seen_at"),
  lastAttemptedAt: timestamp("last_attempted_at"),
  archived: boolean("archived").default(false),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const syncLog = pgTable(
  "sync_log",
  {
    id: serial("id").primaryKey(),
    fetchKey: text("fetch_key").notNull().unique(),
    status: text("status").notNull(),
    errors: text("errors"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    fetchKeyIdx: unique("idx_sync_log_fetch_key").on(t.fetchKey),
  }),
)

export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  receivedAt: timestamp("received_at").defaultNow(),
})

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
