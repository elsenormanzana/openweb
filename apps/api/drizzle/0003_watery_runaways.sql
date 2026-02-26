CREATE TABLE IF NOT EXISTS "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"nav_type" text DEFAULT 'navbar' NOT NULL,
	"nav_config" text,
	"footer_config" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "ignore_global_layout" boolean DEFAULT false NOT NULL;
