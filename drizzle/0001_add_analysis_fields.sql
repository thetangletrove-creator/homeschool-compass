-- Migration 0001: Add analysis fields for Gemini enrichment pipeline
-- Adds columns to bills table for storing Gemini classification results
-- and indexes for efficient filtering + backfill tracking.

--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "impact_confidence" real;
--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "esa_related_confidence" real;
--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "effective_date" text;
--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "target_audience" text;
--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "analyzed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "analysis_version" text;
--> statement-breakpoint
CREATE INDEX "idx_bills_impact" ON "bills" USING btree ("impact");
--> statement-breakpoint
CREATE INDEX "idx_bills_esa_related" ON "bills" USING btree ("esa_related");
--> statement-breakpoint
CREATE INDEX "idx_bills_analyzed_at" ON "bills" USING btree ("analyzed_at");
