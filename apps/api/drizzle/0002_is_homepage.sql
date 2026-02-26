ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "is_homepage" boolean DEFAULT false NOT NULL;
UPDATE "pages" SET "is_homepage" = true WHERE "slug" = 'home';
