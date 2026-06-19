CREATE TABLE "alert_preferences" (
	"userId" text PRIMARY KEY NOT NULL,
	"states" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"impactTypes" jsonb DEFAULT '["increase"]'::jsonb NOT NULL,
	"esaOnly" boolean DEFAULT false NOT NULL,
	"channelEmail" boolean DEFAULT true NOT NULL,
	"channelSms" boolean DEFAULT false NOT NULL,
	"weeklyDigest" boolean DEFAULT true NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_full_text" (
	"bill_id" text PRIMARY KEY NOT NULL,
	"full_text" text NOT NULL,
	"text_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" text PRIMARY KEY NOT NULL,
	"state_code" text NOT NULL,
	"number" text NOT NULL,
	"title" text NOT NULL,
	"date" timestamp NOT NULL,
	"status_step" integer NOT NULL,
	"impact" text NOT NULL,
	"impact_summary" text,
	"delta" text,
	"action_required" text,
	"esa_related" boolean DEFAULT false,
	"analysis" jsonb,
	"legiscan_bill_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dlq" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"error_message" text NOT NULL,
	"first_seen_at" timestamp DEFAULT now(),
	"last_attempted_at" timestamp,
	"archived" boolean DEFAULT false,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pipeline_metadata" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "states" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"score" integer NOT NULL,
	"subscores" jsonb,
	"level" text NOT NULL,
	"esa_active" boolean DEFAULT false,
	"esa_name" text,
	"esa_max_award" text,
	"esa_eligibility" text,
	"esa_documentation" jsonb,
	"esa_deadline" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"userId" text PRIMARY KEY NOT NULL,
	"stripeCustomerId" text,
	"stripeSubscriptionId" text,
	"plan" text,
	"status" text DEFAULT 'inactive' NOT NULL,
	"currentPeriodEnd" timestamp with time zone,
	"cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"fetch_key" text NOT NULL,
	"status" text NOT NULL,
	"errors" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sync_log_fetch_key_unique" UNIQUE("fetch_key"),
	CONSTRAINT "idx_sync_log_fetch_key" UNIQUE("fetch_key")
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"billId" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_user_bill_unique" UNIQUE("userId","billId")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"received_at" timestamp DEFAULT now(),
	CONSTRAINT "webhook_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "bill_full_text" ADD CONSTRAINT "bill_full_text_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_state_code_states_code_fk" FOREIGN KEY ("state_code") REFERENCES "public"."states"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bills_state" ON "bills" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX "idx_bills_legiscan" ON "bills" USING btree ("legiscan_bill_id");--> statement-breakpoint
CREATE INDEX "subscriptions_customer_idx" ON "subscriptions" USING btree ("stripeCustomerId");--> statement-breakpoint
CREATE INDEX "watchlist_user_idx" ON "watchlist" USING btree ("userId");