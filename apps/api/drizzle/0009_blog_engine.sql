ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "blog_approval_mode" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "blog_categories" (
  "id" serial PRIMARY KEY,
  "site_id" integer NOT NULL REFERENCES "sites"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "blog_categories_site_slug_unique" ON "blog_categories" ("site_id", "slug");

CREATE TABLE IF NOT EXISTS "blog_tags" (
  "id" serial PRIMARY KEY,
  "site_id" integer NOT NULL REFERENCES "sites"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "blog_tags_site_slug_unique" ON "blog_tags" ("site_id", "slug");

CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id" serial PRIMARY KEY,
  "site_id" integer NOT NULL REFERENCES "sites"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "content" text,
  "slug" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "date_published" timestamp,
  "header_image" text,
  "approval_notes" text,
  "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_site_slug_unique" ON "blog_posts" ("site_id", "slug");

CREATE TABLE IF NOT EXISTS "blog_post_authors" (
  "id" serial PRIMARY KEY,
  "post_id" integer NOT NULL REFERENCES "blog_posts"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "blog_post_authors_post_user_unique" ON "blog_post_authors" ("post_id", "user_id");

CREATE TABLE IF NOT EXISTS "blog_post_categories" (
  "id" serial PRIMARY KEY,
  "post_id" integer NOT NULL REFERENCES "blog_posts"("id") ON DELETE CASCADE,
  "category_id" integer NOT NULL REFERENCES "blog_categories"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "blog_post_categories_post_category_unique" ON "blog_post_categories" ("post_id", "category_id");

CREATE TABLE IF NOT EXISTS "blog_post_tags" (
  "id" serial PRIMARY KEY,
  "post_id" integer NOT NULL REFERENCES "blog_posts"("id") ON DELETE CASCADE,
  "tag_id" integer NOT NULL REFERENCES "blog_tags"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "blog_post_tags_post_tag_unique" ON "blog_post_tags" ("post_id", "tag_id");
