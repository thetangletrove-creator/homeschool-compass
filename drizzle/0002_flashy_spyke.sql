CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"service_date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"subject" text NOT NULL,
	"hourly_rate" numeric(10, 2) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoice_magic_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"parent_id" text NOT NULL,
	"student_name" text NOT NULL,
	"state_code" text NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "invoice_magic_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "provider_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" text NOT NULL,
	"magic_link_id" uuid,
	"provider_id" uuid,
	"parent_id" text NOT NULL,
	"student_name" text NOT NULL,
	"state_code" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"total_due" numeric(10, 2) NOT NULL,
	"payment_method" text,
	"parent_already_paid" boolean DEFAULT false NOT NULL,
	"payment_last_four" text,
	"is_paid_in_full" boolean DEFAULT false NOT NULL,
	"provider_name" text NOT NULL,
	"provider_address" text NOT NULL,
	"provider_credentials" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now(),
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "provider_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legal_name" text NOT NULL,
	"business_name" text,
	"address" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"credentials" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_provider_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."provider_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_invoices" ADD CONSTRAINT "provider_invoices_magic_link_id_invoice_magic_links_id_fk" FOREIGN KEY ("magic_link_id") REFERENCES "public"."invoice_magic_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_invoices" ADD CONSTRAINT "provider_invoices_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;