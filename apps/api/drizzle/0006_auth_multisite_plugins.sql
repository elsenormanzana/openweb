-- Create sites table
CREATE TABLE IF NOT EXISTS "sites" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "domain" text,
  "sub_domain" text,
  "routing_mode" text DEFAULT 'url' NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "sites_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

-- Insert default site
INSERT INTO "sites" ("name", "slug", "is_default") VALUES ('Default', 'default', true) ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "role" text DEFAULT 'subscriber' NOT NULL,
  "site_id" integer REFERENCES "sites"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint

-- Create plugins table
CREATE TABLE IF NOT EXISTS "plugins" (
  "id" serial PRIMARY KEY NOT NULL,
  "site_id" integer NOT NULL REFERENCES "sites"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "server_code" text,
  "client_code" text,
  "enabled" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "plugins_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

-- Add site_id to existing tables (nullable first)
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "site_id" integer REFERENCES "sites"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "site_id" integer REFERENCES "sites"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "storage_config" ADD COLUMN IF NOT EXISTS "site_id" integer REFERENCES "sites"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN IF NOT EXISTS "site_id" integer REFERENCES "sites"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "theme_packs" ADD COLUMN IF NOT EXISTS "site_id" integer REFERENCES "sites"("id") ON DELETE CASCADE;
--> statement-breakpoint

-- Set all existing rows to default site (id=1)
UPDATE "pages" SET "site_id" = 1 WHERE "site_id" IS NULL;
--> statement-breakpoint
UPDATE "site_settings" SET "site_id" = 1 WHERE "site_id" IS NULL;
--> statement-breakpoint
UPDATE "storage_config" SET "site_id" = 1 WHERE "site_id" IS NULL;
--> statement-breakpoint
UPDATE "media_items" SET "site_id" = 1 WHERE "site_id" IS NULL;
--> statement-breakpoint
UPDATE "theme_packs" SET "site_id" = 1 WHERE "site_id" IS NULL;
--> statement-breakpoint

-- Make site_id NOT NULL
ALTER TABLE "pages" ALTER COLUMN "site_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "site_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "storage_config" ALTER COLUMN "site_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "media_items" ALTER COLUMN "site_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "theme_packs" ALTER COLUMN "site_id" SET NOT NULL;
--> statement-breakpoint

-- Drop old pages slug unique, add composite unique per site
ALTER TABLE "pages" DROP CONSTRAINT IF EXISTS "pages_slug_unique";
--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_site_slug_unique" UNIQUE("site_id", "slug");
