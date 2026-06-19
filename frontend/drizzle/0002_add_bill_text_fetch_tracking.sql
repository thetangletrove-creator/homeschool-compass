-- Migration 0002: Add fetch tracking columns to bill_full_text table
-- Enables resume-cursor backfill with fetch_status, rate limiting, and error tracking.

--> statement-breakpoint
ALTER TABLE "bill_full_text" ADD COLUMN "fetch_status" text DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE "bill_full_text" ADD COLUMN "fetch_attempts" integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "bill_full_text" ADD COLUMN "last_fetch_at" timestamp;
--> statement-breakpoint
ALTER TABLE "bill_full_text" ADD COLUMN "error_message" text;
--> statement-breakpoint
CREATE INDEX "idx_bill_text_fetch_status" ON "bill_full_text" USING btree ("fetch_status");
