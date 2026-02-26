CREATE TABLE IF NOT EXISTS "media_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" text,
	"url" text NOT NULL,
	"provider" text DEFAULT 'local' NOT NULL,
	"provider_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "storage_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'local' NOT NULL,
	"config" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "seo_keywords" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "og_image" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "no_index" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "canonical_url" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "seo_config" text;