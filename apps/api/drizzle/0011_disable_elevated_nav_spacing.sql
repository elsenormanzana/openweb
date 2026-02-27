ALTER TABLE "pages"
ADD COLUMN IF NOT EXISTS "disable_elevated_nav_spacing" boolean DEFAULT false NOT NULL;
