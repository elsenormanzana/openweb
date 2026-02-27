ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "auth_provider" text;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "auth_provider_id" text;

CREATE UNIQUE INDEX IF NOT EXISTS "users_auth_provider_provider_id_unique"
ON "users" ("auth_provider", "auth_provider_id")
WHERE "auth_provider" IS NOT NULL AND "auth_provider_id" IS NOT NULL;
