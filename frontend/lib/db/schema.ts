import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  unique,
  uuid,
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

// Phase B5: Non-ESA funding programs (tax credits, vouchers, scholarships, allotments, EFTC)
export type NonEsaProgram = {
  name: string
  program_type:
    | "allotment"
    | "deduction"
    | "refundable_tax_credit"
    | "non_refundable_tax_credit"
    | "voucher"
    | "scholarship"
    | "tuitioning"
    | "efct"
    | "pending"
    | "other"
  amount: string | null
  income_cap: string | null
  homeschool_eligible: boolean
  url: string | null
  application_url: string | null
  short_description: string | null
  application_method: string | null
  application_window: string | null
  stacks_with: string | null
  notes: string | null
  status: "active" | "pending_launch" | "capped" | "expired" | "proposed" | "blocked" | "defunct"
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
    // Phase B5: Non-ESA funding programs (tax credits, vouchers, scholarships, allotments, EFTC)
    nonEsaPrograms: jsonb("non_esa_programs").$type<NonEsaProgram[]>(),
    // Phase B5: Freshness tracking for non-ESA program data
    nonEsaVerifiedAt: timestamp("non_esa_verified_at"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    esaProgramsIdx: index("idx_states_esa_programs").on(t.esaPrograms),
    complianceFormsIdx: index("idx_states_compliance_forms").on(t.complianceForms),
    nonEsaProgramsIdx: index("idx_states_non_esa_programs").on(t.nonEsaPrograms),
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

// ── Provider Portal Tables ────────────────────────────────────────────────
// Lightweight index for independent providers (tutors, therapists, music teachers).
// Created on first magic-link use — no signup required.
export const providers = pgTable("providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  legalName: text("legal_name").notNull(),
  businessName: text("business_name"),
  address: text("address").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  credentials: text("credentials").notNull(), // "State Teaching Cert #XXXXX" or degree
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

// Magic links let parents invite providers to submit an invoice.
// Single-use, expiring. Encrypted metadata: parentId, studentName, stateCode.
export const invoiceMagicLinks = pgTable("invoice_magic_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(), // URL-safe random token
  parentId: text("parent_id").notNull(), // Neon Auth user ID
  studentName: text("student_name").notNull(),
  stateCode: text("state_code").notNull(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export type InvoiceStatus = "draft" | "submitted" | "paid"
export type PaymentMethod = "credit_card" | "check" | "ach" | "portal_direct" | "other"

// Invoice record: provider submits via magic link, parent sees in their dashboard.
export const providerInvoices = pgTable("provider_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").notNull().unique(), // e.g. "HC-98231"
  magicLinkId: uuid("magic_link_id").references(() => invoiceMagicLinks.id),
  providerId: uuid("provider_id").references(() => providers.id),
  parentId: text("parent_id").notNull(),
  studentName: text("student_name").notNull(),
  stateCode: text("state_code").notNull(),
  // Status
  status: text("status", { enum: ["draft", "submitted", "paid"] })
    .$type<InvoiceStatus>()
    .notNull()
    .default("submitted"),
  // Payment
  totalDue: numeric("total_due", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").$type<PaymentMethod>(),
  parentAlreadyPaid: boolean("parent_already_paid").notNull().default(false),
  paymentLastFour: text("payment_last_four"), // Last 4 digits of card
  isPaidInFull: boolean("is_paid_in_full").notNull().default(false),
  // Provider info snapshot (so historical invoices stay accurate)
  providerName: text("provider_name").notNull(),
  providerAddress: text("provider_address").notNull(),
  providerCredentials: text("provider_credentials").notNull(),
  // ZK encryption: RSA-OAEP+AES-GCM hybrid encrypted blob of sensitive
  // provider fields (credentials, phone, email). Server never sees plaintext.
  // EncryptedPayload JSON: { encryptedKey, iv, tag, ciphertext }
  encryptedProfile: text("encrypted_profile"),
  // Timestamps
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

// Individual tutoring sessions line items.
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => providerInvoices.id, { onDelete: "cascade" }),
  serviceDate: text("service_date").notNull(), // "2026-06-15"
  startTime: text("start_time").notNull(), // "04:00 PM"
  endTime: text("end_time").notNull(), // "05:00 PM"
  subject: text("subject").notNull(), // "Algebra II Instruction"
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export type Provider = typeof providers.$inferSelect
export type InvoiceMagicLink = typeof invoiceMagicLinks.$inferSelect
export type ProviderInvoice = typeof providerInvoices.$inferSelect
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect
