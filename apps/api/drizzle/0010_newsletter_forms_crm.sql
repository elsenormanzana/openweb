CREATE TABLE IF NOT EXISTS "forms" (
  "id" serial PRIMARY KEY NOT NULL,
  "site_id" integer NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'active',
  "submit_label" text NOT NULL DEFAULT 'Submit',
  "success_message" text NOT NULL DEFAULT 'Thanks, we received your submission.',
  "fields" text NOT NULL DEFAULT '[]',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "forms_site_slug_unique" UNIQUE("site_id","slug")
);

CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
  "id" serial PRIMARY KEY NOT NULL,
  "site_id" integer NOT NULL,
  "email" text NOT NULL,
  "name" text,
  "status" text NOT NULL DEFAULT 'subscribed',
  "source" text NOT NULL DEFAULT 'newsletter',
  "meta" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "newsletter_subscribers_site_email_unique" UNIQUE("site_id","email")
);

CREATE TABLE IF NOT EXISTS "crm_channels" (
  "id" serial PRIMARY KEY NOT NULL,
  "site_id" integer NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "crm_channels_site_slug_unique" UNIQUE("site_id","slug")
);

CREATE TABLE IF NOT EXISTS "crm_leads" (
  "id" serial PRIMARY KEY NOT NULL,
  "site_id" integer NOT NULL,
  "form_id" integer,
  "channel_id" integer,
  "source" text NOT NULL DEFAULT 'custom',
  "status" text NOT NULL DEFAULT 'new',
  "name" text,
  "email" text,
  "phone" text,
  "company" text,
  "notes" text,
  "payload" text NOT NULL DEFAULT '{}',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "forms" ADD CONSTRAINT "forms_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "crm_channels" ADD CONSTRAINT "crm_channels_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_channel_id_crm_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."crm_channels"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
