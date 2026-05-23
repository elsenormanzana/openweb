import "dotenv/config";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastifyRateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { db, getDatabaseUrl } from "./db/index.js";
import { asc, desc, eq, ne, and, isNull, sql } from "drizzle-orm";
import {
  pages, themePacks, siteSettings, storageConfig, mediaItems, sites, users, plugins,
  blogPosts, blogCategories, blogTags, blogPostAuthors, blogPostCategories, blogPostTags,
  forms, newsletterSubscribers, crmChannels, crmLeads, anthropicUsage,
} from "./db/schema.js";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { existsSync, mkdirSync } from "node:fs";
import { createReadStream } from "node:fs";
import { writeFile, unlink, readdir, stat, rm, mkdtemp, cp, readFile } from "node:fs/promises";
import { join, extname, dirname, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import postgres from "postgres";
import sharp from "sharp";
import { hashPassword, verifyPassword, requireAuth, type JwtPayload } from "./auth.js";

// ── Web SSR cache invalidation ───────────────────────────────────────────────
// The web container holds a short-lived HTML cache of rendered public pages.
// When content changes, tell it to drop that cache so the next visitor sees the
// update at once. Fire-and-forget — a missed purge only means a <=60s delay.
const WEB_PURGE_URL = process.env.WEB_PURGE_URL || "http://web:80/__purge";
function purgeWebCache() {
  fetch(WEB_PURGE_URL, { method: "POST", signal: AbortSignal.timeout(2000) }).catch(() => {});
}

declare module "fastify" {
  interface FastifyRequest {
    siteId: number;
  }
}

const app = Fastify({ logger: true, bodyLimit: 104857600 });

await app.register(cors, { origin: true });
await app.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute'
});
await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? "CHANGE_ME",
  sign: { expiresIn: "24h" },
});

app.addHook("onResponse", async (request) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method) && request.url.startsWith("/api/")) {
    purgeWebCache();
  }
});

// Runtime compatibility patch: ensure latest pages column exists even if migration was missed.
await db.execute(sql.raw(`
  ALTER TABLE "pages"
  ADD COLUMN IF NOT EXISTS "disable_elevated_nav_spacing" boolean DEFAULT false NOT NULL
`));
await db.execute(sql.raw(`ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "theme" text NOT NULL DEFAULT 'auto'`));
await db.execute(sql.raw(`ALTER TABLE "pages" ALTER COLUMN "theme" SET DEFAULT 'auto'`));

// Runtime compatibility patch for SSO user linkage fields.
await db.execute(sql.raw(`
  ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "auth_provider" text
`));
await db.execute(sql.raw(`
  ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "auth_provider_id" text
`));
await db.execute(sql.raw(`
  CREATE UNIQUE INDEX IF NOT EXISTS "users_auth_provider_provider_id_unique"
  ON "users" ("auth_provider", "auth_provider_id")
  WHERE "auth_provider" IS NOT NULL AND "auth_provider_id" IS NOT NULL
`));

// ── CRM deep-relational schema patches ────────────────────────────────────────

await db.execute(sql.raw(`ALTER TABLE "crm_channels" ADD COLUMN IF NOT EXISTS "channel_type" text NOT NULL DEFAULT 'custom'`));
await db.execute(sql.raw(`ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "archived" boolean NOT NULL DEFAULT false`));
await db.execute(sql.raw(`ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "tags" text NOT NULL DEFAULT '[]'`));
await db.execute(sql.raw(`ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "custom_fields" text NOT NULL DEFAULT '{}'`));
await db.execute(sql.raw(`ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "score" integer NOT NULL DEFAULT 0`));

// Forms: sections (grouped fields) + per-form layout (single page vs multi-step).
await db.execute(sql.raw(`ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "sections" text NOT NULL DEFAULT '[]'`));
await db.execute(sql.raw(`ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "layout" text NOT NULL DEFAULT 'single'`));
// Forms: per-form art style (theme) + behavior settings (Google Forms parity).
await db.execute(sql.raw(`ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "theme" text NOT NULL DEFAULT '{}'`));
await db.execute(sql.raw(`ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "settings" text NOT NULL DEFAULT '{}'`));
// Forms: multilingual support — primary language + per-language translations.
await db.execute(sql.raw(`ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "primary_language" text NOT NULL DEFAULT 'en'`));
await db.execute(sql.raw(`ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "translations" text NOT NULL DEFAULT '{}'`));

await db.execute(sql.raw(`
  CREATE TABLE IF NOT EXISTS "crm_lead_activities" (
    "id" serial PRIMARY KEY,
    "lead_id" integer NOT NULL REFERENCES "crm_leads"("id") ON DELETE CASCADE,
    "site_id" integer NOT NULL,
    "type" text NOT NULL DEFAULT 'note',
    "content" text,
    "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  )
`));

await db.execute(sql.raw(`
  CREATE TABLE IF NOT EXISTS "crm_channels" (
    "id" serial PRIMARY KEY,
    "site_id" integer NOT NULL,
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "description" text,
    "is_active" boolean NOT NULL DEFAULT true,
    "channel_type" text NOT NULL DEFAULT 'custom',
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
  )
`));

await db.execute(sql.raw(`
  CREATE TABLE IF NOT EXISTS "crm_leads" (
    "id" serial PRIMARY KEY,
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
    "archived" boolean NOT NULL DEFAULT false,
    "tags" text NOT NULL DEFAULT '[]',
    "custom_fields" text NOT NULL DEFAULT '{}',
    "score" integer NOT NULL DEFAULT 0,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
  )
`));

await db.execute(sql.raw(`
  CREATE TABLE IF NOT EXISTS "ssl_server_configs" (
    "id" serial PRIMARY KEY,
    "site_id" integer NOT NULL REFERENCES "sites"("id") ON DELETE CASCADE,
    "host" text NOT NULL,
    "enabled" boolean NOT NULL DEFAULT false,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now(),
    UNIQUE ("site_id")
  )
`));

await db.execute(sql.raw(`
  CREATE TABLE IF NOT EXISTS "anthropic_usage" (
    "id" serial PRIMARY KEY,
    "site_id" integer REFERENCES "sites"("id") ON DELETE SET NULL,
    "endpoint" text NOT NULL,
    "model" text NOT NULL,
    "input_tokens" integer NOT NULL DEFAULT 0,
    "output_tokens" integer NOT NULL DEFAULT 0,
    "created_at" timestamp NOT NULL DEFAULT now()
  )
`));



// ── Site detection hook ────────────────────────────────────────────────────────

app.addHook("onRequest", async (req) => {
  const allSites = await db.select().from(sites);
  // The web SSR server calls the API server-to-server; `fetch` forbids setting
  // the Host header, so it forwards the visitor's host as X-Site-Host instead.
  const siteHostHeader = req.headers["x-site-host"];
  const forwardedHost = Array.isArray(siteHostHeader) ? siteHostHeader[0] : siteHostHeader;
  const host = (forwardedHost || req.hostname).toLowerCase();

  // 1. Determine natural site ID based on domain or subdomain
  let naturalSiteId = allSites.find((s) => s.isDefault)?.id ?? 1;
  const byDomain = allSites.find((s) => s.domain?.toLowerCase() === host);
  const sub = host.split(".")[0];
  const bySub = allSites.find((s) => s.subDomain?.toLowerCase() === sub);

  if (byDomain) {
    naturalSiteId = byDomain.id;
  } else if (bySub) {
    naturalSiteId = bySub.id;
  }

  // 2. (Removed) Nginx cache mapping

  // 3. Set the context site ID, applying the X-Site-ID header override if present
  req.siteId = naturalSiteId;
  const headerSite = req.headers["x-site-id"];
  const siteHeaderRaw = Array.isArray(headerSite) ? headerSite[0] : headerSite;
  const siteFromHeader = Number(siteHeaderRaw);
  if (siteHeaderRaw && Number.isInteger(siteFromHeader) && siteFromHeader > 0) {
    const [siteFromId] = await db.select().from(sites).where(eq(sites.id, siteFromHeader)).limit(1);
    if (siteFromId) {
      req.siteId = siteFromHeader;
    }
  }
});

app.get("/health", async () => ({ ok: true }));

// ── Auth routes ────────────────────────────────────────────────────────────────

app.get("/api/setup/needed", async () => {
  const [user] = await db.select().from(users).limit(1);
  return { needed: !user };
});

app.post("/api/setup", {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute'
    }
  }
}, async (req, reply) => {
  const [existing] = await db.select().from(users).limit(1);
  if (existing) return reply.status(400).send({ error: "Setup already complete" });
  const body = req.body as { email: string; password: string };
  if (!body.email?.trim() || !body.password?.trim()) {
    return reply.status(400).send({ error: "email and password required" });
  }
  const passwordHash = await hashPassword(body.password);
  const [user] = await db.insert(users).values({
    email: body.email.trim().toLowerCase(),
    passwordHash,
    role: "admin",
    siteId: null,
  }).returning();
  const token = app.jwt.sign({ sub: user.id, email: user.email, role: user.role, siteId: user.siteId } as JwtPayload);
  return { token, user: { id: user.id, email: user.email, role: user.role, siteId: user.siteId } };
});

app.post("/api/auth/login", {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute'
    }
  }
}, async (req, reply) => {
  const body = req.body as { email: string; password: string };
  if (!body.email?.trim() || !body.password?.trim()) {
    return reply.status(400).send({ error: "email and password required" });
  }
  const [user] = await db.select().from(users).where(eq(users.email, body.email.trim().toLowerCase())).limit(1);
  if (!user) return reply.status(401).send({ error: "Invalid credentials" });
  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) return reply.status(401).send({ error: "Invalid credentials" });
  const token = app.jwt.sign({ sub: user.id, email: user.email, role: user.role, siteId: user.siteId } as JwtPayload);
  return { token, user: { id: user.id, email: user.email, role: user.role, siteId: user.siteId } };
});

app.get("/api/auth/me", { preHandler: requireAuth() }, async (req) => {
  return req.user as JwtPayload;
});

function parseJsonArray<T>(value: string | null): T[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as T[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toSafeUser(row: typeof users.$inferSelect) {
  const { passwordHash: _, siteRoles, socialMedia, ...u } = row;
  return {
    ...u,
    siteRoles: parseJsonArray<{ siteId: number; role: string }>(siteRoles),
    socialMedia: parseJsonArray<{ platform: string; url: string }>(socialMedia),
  };
}

type SsoProvider = "google" | "microsoft" | "oidc";
type EnabledSsoProvider = {
  id: SsoProvider;
  label: string;
};

type PendingSsoState = {
  provider: SsoProvider;
  redirectTo: string;
  expiresAt: number;
};

const pendingSsoStates = new Map<string, PendingSsoState>();

function firstHeaderValue(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function publicBaseUrl(req: import("fastify").FastifyRequest) {
  const proto = firstHeaderValue(req.headers["x-forwarded-proto"]) || req.protocol || "http";
  const host = firstHeaderValue(req.headers["x-forwarded-host"]) || firstHeaderValue(req.headers.host) || req.hostname;
  return `${proto}://${host}`;
}

function sanitizeRedirect(redirectTo: string | undefined) {
  if (!redirectTo) return "/admin";
  if (!redirectTo.startsWith("/")) return "/admin";
  if (redirectTo.startsWith("//")) return "/admin";
  return redirectTo;
}

function getEnabledSsoProviders(): EnabledSsoProvider[] {
  const providers: EnabledSsoProvider[] = [];
  if (process.env.SSO_GOOGLE_CLIENT_ID?.trim() && process.env.SSO_GOOGLE_CLIENT_SECRET?.trim()) {
    providers.push({ id: "google", label: "Google" });
  }
  if (process.env.SSO_MICROSOFT_CLIENT_ID?.trim() && process.env.SSO_MICROSOFT_CLIENT_SECRET?.trim()) {
    providers.push({ id: "microsoft", label: "Microsoft" });
  }
  if (
    process.env.SSO_OIDC_CLIENT_ID?.trim()
    && process.env.SSO_OIDC_CLIENT_SECRET?.trim()
    && process.env.SSO_OIDC_AUTH_URL?.trim()
    && process.env.SSO_OIDC_TOKEN_URL?.trim()
    && process.env.SSO_OIDC_USERINFO_URL?.trim()
  ) {
    providers.push({ id: "oidc", label: process.env.SSO_OIDC_LABEL?.trim() || "SSO" });
  }
  return providers;
}

async function upsertSsoUser(provider: SsoProvider, providerId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [byProvider] = await db.select().from(users)
    .where(and(eq(users.authProvider, provider), eq(users.authProviderId, providerId)))
    .limit(1);
  if (byProvider) return byProvider;

  const [byEmail] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (byEmail) {
    const [updated] = await db.update(users).set({
      authProvider: provider,
      authProviderId: providerId,
    }).where(eq(users.id, byEmail.id)).returning();
    return updated;
  }

  const [existingAny] = await db.select().from(users).limit(1);
  const [created] = await db.insert(users).values({
    email: normalizedEmail,
    passwordHash: await hashPassword(randomUUID()),
    authProvider: provider,
    authProviderId: providerId,
    role: existingAny ? "subscriber" : "admin",
    siteId: null,
  }).returning();
  return created;
}

app.get("/api/auth/sso/providers", async () => {
  return { providers: getEnabledSsoProviders() };
});

app.get<{ Params: { provider: string }; Querystring: { redirect?: string } }>("/api/auth/sso/:provider/start", async (req, reply) => {
  const provider = req.params.provider as SsoProvider;
  if (!["google", "microsoft", "oidc"].includes(provider)) return reply.status(404).send({ error: "Provider not found" });
  const enabled = getEnabledSsoProviders().find((p) => p.id === provider);
  if (!enabled) return reply.status(400).send({ error: "Provider is not configured" });

  const state = randomUUID();
  const redirectTo = sanitizeRedirect(req.query.redirect);
  pendingSsoStates.set(state, { provider, redirectTo, expiresAt: Date.now() + 10 * 60_000 });
  const baseUrl = publicBaseUrl(req);
  const callback = `${baseUrl}/api/auth/sso/${provider}/callback`;

  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: process.env.SSO_GOOGLE_CLIENT_ID!,
      redirect_uri: callback,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  if (provider === "microsoft") {
    const tenant = process.env.SSO_MICROSOFT_TENANT_ID?.trim() || "common";
    const params = new URLSearchParams({
      client_id: process.env.SSO_MICROSOFT_CLIENT_ID!,
      redirect_uri: callback,
      response_type: "code",
      response_mode: "query",
      scope: "openid profile email User.Read",
      state,
    });
    return reply.redirect(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`);
  }

  const oidcParams = new URLSearchParams({
    client_id: process.env.SSO_OIDC_CLIENT_ID!,
    redirect_uri: callback,
    response_type: "code",
    scope: process.env.SSO_OIDC_SCOPES?.trim() || "openid profile email",
    state,
  });
  return reply.redirect(`${process.env.SSO_OIDC_AUTH_URL}?${oidcParams.toString()}`);
});

app.get<{ Params: { provider: string }; Querystring: { code?: string; state?: string } }>("/api/auth/sso/:provider/callback", async (req, reply) => {
  const provider = req.params.provider as SsoProvider;
  const code = req.query.code;
  const state = req.query.state;
  if (!code || !state) return reply.status(400).send({ error: "Missing code or state" });
  const pending = pendingSsoStates.get(state);
  pendingSsoStates.delete(state);
  if (!pending || pending.provider !== provider || pending.expiresAt < Date.now()) {
    return reply.status(400).send({ error: "Invalid or expired SSO state" });
  }

  const baseUrl = publicBaseUrl(req);
  const callback = `${baseUrl}/api/auth/sso/${provider}/callback`;
  let providerId = "";
  let email = "";

  if (provider === "google") {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.SSO_GOOGLE_CLIENT_ID!,
        client_secret: process.env.SSO_GOOGLE_CLIENT_SECRET!,
        redirect_uri: callback,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return reply.status(502).send({ error: "Google token exchange failed" });
    const tokenData = await tokenRes.json() as { access_token: string };
    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok) return reply.status(502).send({ error: "Google userinfo failed" });
    const profile = await profileRes.json() as { sub?: string; email?: string };
    providerId = profile.sub ?? "";
    email = profile.email ?? "";
  } else if (provider === "microsoft") {
    const tenant = process.env.SSO_MICROSOFT_TENANT_ID?.trim() || "common";
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.SSO_MICROSOFT_CLIENT_ID!,
        client_secret: process.env.SSO_MICROSOFT_CLIENT_SECRET!,
        redirect_uri: callback,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return reply.status(502).send({ error: "Microsoft token exchange failed" });
    const tokenData = await tokenRes.json() as { access_token: string };
    const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok) return reply.status(502).send({ error: "Microsoft userinfo failed" });
    const profile = await profileRes.json() as { id?: string; mail?: string; userPrincipalName?: string };
    providerId = profile.id ?? "";
    email = profile.mail ?? profile.userPrincipalName ?? "";
  } else {
    const tokenRes = await fetch(process.env.SSO_OIDC_TOKEN_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.SSO_OIDC_CLIENT_ID!,
        client_secret: process.env.SSO_OIDC_CLIENT_SECRET!,
        redirect_uri: callback,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return reply.status(502).send({ error: "OIDC token exchange failed" });
    const tokenData = await tokenRes.json() as { access_token: string };
    const profileRes = await fetch(process.env.SSO_OIDC_USERINFO_URL!, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok) return reply.status(502).send({ error: "OIDC userinfo failed" });
    const profile = await profileRes.json() as { sub?: string; email?: string };
    providerId = profile.sub ?? "";
    email = profile.email ?? "";
  }

  if (!providerId || !email) return reply.status(400).send({ error: "Provider did not return required account data" });

  const user = await upsertSsoUser(provider, providerId, email);
  const token = app.jwt.sign({ sub: user.id, email: user.email, role: user.role, siteId: user.siteId } as JwtPayload);
  const userPayload = { id: user.id, email: user.email, role: user.role, siteId: user.siteId };
  const redirectTo = sanitizeRedirect(pending.redirectTo);

  return reply.type("text/html").send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Signing in...</title></head>
<body>
<script>
  localStorage.setItem("openweb_token", ${JSON.stringify(token)});
  localStorage.setItem("openweb_user", ${JSON.stringify(userPayload)});
  window.location.replace(${JSON.stringify(redirectTo)});
</script>
<p>Signing in...</p>
</body></html>`);
});

app.get("/api/site-context", { preHandler: requireAuth() }, async (req, reply) => {
  const [site] = await db.select().from(sites).where(eq(sites.id, req.siteId)).limit(1);
  if (!site) return reply.status(404).send({ error: "Site not found" });
  const user = req.user as JwtPayload;
  return { site, canSwitchSites: user.siteId == null };
});

app.get("/api/profile", { preHandler: requireAuth() }, async (req, reply) => {
  const me = (req.user as JwtPayload).sub;
  const [row] = await db.select().from(users).where(eq(users.id, me)).limit(1);
  if (!row) return reply.status(404).send({ error: "User not found" });
  return toSafeUser(row);
});

app.put("/api/profile", { preHandler: requireAuth() }, async (req, reply) => {
  const me = (req.user as JwtPayload).sub;
  const body = req.body as {
    email?: string;
    password?: string;
    bio?: string | null;
    avatarUrl?: string | null;
    socialMedia?: { platform: string; url: string }[] | null;
    position?: string | null;
  };
  const updates: Record<string, unknown> = {};
  if (body.email !== undefined) updates.email = body.email.trim().toLowerCase();
  if (body.password?.trim()) updates.passwordHash = await hashPassword(body.password);
  if (body.bio !== undefined) updates.bio = body.bio ?? null;
  if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl ?? null;
  if (body.position !== undefined) updates.position = body.position ?? null;
  if (body.socialMedia !== undefined) updates.socialMedia = body.socialMedia ? JSON.stringify(body.socialMedia) : null;
  const [updated] = await db.update(users).set(updates).where(eq(users.id, me)).returning();
  return toSafeUser(updated);
});

// ── Homepage ───────────────────────────────────────────────────────────────────

app.get("/api/homepage", async (req) => {
  const [row] = await db.select().from(pages)
    .where(and(eq(pages.siteId, req.siteId), eq(pages.isHomepage, true)))
    .limit(1);
  if (!row) return null;
  return row;
});

app.put("/api/homepage", { preHandler: requireAuth(["admin", "page_developer"]) }, async (req, reply) => {
  const body = req.body as { pageId: number };
  if (body.pageId == null || Number.isNaN(Number(body.pageId))) {
    return reply.status(400).send({ error: "pageId required" });
  }
  const pageId = Number(body.pageId);
  const [page] = await db.select().from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.siteId, req.siteId)))
    .limit(1);
  if (!page) return reply.status(404).send({ error: "Page not found" });
  const now = new Date();
  await db.update(pages).set({ isHomepage: false, updatedAt: now })
    .where(eq(pages.siteId, req.siteId));
  const [updated] = await db.update(pages)
    .set({ isHomepage: true, updatedAt: now })
    .where(eq(pages.id, pageId))
    .returning();
  return updated;
});

// ── Pages CRUD ─────────────────────────────────────────────────────────────────

app.get("/api/pages", async (req) => {
  const rows = await db.select().from(pages)
    .where(eq(pages.siteId, req.siteId))
    .orderBy(desc(pages.updatedAt));
  return rows;
});

app.get<{ Params: { slug: string } }>("/api/pages/by-slug/:slug", async (req, reply) => {
  const slug = req.params.slug.trim().toLowerCase();
  const [row] = await db.select().from(pages)
    .where(and(eq(pages.siteId, req.siteId), eq(pages.slug, slug)))
    .limit(1);
  if (!row) return reply.status(404).send({ error: "Page not found" });
  return row;
});

app.get<{ Params: { id: string } }>("/api/pages/:id", async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [row] = await db.select().from(pages)
    .where(and(eq(pages.id, id), eq(pages.siteId, req.siteId)))
    .limit(1);
  if (!row) return reply.status(404).send({ error: "Page not found" });
  return row;
});

async function validatePageContentNativeFormLinks(siteId: number, content: string | undefined) {
  if (content == null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // legacy HTML content
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const blocks = parsed as Array<{ type?: unknown; props?: { formSlug?: unknown; formSource?: unknown } }>;
  const contactBlocks = blocks.filter((b) => b?.type === "contact");
  if (contactBlocks.length === 0) return null;

  const seen = new Set<string>();
  for (const block of contactBlocks) {
    if (block.props?.formSource === "google") continue;
    const formSlug = typeof block.props?.formSlug === "string" ? block.props.formSlug.trim() : "";
    if (!formSlug) {
      return "Contact blocks using native forms must be linked to a native active form";
    }
    if (seen.has(formSlug)) continue;
    seen.add(formSlug);
    const [form] = await db.select().from(forms)
      .where(and(eq(forms.siteId, siteId), eq(forms.slug, formSlug), eq(forms.status, "active")))
      .limit(1);
    if (!form) {
      return `Linked form '${formSlug}' was not found or is inactive`;
    }
  }
  return null;
}

app.post("/api/pages", { preHandler: requireAuth(["admin", "page_developer"]) }, async (req, reply) => {
  const body = req.body as { title: string; slug: string; content?: string };
  if (!body.title?.trim() || !body.slug?.trim()) {
    return reply.status(400).send({ error: "title and slug required" });
  }
  const slug = body.slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!slug) return reply.status(400).send({ error: "Invalid slug" });
  const contentValidationError = await validatePageContentNativeFormLinks(req.siteId, body.content);
  if (contentValidationError) return reply.status(400).send({ error: contentValidationError });
  const [created] = await db.insert(pages).values({
    siteId: req.siteId,
    title: body.title.trim(),
    slug,
    content: body.content ?? null,
  }).returning();
  return created;
});

app.put<{ Params: { id: string } }>("/api/pages/:id", { preHandler: requireAuth(["admin", "page_developer"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const body = req.body as {
    title?: string; slug?: string; content?: string;
    isHomepage?: boolean; ignoreGlobalLayout?: boolean;
    disableElevatedNavSpacing?: boolean; theme?: "auto" | "light" | "dark";
    seoTitle?: string | null; seoDescription?: string | null;
    seoKeywords?: string | null; ogImage?: string | null;
    noIndex?: boolean; canonicalUrl?: string | null;
  };
  const [existing] = await db.select().from(pages)
    .where(and(eq(pages.id, id), eq(pages.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Page not found" });
  if (body.content !== undefined) {
    const contentValidationError = await validatePageContentNativeFormLinks(req.siteId, body.content);
    if (contentValidationError) return reply.status(400).send({ error: contentValidationError });
  }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.content !== undefined) updates.content = body.content ?? null;
  if (body.ignoreGlobalLayout !== undefined) updates.ignoreGlobalLayout = body.ignoreGlobalLayout;
  if (body.disableElevatedNavSpacing !== undefined) updates.disableElevatedNavSpacing = body.disableElevatedNavSpacing;
  if (body.theme !== undefined) updates.theme = ["auto", "light", "dark"].includes(body.theme) ? body.theme : "auto";
  if (body.seoTitle !== undefined) updates.seoTitle = body.seoTitle ?? null;
  if (body.seoDescription !== undefined) updates.seoDescription = body.seoDescription ?? null;
  if (body.seoKeywords !== undefined) updates.seoKeywords = body.seoKeywords ?? null;
  if (body.ogImage !== undefined) updates.ogImage = body.ogImage ?? null;
  if (body.noIndex !== undefined) updates.noIndex = body.noIndex;
  if (body.canonicalUrl !== undefined) updates.canonicalUrl = body.canonicalUrl ?? null;
  if (body.isHomepage !== undefined) {
    updates.isHomepage = body.isHomepage;
    if (body.isHomepage) {
      await db.update(pages).set({ isHomepage: false, updatedAt: new Date() })
        .where(and(eq(pages.siteId, req.siteId), ne(pages.id, id)));
    }
  }
  if (body.slug !== undefined) {
    const slug = body.slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!slug) return reply.status(400).send({ error: "Invalid slug" });
    updates.slug = slug;
  }
  const [updated] = await db.update(pages).set(updates).where(eq(pages.id, id)).returning();
  return updated;
});

app.delete<{ Params: { id: string } }>("/api/pages/:id", { preHandler: requireAuth(["admin", "page_developer"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [existing] = await db.select().from(pages)
    .where(and(eq(pages.id, id), eq(pages.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Page not found" });
  if (existing.isHomepage) {
    return reply.status(400).send({ error: "Cannot delete homepage; set another page as homepage first" });
  }
  await db.delete(pages).where(eq(pages.id, id));
  return { ok: true };
});

// ── Site settings ──────────────────────────────────────────────────────────────

const defaultSiteSettings = () => ({
  navType: "navbar" as const,
  navConfig: JSON.stringify({ logoText: "Logo", logoHref: "/", navLinks: [{ label: "Home", href: "/" }] }),
  footerConfig: JSON.stringify({ copyright: "© 2025", links: [] }),
  seoConfig: JSON.stringify({}),
  blogApprovalMode: false,
});

app.get("/api/site-settings", async (req) => {
  const [row] = await db.select().from(siteSettings)
    .where(eq(siteSettings.siteId, req.siteId))
    .limit(1);
  const def = defaultSiteSettings();
  if (!row) {
    const [siteRow] = await db.select().from(sites).where(eq(sites.id, req.siteId)).limit(1);
    const defaults = {
      navType: def.navType,
      navConfig: JSON.parse(def.navConfig),
      footerConfig: JSON.parse(def.footerConfig),
      seoConfig: { siteName: siteRow?.name ?? "", siteTitle: siteRow?.name ?? "" },
      blogApprovalMode: def.blogApprovalMode,
    };
    return defaults;
  }
  const settings = {
    navType: row.navType ?? "navbar",
    navConfig: (() => { try { return JSON.parse(row.navConfig ?? "{}"); } catch { return JSON.parse(def.navConfig); } })(),
    footerConfig: (() => { try { return JSON.parse(row.footerConfig ?? "{}"); } catch { return JSON.parse(def.footerConfig); } })(),
    seoConfig: (() => { try { return JSON.parse(row.seoConfig ?? "{}"); } catch { return {}; } })(),
    blogApprovalMode: row.blogApprovalMode ?? false,
  };
  return settings;
});

app.put("/api/site-settings", { preHandler: requireAuth(["admin", "page_developer"]) }, async (req, reply) => {
  const body = req.body as { navType?: string; navConfig?: object; footerConfig?: object; seoConfig?: object; blogApprovalMode?: boolean };
  const [row] = await db.select().from(siteSettings)
    .where(eq(siteSettings.siteId, req.siteId))
    .limit(1);
  const now = new Date();
  const navConfigStr = body.navConfig !== undefined ? JSON.stringify(body.navConfig) : undefined;
  const footerConfigStr = body.footerConfig !== undefined ? JSON.stringify(body.footerConfig) : undefined;
  const seoConfigStr = body.seoConfig !== undefined ? JSON.stringify(body.seoConfig) : undefined;
  if (!row) {
    const def = defaultSiteSettings();
    const [siteRow] = await db.select().from(sites).where(eq(sites.id, req.siteId)).limit(1);
    const defaultSeo = JSON.stringify({ siteName: siteRow?.name ?? "", siteTitle: siteRow?.name ?? "" });
    const [created] = await db.insert(siteSettings).values({
      siteId: req.siteId,
      navType: body.navType ?? "navbar",
      navConfig: navConfigStr ?? def.navConfig,
      footerConfig: footerConfigStr ?? def.footerConfig,
      seoConfig: seoConfigStr ?? defaultSeo,
      blogApprovalMode: body.blogApprovalMode ?? def.blogApprovalMode,
      updatedAt: now,
    }).returning();
    const payload = {
      navType: created.navType,
      navConfig: JSON.parse(created.navConfig ?? "{}"),
      footerConfig: JSON.parse(created.footerConfig ?? "{}"),
      seoConfig: JSON.parse(created.seoConfig ?? "{}"),
      blogApprovalMode: created.blogApprovalMode ?? false,
    };
    return payload;
  }
  const [updated] = await db.update(siteSettings).set({
    navType: body.navType ?? row.navType,
    navConfig: navConfigStr !== undefined ? navConfigStr : row.navConfig,
    footerConfig: footerConfigStr !== undefined ? footerConfigStr : row.footerConfig,
    seoConfig: seoConfigStr !== undefined ? seoConfigStr : row.seoConfig,
    blogApprovalMode: body.blogApprovalMode ?? row.blogApprovalMode,
    updatedAt: now,
  }).where(eq(siteSettings.id, row.id)).returning();
  const payload = {
    navType: updated.navType,
    navConfig: JSON.parse(updated.navConfig ?? "{}"),
    footerConfig: JSON.parse(updated.footerConfig ?? "{}"),
    seoConfig: JSON.parse(updated.seoConfig ?? "{}"),
    blogApprovalMode: updated.blogApprovalMode ?? false,
  };
  return payload;
});

// ── Sitemap & Robots ───────────────────────────────────────────────────────────

app.get("/sitemap.xml", async (req, reply) => {
  const [settingsRow] = await db.select().from(siteSettings)
    .where(eq(siteSettings.siteId, req.siteId))
    .limit(1);
  const seoConfig = (() => { try { return JSON.parse(settingsRow?.seoConfig ?? "{}"); } catch { return {} as Record<string, string>; } })();
  const siteUrl = (seoConfig.siteUrl as string | undefined)?.replace(/\/$/, "") ?? `${req.protocol}://${req.hostname}`;
  const allPages = await db.select().from(pages)
    .where(eq(pages.siteId, req.siteId))
    .orderBy(desc(pages.updatedAt));
  const allBlogPosts = await db.select().from(blogPosts)
    .where(and(eq(blogPosts.siteId, req.siteId), eq(blogPosts.status, "published")))
    .orderBy(desc(blogPosts.updatedAt));
  const urls = allPages
    .filter((p) => !p.noIndex)
    .map((p) => {
      const loc = p.isHomepage ? siteUrl : `${siteUrl}/${p.slug}`;
      const lastmod = p.updatedAt.toISOString().split("T")[0];
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`;
    })
    .concat(
      allBlogPosts.map((p) => {
        const loc = `${siteUrl}/blog/${p.slug}`;
        const lastmod = p.updatedAt.toISOString().split("T")[0];
        return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`;
      })
    );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
  return reply.type("application/xml").send(xml);
});

app.get("/robots.txt", async (req, reply) => {
  const [settingsRow] = await db.select().from(siteSettings)
    .where(eq(siteSettings.siteId, req.siteId))
    .limit(1);
  const seoConfig = (() => { try { return JSON.parse(settingsRow?.seoConfig ?? "{}"); } catch { return {} as Record<string, string | boolean>; } })();
  if (seoConfig.robotsTxt) {
    const robotsTxt = seoConfig.robotsTxt as string;
    return reply.type("text/plain").send(robotsTxt);
  }
  const siteUrl = (seoConfig.siteUrl as string | undefined)?.replace(/\/$/, "") ?? `${req.protocol}://${req.hostname}`;
  const enableSitemap = seoConfig.enableSitemap !== false;
  const lines = ["User-agent: *", "Allow: /", "Disallow: /admin"];
  if (enableSitemap) lines.push(`\nSitemap: ${siteUrl}/sitemap.xml`);
  const robots = lines.join("\n");
  return reply.type("text/plain").send(robots);
});

// ── Theme packs CRUD ──────────────────────────────────────────────────────────

app.get("/api/theme-packs", async (req) => {
  const rows = await db.select().from(themePacks)
    .where(eq(themePacks.siteId, req.siteId))
    .orderBy(asc(themePacks.name));
  return rows;
});

app.get<{ Params: { id: string } }>("/api/theme-packs/:id", async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [row] = await db.select().from(themePacks)
    .where(and(eq(themePacks.id, id), eq(themePacks.siteId, req.siteId)))
    .limit(1);
  if (!row) return reply.status(404).send({ error: "Theme pack not found" });
  return row;
});

app.post("/api/theme-packs", { preHandler: requireAuth(["admin", "page_developer"]) }, async (req, reply) => {
  const body = req.body as { name: string; slug?: string; cssContent?: string };
  if (!body.name?.trim()) return reply.status(400).send({ error: "name required" });
  const slug = (body.slug ?? body.name).trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "theme";
  const [created] = await db.insert(themePacks).values({
    siteId: req.siteId,
    name: body.name.trim(),
    slug,
    cssContent: body.cssContent ?? null,
  }).returning();
  return created;
});

app.put<{ Params: { id: string } }>("/api/theme-packs/:id", { preHandler: requireAuth(["admin", "page_developer"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const body = req.body as { name?: string; slug?: string; cssContent?: string };
  const [existing] = await db.select().from(themePacks)
    .where(and(eq(themePacks.id, id), eq(themePacks.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Theme pack not found" });
  const updates: { name?: string; slug?: string; cssContent?: string | null; updatedAt: Date } = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.cssContent !== undefined) updates.cssContent = body.cssContent ?? null;
  if (body.slug !== undefined) {
    const slug = body.slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (slug) updates.slug = slug;
  }
  const [updated] = await db.update(themePacks).set(updates).where(eq(themePacks.id, id)).returning();
  return updated;
});

app.delete<{ Params: { id: string } }>("/api/theme-packs/:id", { preHandler: requireAuth(["admin", "page_developer"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [existing] = await db.select().from(themePacks)
    .where(and(eq(themePacks.id, id), eq(themePacks.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Theme pack not found" });
  await db.delete(themePacks).where(eq(themePacks.id, id));
  return { ok: true };
});

// ── Storage config ─────────────────────────────────────────────────────────────

const PROVIDERS = ["local", "s3", "firebase", "google-drive", "google-photos"] as const;
type Provider = (typeof PROVIDERS)[number];

app.get("/api/storage-config", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req) => {
  const [row] = await db.select().from(storageConfig)
    .where(eq(storageConfig.siteId, req.siteId))
    .limit(1);
  if (!row) return { provider: "local", config: {} };
  return { provider: row.provider, config: (() => { try { return JSON.parse(row.config ?? "{}"); } catch { return {}; } })() };
});

app.put("/api/storage-config", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req, reply) => {
  const body = req.body as { provider?: string; config?: object };
  if (body.provider && !PROVIDERS.includes(body.provider as Provider)) {
    return reply.status(400).send({ error: `provider must be one of: ${PROVIDERS.join(", ")}` });
  }
  const now = new Date();
  const configStr = body.config !== undefined ? JSON.stringify(body.config) : undefined;
  const [row] = await db.select().from(storageConfig)
    .where(eq(storageConfig.siteId, req.siteId))
    .limit(1);
  if (!row) {
    const [created] = await db.insert(storageConfig).values({
      siteId: req.siteId,
      provider: body.provider ?? "local",
      config: configStr ?? "{}",
      updatedAt: now,
    }).returning();
    return { provider: created.provider, config: JSON.parse(created.config ?? "{}") };
  }
  const [updated] = await db.update(storageConfig).set({
    provider: body.provider ?? row.provider,
    config: configStr !== undefined ? configStr : row.config,
    updatedAt: now,
  }).where(eq(storageConfig.id, row.id)).returning();
  return { provider: updated.provider, config: JSON.parse(updated.config ?? "{}") };
});

type SslRenewState = {
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
};

const sslRenewState: SslRenewState = {
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
};

// ── Google OAuth ───────────────────────────────────────────────────────────────

const GOOGLE_SCOPES: Record<string, string> = {
  "google-drive": "https://www.googleapis.com/auth/drive.file",
  "google-photos": "https://www.googleapis.com/auth/photoslibrary.appendonly https://www.googleapis.com/auth/photoslibrary.readonly",
};

async function getGoogleOAuthConfig(siteId: number) {
  const [row] = await db.select().from(storageConfig)
    .where(eq(storageConfig.siteId, siteId))
    .limit(1);
  if (!row) return null;
  try {
    const cfg = JSON.parse(row.config ?? "{}");
    if (cfg.clientId && cfg.clientSecret) return { clientId: cfg.clientId, clientSecret: cfg.clientSecret, provider: row.provider, config: cfg };
  } catch { }
  return null;
}

app.get("/api/oauth/google/start", { preHandler: requireAuth(["admin"]) }, async (req, reply) => {
  const oauth = await getGoogleOAuthConfig(req.siteId);
  if (!oauth) return reply.status(400).send({ error: "Set clientId and clientSecret first, then save before signing in." });
  const scope = GOOGLE_SCOPES[oauth.provider] ?? GOOGLE_SCOPES["google-drive"];
  const redirectUri = `${req.protocol}://${req.hostname}:${(req.server.addresses()[0] as { port: number })?.port ?? 3000}/api/oauth/google/callback`;
  const params = new URLSearchParams({ client_id: oauth.clientId, redirect_uri: redirectUri, response_type: "code", scope, access_type: "offline", prompt: "consent" });
  return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get("/api/oauth/google/callback", async (req, reply) => {
  const { code } = req.query as { code?: string };
  if (!code) return reply.status(400).send({ error: "Missing code" });
  const oauth = await getGoogleOAuthConfig(req.siteId);
  if (!oauth) return reply.status(400).send({ error: "Storage config missing" });
  const redirectUri = `${req.protocol}://${req.hostname}:${(req.server.addresses()[0] as { port: number })?.port ?? 3000}/api/oauth/google/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: oauth.clientId, client_secret: oauth.clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return reply.status(502).send({ error: `Google token exchange failed: ${err}` });
  }
  const tokens = (await tokenRes.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  const newConfig = {
    ...oauth.config,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? oauth.config.refreshToken ?? "",
    tokenExpiry: tokens.expires_in ? String(Date.now() + tokens.expires_in * 1000) : "",
  };
  const [row] = await db.select().from(storageConfig)
    .where(eq(storageConfig.siteId, req.siteId))
    .limit(1);
  if (row) {
    await db.update(storageConfig).set({ config: JSON.stringify(newConfig), updatedAt: new Date() }).where(eq(storageConfig.id, row.id));
  }
  return reply.type("text/html").send(`<html><body><script>window.opener?.postMessage("google-oauth-done","*");window.close();</script><p>Signed in! You can close this window.</p></body></html>`);
});

app.get("/api/oauth/google/status", { preHandler: requireAuth(["admin"]) }, async (req) => {
  const oauth = await getGoogleOAuthConfig(req.siteId);
  if (!oauth) return { connected: false };
  return { connected: !!oauth.config.accessToken, hasRefreshToken: !!oauth.config.refreshToken };
});

// ── Media gallery ─────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, "..", "uploads");
const BACKUPS_DIR = join(__dirname, "..", "backups");
const PROJECT_ROOT = join(__dirname, "..", "..", "..");
const LETSENCRYPT_LIVE_DIR = process.env.LETSENCRYPT_LIVE_DIR?.trim() || "/etc/letsencrypt/live";
const LETSENCRYPT_WEBROOT = process.env.LETSENCRYPT_WEBROOT?.trim() || "/var/www/certbot";
const LETSENCRYPT_CERTBOT_BIN = process.env.LETSENCRYPT_CERTBOT_BIN?.trim() || "certbot";
const CERTBOT_COMMAND = process.env.CERTBOT_COMMAND?.trim() || "";
const NGINX_MANAGED_CONFIG_PATH = process.env.NGINX_MANAGED_CONFIG_PATH?.trim() || "/app/nginx-managed/openweb-ssl.conf";
const SSL_AUTO_RENEW_ENABLED = process.env.SSL_AUTO_RENEW_ENABLED?.trim() !== "false";
const SSL_AUTO_RENEW_INTERVAL_HOURS = Math.max(1, Number(process.env.SSL_AUTO_RENEW_INTERVAL_HOURS ?? "12"));
const SSL_RENEW_POST_HOOK = process.env.SSL_RENEW_POST_HOOK?.trim() || "";
const OPENWEB_BASE_DOMAIN = process.env.OPENWEB_BASE_DOMAIN?.trim().toLowerCase() || "";
const NGINX_VALIDATE_COMMAND = process.env.NGINX_VALIDATE_COMMAND?.trim() || "";
const NGINX_RELOAD_COMMAND = process.env.NGINX_RELOAD_COMMAND?.trim() || "";


type SslCertificateMeta = {
  provider: "letsencrypt" | "cloudflared";
  organization?: string | null;
  organizationUnit?: string | null;
  email?: string | null;
  createdAt?: string | null;
  domains?: string[] | null;
};
function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
}
function ensureBackupsDir() {
  if (!existsSync(BACKUPS_DIR)) mkdirSync(BACKUPS_DIR, { recursive: true });
}

async function clearDirectoryContents(dir: string) {
  if (!existsSync(dir)) return;
  const entries = await readdir(dir);
  await Promise.all(entries.map((entry) => rm(join(dir, entry), { recursive: true, force: true })));
}

ensureUploadsDir();
ensureBackupsDir();

function backupFileName() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `backup_${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}_${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}.zip`;
}

function isSafeBackupName(name: string) {
  return /^[a-zA-Z0-9._-]+\.zip$/.test(name);
}

function resolveCommandPath(cmd: string) {
  if (cmd.includes("/")) return existsSync(cmd) ? cmd : null;
  const searchDirs = new Set<string>([
    ...(process.env.PATH ?? "").split(":").filter(Boolean),
    "/opt/homebrew/bin",
    "/opt/homebrew/opt/libpq/bin",
    "/usr/local/opt/libpq/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
  ]);
  for (const dir of searchDirs) {
    const full = join(dir, cmd);
    if (existsSync(full)) return full;
  }
  return null;
}

async function runCommand(cmd: string, args: string[], cwd?: string) {
  const resolvedCmd = resolveCommandPath(cmd);
  if (!resolvedCmd) {
    if (cmd === "pg_dump" || cmd === "psql") {
      throw new Error(`Required command '${cmd}' was not found. Install PostgreSQL client tools (pg_dump/psql) in the API runtime image.`);
    }
    if (cmd === "zip" || cmd === "unzip") {
      throw new Error(`Required command '${cmd}' was not found. Install zip/unzip tools in the API runtime image.`);
    }
    throw new Error(`Required command '${cmd}' was not found in PATH.`);
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(resolvedCmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (err) => {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        reject(new Error(`Required command '${cmd}' is missing in runtime.`));
        return;
      }
      reject(err);
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `${cmd} exited with code ${code}`));
    });
  });
}

type DbCliConfig = {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
};

function getDbCliConfig(databaseUrl: string): DbCliConfig {
  const envDb = process.env.POSTGRES_DB?.trim();
  const envUser = process.env.POSTGRES_USER?.trim();
  if (envDb && envUser) {
    return {
      host: process.env.POSTGRES_HOST?.trim() || "localhost",
      port: process.env.POSTGRES_PORT?.trim() || "5432",
      database: envDb,
      user: envUser,
      password: process.env.POSTGRES_PASSWORD ?? "",
    };
  }

  const parsed = new URL(databaseUrl);
  return {
    host: parsed.hostname || "localhost",
    port: parsed.port || "5432",
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    user: decodeURIComponent(parsed.username || "openweb"),
    password: decodeURIComponent(parsed.password || ""),
  };
}

async function runCommandWithEnv(cmd: string, args: string[], extraEnv: Record<string, string>, cwd?: string) {
  const resolvedCmd = resolveCommandPath(cmd);
  if (!resolvedCmd) throw new Error(`Required command '${cmd}' was not found in PATH.`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(resolvedCmd, args, {
      cwd,
      env: { ...process.env, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `${cmd} exited with code ${code}`));
    });
  });
}

async function runCommandCapture(cmd: string, args: string[], cwd?: string) {
  const resolvedCmd = resolveCommandPath(cmd);
  if (!resolvedCmd) throw new Error(`Required command '${cmd}' was not found in PATH.`);
  return await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(resolvedCmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `${cmd} exited with code ${code}`));
    });
  });
}

function isValidDnsName(domain: string) {
  const normalized = domain.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 253) return false;
  const labels = normalized.split(".");
  if (labels.length < 2) return false;
  return labels.every((label) => /^[a-z0-9-]{1,63}$/.test(label) && !label.startsWith("-") && !label.endsWith("-"));
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function safeDomainPathPart(domain: string) {
  const normalized = domain.trim().toLowerCase();
  if (!isValidDnsName(normalized)) return null;
  return normalized;
}

function clipOutput(value: string, max = 4000) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n...output truncated...`;
}

function shellEscape(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}



async function runCertbotCapture(args: string[]) {
  if (CERTBOT_COMMAND) {
    const cmd = `${CERTBOT_COMMAND} ${args.map(shellEscape).join(" ")}`.trim();
    return runCommandCapture("sh", ["-lc", cmd]);
  }
  return runCommandCapture(LETSENCRYPT_CERTBOT_BIN, args);
}

async function ensureCertbotReachable() {
  if (CERTBOT_COMMAND) {
    await runCertbotCapture(["--version"]);
    return;
  }
  if (!resolveCommandPath(LETSENCRYPT_CERTBOT_BIN)) {
    throw new Error(`Required command '${LETSENCRYPT_CERTBOT_BIN}' was not found in PATH.`);
  }
}

async function getCertificateExpiry(certPath: string): Promise<string | null> {
  try {
    const { stdout } = await runCommandCapture("openssl", ["x509", "-enddate", "-noout", "-in", certPath]);
    const raw = stdout.trim();
    const prefix = "notAfter=";
    if (!raw.startsWith(prefix)) return null;
    const parsed = new Date(raw.slice(prefix.length).trim());
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  } catch {
    return null;
  }
}

function certificateMetaPath(domain: string) {
  return join(LETSENCRYPT_LIVE_DIR, domain, "openweb-meta.json");
}

async function readSslCertificateMeta(domain: string): Promise<SslCertificateMeta | null> {
  try {
    const metaText = await readFile(certificateMetaPath(domain), "utf8");
    const parsed = JSON.parse(metaText) as Partial<SslCertificateMeta>;
    if (!parsed || (parsed.provider !== "letsencrypt" && parsed.provider !== "cloudflared")) return null;
    return {
      provider: parsed.provider,
      organization: typeof parsed.organization === "string" ? parsed.organization : null,
      organizationUnit: typeof parsed.organizationUnit === "string" ? parsed.organizationUnit : null,
      email: typeof parsed.email === "string" ? parsed.email : null,
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : null,
      domains: Array.isArray(parsed.domains) ? parsed.domains.filter((d): d is string => typeof d === "string") : null,
    };
  } catch {
    return null;
  }
}

async function writeSslCertificateMeta(domain: string, meta: SslCertificateMeta) {
  const dir = join(LETSENCRYPT_LIVE_DIR, domain);
  mkdirSync(dir, { recursive: true });
  await writeFile(certificateMetaPath(domain), JSON.stringify(meta, null, 2), "utf8");
}

function isAllowedCertificateFile(name: string) {
  return name === "fullchain.pem" || name === "privkey.pem" || name === "openweb-meta.json";
}

function parseDomainList(raw: string) {
  return [...new Set(raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0))];
}

async function getCertificateCoverageMap() {
  const coverage = new Map<string, string>();
  if (!existsSync(LETSENCRYPT_LIVE_DIR)) return coverage;
  const entries = await readdir(LETSENCRYPT_LIVE_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const certName = safeDomainPathPart(entry.name);
    if (!certName) continue;
    const fullchainPath = join(LETSENCRYPT_LIVE_DIR, certName, "fullchain.pem");
    const privkeyPath = join(LETSENCRYPT_LIVE_DIR, certName, "privkey.pem");
    if (!existsSync(fullchainPath) || !existsSync(privkeyPath)) continue;
    const meta = await readSslCertificateMeta(certName);
    const covered = new Set<string>([certName]);
    for (const d of (meta?.domains ?? [])) {
      const normalized = safeDomainPathPart(d);
      if (normalized) covered.add(normalized);
    }
    for (const host of covered) {
      if (!coverage.has(host)) coverage.set(host, certName);
    }
  }
  return coverage;
}

type SslServerConfigRow = {
  siteId: number;
  siteName: string;
  domain: string | null;
  subDomain: string | null;
  host: string;
  enabled: boolean;
};

function deriveSiteSslHost(site: { domain?: string | null; subDomain?: string | null }) {
  const domain = site.domain?.trim().toLowerCase();
  if (domain) return domain;
  const sub = site.subDomain?.trim().toLowerCase();
  if (sub && OPENWEB_BASE_DOMAIN) return `${sub}.${OPENWEB_BASE_DOMAIN}`;
  return "";
}

async function listSslServerConfigs(): Promise<SslServerConfigRow[]> {
  const rows = await db.execute(sql`
    SELECT
      s.id AS "siteId",
      s.name AS "siteName",
      s.domain AS "domain",
      s.sub_domain AS "subDomain",
      COALESCE(cfg.host, '') AS "configuredHost",
      COALESCE(cfg.enabled, false) AS "enabled"
    FROM "sites" s
    LEFT JOIN "ssl_server_configs" cfg ON cfg.site_id = s.id
    ORDER BY s.name ASC
  `) as unknown as SslServerConfigRow[] | { rows: (SslServerConfigRow & { configuredHost?: string })[] };
  const rowsNormalized = Array.isArray(rows)
    ? rows as (SslServerConfigRow & { configuredHost?: string })[]
    : (rows.rows ?? []);
  return rowsNormalized.map((row) => {
    const configured = (row as unknown as { configuredHost?: string }).configuredHost?.trim().toLowerCase() ?? "";
    const fallback = deriveSiteSslHost({ domain: row.domain, subDomain: row.subDomain });
    return {
      siteId: row.siteId,
      siteName: row.siteName,
      domain: row.domain,
      subDomain: row.subDomain,
      host: configured || fallback,
      enabled: !!row.enabled,
    };
  });
}

async function generateManagedNginxSslConfig(configs: SslServerConfigRow[], coverage?: Map<string, string>) {
  const enabled = configs
    .filter((c) => c.enabled)
    .map((c) => ({ ...c, host: c.host.trim().toLowerCase() }))
    .filter((c) => isValidDnsName(c.host));
  const uniqueHosts = [...new Set(enabled.map((c) => c.host))];
  const lines: string[] = [];
  lines.push("# Managed by OpenWeb Admin");
  lines.push(`# Generated: ${new Date().toISOString()}`);
  for (const host of uniqueHosts) {
    const certName = coverage?.get(host) ?? host;

    // ── HTTP → HTTPS redirect ────────────────────────────────────────────
    lines.push("");
    lines.push("server {");
    lines.push("  listen 80;");
    lines.push(`  server_name ${host};`);
    lines.push("  # Allow Let's Encrypt HTTP-01 challenges to pass through");
    lines.push("  location ^~ /.well-known/acme-challenge/ {");
    lines.push("    root /var/www/certbot;");
    lines.push("    try_files $uri =404;");
    lines.push("  }");
    lines.push("  location / { return 301 https://$host$request_uri; }");
    lines.push("}");

    // ── HTTPS server ─────────────────────────────────────────────────────
    lines.push("");
    lines.push("server {");
    lines.push("  listen 443 ssl http2;");
    lines.push(`  server_name ${host};`);
    lines.push("");
    lines.push(`  ssl_certificate     /etc/letsencrypt/live/${certName}/fullchain.pem;`);
    lines.push(`  ssl_certificate_key /etc/letsencrypt/live/${certName}/privkey.pem;`);
    lines.push("  ssl_protocols       TLSv1.2 TLSv1.3;");
    lines.push("  ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256;");
    lines.push("  ssl_prefer_server_ciphers off;");
    lines.push("  ssl_session_cache   shared:SSL:10m;");
    lines.push("  ssl_session_timeout 1d;");
    lines.push("  ssl_session_tickets off;");
    lines.push(`  add_header Strict-Transport-Security "max-age=63072000" always;`);
    lines.push("");
    lines.push("  client_max_body_size 50m;");
    lines.push("");
    lines.push("  proxy_set_header Host              $host;");
    lines.push("  proxy_set_header X-Real-IP         $remote_addr;");
    lines.push("  proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;");
    lines.push("  proxy_set_header X-Forwarded-Proto https;");
    lines.push("  proxy_set_header Upgrade           $http_upgrade;");
    lines.push("  proxy_set_header Connection        $connection_upgrade;");
    lines.push("  proxy_http_version 1.1;");
    lines.push("");
    lines.push(`  set $x_cache_status "BYPASS";`);
    lines.push("  add_header X-Cache $x_cache_status always;");
    lines.push("");
    lines.push("  location /api/ {");
    lines.push("    proxy_pass http://api_upstream;");
    lines.push("  }");
    lines.push("");
    lines.push("  # Vite assets — content-hashed filenames, safe to cache for 1 year");
    lines.push("  location /assets/ {");
    lines.push("    proxy_pass http://web_upstream;");
    lines.push(`    more_set_headers "Cache-Control: public, max-age=31536000, immutable";`);
    lines.push("  }");
    lines.push("");
    lines.push("  # Uploaded media — 7-day browser cache with ETag revalidation");
    lines.push("  location /uploads/ {");
    lines.push("    proxy_pass http://api_upstream;");
    lines.push(`    more_set_headers "Cache-Control: public, max-age=604800";`);
    lines.push("  }");
    lines.push("");
    lines.push("  location = /health {");
    lines.push("    proxy_pass http://api_upstream;");
    lines.push("    proxy_buffering off;");
    lines.push("  }");
    lines.push("");
    lines.push("  location ^~ /.well-known/acme-challenge/ {");
    lines.push("    root /var/www/certbot;");
    lines.push("    try_files $uri =404;");
    lines.push("  }");
    lines.push("");
    lines.push("  location = /robots.txt {");
    lines.push("    proxy_pass http://api_upstream;");
    lines.push("  }");
    lines.push("");
    lines.push("  location = /sitemap.xml {");
    lines.push("    proxy_pass http://api_upstream;");
    lines.push("  }");
    lines.push("");
    lines.push("  # HTML — no content hash, must revalidate on every request");
    lines.push("  location / {");
    lines.push("    proxy_pass http://web_upstream;");
    lines.push(`    more_set_headers "Cache-Control: no-cache";`);
    lines.push("  }");
    lines.push("}");
  }
  return { configText: lines.join("\n"), hosts: uniqueHosts };
}

async function runCertbotRenew(dryRun = false) {
  const lockRaw = await db.execute(sql`SELECT pg_try_advisory_lock(88018211) AS locked`) as unknown as { rows?: { locked: boolean }[] } | { locked: boolean }[];
  const lockRows = Array.isArray(lockRaw) ? lockRaw : (lockRaw.rows ?? []);
  if (!lockRows[0]?.locked) return { skipped: true, reason: "renew already running in another process" };
  try {
    sslRenewState.lastRunAt = new Date().toISOString();
    const args = ["renew", "--non-interactive"];
    if (dryRun) args.push("--dry-run");
    const output = await runCertbotCapture(args);
    await reloadNginxFromCommands();
    if (SSL_RENEW_POST_HOOK) await runCommandCapture("sh", ["-lc", SSL_RENEW_POST_HOOK]);
    sslRenewState.lastSuccessAt = new Date().toISOString();
    sslRenewState.lastError = null;
    return { skipped: false, output };
  } catch (error) {
    sslRenewState.lastError = (error as Error).message || "renew failed";
    throw error;
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(88018211)`);
  }
}

async function runShellCommandCapture(cmd: string) {
  return runCommandCapture("sh", ["-lc", cmd]);
}

async function reloadNginxFromCommands() {
  if (NGINX_VALIDATE_COMMAND) await runShellCommandCapture(NGINX_VALIDATE_COMMAND);
  if (NGINX_RELOAD_COMMAND) await runShellCommandCapture(NGINX_RELOAD_COMMAND);
}

async function applyManagedNginxConfigWithRollback(newContent: string) {
  const targetDir = dirname(NGINX_MANAGED_CONFIG_PATH);
  mkdirSync(targetDir, { recursive: true });

  let previous = "";
  try {
    previous = await readFile(NGINX_MANAGED_CONFIG_PATH, "utf8");
  } catch {
    previous = "";
  }

  const writeNew = async () => writeFile(NGINX_MANAGED_CONFIG_PATH, `${newContent}\n`, "utf8");
  const restorePrevious = async () => writeFile(NGINX_MANAGED_CONFIG_PATH, previous, "utf8");

  await writeNew();
  try {
    const validateOutput = NGINX_VALIDATE_COMMAND ? await runShellCommandCapture(NGINX_VALIDATE_COMMAND) : { stdout: "", stderr: "" };
    const reloadOutput = NGINX_RELOAD_COMMAND ? await runShellCommandCapture(NGINX_RELOAD_COMMAND) : { stdout: "", stderr: "" };
    return {
      ok: true as const,
      rolledBack: false,
      validateOutput,
      reloadOutput,
    };
  } catch (error) {
    const firstError = (error as Error).message || "NGINX validate/reload failed";
    try {
      await restorePrevious();
      if (NGINX_VALIDATE_COMMAND) await runShellCommandCapture(NGINX_VALIDATE_COMMAND);
      if (NGINX_RELOAD_COMMAND) await runShellCommandCapture(NGINX_RELOAD_COMMAND);
      return {
        ok: false as const,
        rolledBack: true,
        error: firstError,
      };
    } catch (rollbackError) {
      return {
        ok: false as const,
        rolledBack: true,
        error: `${firstError}\nRollback reload failed: ${(rollbackError as Error).message || "unknown rollback error"}`,
      };
    }
  }
}

function startSslAutoRenewScheduler() {
  if (!SSL_AUTO_RENEW_ENABLED) return;
  const runOnce = () => {
    runCertbotRenew(false)
      .then((res) => {
        if (!res.skipped) app.log.info("SSL auto-renew completed");
      })
      .catch((error) => app.log.error({ error }, "SSL auto-renew failed"));
  };
  // Run once shortly after startup, then by interval.
  setTimeout(runOnce, 30_000);
  setInterval(runOnce, SSL_AUTO_RENEW_INTERVAL_HOURS * 60 * 60 * 1000);
}

async function dumpDatabaseToFile(databaseUrl: string, outputPath: string) {
  const cfg = getDbCliConfig(databaseUrl);
  await runCommandWithEnv("pg_dump", [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "-h",
    cfg.host,
    "-p",
    cfg.port,
    "-U",
    cfg.user,
    "-d",
    cfg.database,
    "--file",
    outputPath,
  ], { PGPASSWORD: cfg.password });
}

async function restoreDatabaseFromFile(databaseUrl: string, inputPath: string) {
  const cfg = getDbCliConfig(databaseUrl);
  await runCommandWithEnv("psql", [
    "-h",
    cfg.host,
    "-p",
    cfg.port,
    "-U",
    cfg.user,
    "-d",
    cfg.database,
    "-f",
    inputPath,
  ], { PGPASSWORD: cfg.password });
}

async function deleteImageCache(providerPath: string) {
  try {
    const filename = basename(providerPath);
    const ext = extname(filename);
    const baseName = filename.substring(0, filename.length - ext.length);
    const cacheDir = join(dirname(providerPath), ".cache");
    if (existsSync(cacheDir)) {
      const cachedFiles = await readdir(cacheDir);
      for (const file of cachedFiles) {
        if (file.startsWith(baseName)) {
          await unlink(join(cacheDir, file)).catch(() => {});
        }
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

app.get("/api/media", async (req) => {
  const rows = await db.select().from(mediaItems)
    .where(eq(mediaItems.siteId, req.siteId))
    .orderBy(desc(mediaItems.createdAt));
  return rows;
});

app.delete<{ Params: { id: string } }>("/api/media/:id", { preHandler: requireAuth(["admin", "page_developer"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [row] = await db.select().from(mediaItems)
    .where(and(eq(mediaItems.id, id), eq(mediaItems.siteId, req.siteId)))
    .limit(1);
  if (!row) return reply.status(404).send({ error: "Media not found" });
  if (row.providerPath) {
    await unlink(row.providerPath).catch(() => { });
    await deleteImageCache(row.providerPath);
  }
  await db.delete(mediaItems).where(eq(mediaItems.id, id));
  return { ok: true };
});

await app.register(fastifyMultipart, { limits: { fileSize: 100_000_000 } });
await app.register(fastifyStatic, {
  root: UPLOADS_DIR,
  prefix: "/uploads/",
  decorateReply: false,
  setHeaders: (res, _path) => {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  },
});

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

app.get<{ Params: { filename: string }, Querystring: { w?: string; q?: string; f?: string } }>("/uploads/:filename", async (req, reply) => {
  const { filename } = req.params;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return reply.status(400).send({ error: "Invalid filename" });
  }

  const originalPath = join(UPLOADS_DIR, filename);
  if (!existsSync(originalPath)) {
    return reply.status(404).send({ error: "File not found" });
  }

  const ext = extname(filename).toLowerCase();
  const resizableExts = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".tiff"];
  
  if (!resizableExts.includes(ext)) {
    reply.header("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    return reply.send(createReadStream(originalPath));
  }

  const w = req.query.w ? parseInt(req.query.w, 10) : undefined;
  const q = req.query.q ? parseInt(req.query.q, 10) : 80;
  
  const acceptHeader = req.headers.accept || "";
  const supportsWebp = acceptHeader.includes("image/webp");
  const targetFormat = (req.query.f || (supportsWebp ? "webp" : ext.replace(".", ""))) as "webp" | "jpeg" | "png" | "avif";
  
  const cacheDir = join(UPLOADS_DIR, ".cache");
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  const targetExt = `.${targetFormat}`;
  const baseName = filename.substring(0, filename.length - ext.length);
  const cacheFilename = `${baseName}_w${w || "orig"}_q${q}${targetExt}`;
  const cachePath = join(cacheDir, cacheFilename);

  if (existsSync(cachePath)) {
    reply.header("Content-Type", MIME_TYPES[targetExt] || "application/octet-stream");
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    return reply.send(createReadStream(cachePath));
  }

  try {
    let pipeline = sharp(originalPath);
    const metadata = await pipeline.metadata();

    if (w && metadata.width && metadata.width > w) {
      pipeline = pipeline.resize({ width: w, withoutEnlargement: true });
    } else if (!w && metadata.width && metadata.width > 1920) {
      pipeline = pipeline.resize({ width: 1920, withoutEnlargement: true });
    }

    if (targetFormat === "webp") {
      pipeline = pipeline.webp({ quality: q });
    } else if (targetFormat === "png") {
      pipeline = pipeline.png({ quality: q });
    } else if (targetFormat === "avif") {
      pipeline = pipeline.avif({ quality: q });
    } else {
      pipeline = pipeline.jpeg({ quality: q, progressive: true });
    }

    const processedBuffer = await pipeline.toBuffer();
    await writeFile(cachePath, processedBuffer);

    reply.header("Content-Type", MIME_TYPES[targetExt] || "application/octet-stream");
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    return reply.send(createReadStream(cachePath));
  } catch (error) {
    app.log.error(error, `Failed to optimize image: ${filename}`);
    reply.header("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    return reply.send(createReadStream(originalPath));
  }
});

app.post("/api/media/upload", { preHandler: requireAuth(["admin", "page_developer"]) }, async (req, reply) => {
  ensureUploadsDir();
  const file = await req.file();
  if (!file) return reply.status(400).send({ error: "No file uploaded" });
  const isSvg = file.mimetype === "image/svg+xml" || file.filename.endsWith(".svg");
  const chunks: Buffer[] = [];
  for await (const chunk of file.file) chunks.push(chunk as Buffer);
  let buf = Buffer.concat(chunks);
  let finalName: string;
  let finalMime: string;
  let originalName: string;
  if (isSvg) {
    buf = Buffer.from(await sharp(buf).jpeg({ quality: 90 }).toBuffer());
    finalName = `${randomUUID()}.jpg`;
    finalMime = "image/jpeg";
    originalName = file.filename.replace(/\.svg$/i, ".jpg");
  } else {
    const ext = extname(file.filename) || "";
    finalName = `${randomUUID()}${ext}`;
    finalMime = file.mimetype;
    originalName = file.filename;
  }
  const destPath = join(UPLOADS_DIR, finalName);
  await writeFile(destPath, buf);
  const [row] = await db.insert(mediaItems).values({
    siteId: req.siteId,
    filename: originalName,
    mimeType: finalMime,
    size: String(buf.length),
    url: `/uploads/${finalName}`,
    provider: "local",
    providerPath: destPath,
  }).returning();
  return row;
});

// ── Backups (admin global only) ───────────────────────────────────────────────

app.get("/api/backups", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async () => {
  ensureBackupsDir();
  const files = await readdir(BACKUPS_DIR);
  const items = await Promise.all(files
    .filter((name) => isSafeBackupName(name))
    .map(async (name) => {
      const fullPath = join(BACKUPS_DIR, name);
      const file = await stat(fullPath);
      return {
        name,
        size: file.size,
        createdAt: file.mtime.toISOString(),
        downloadUrl: `/api/backups/${encodeURIComponent(name)}/download`,
      };
    }));
  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
});

app.post("/api/backups", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (_req, reply) => {
  let databaseUrl = "";
  try {
    databaseUrl = getDatabaseUrl();
  } catch (error) {
    return reply.status(500).send({ error: (error as Error).message || "Database configuration is required for backups" });
  }

  ensureUploadsDir();
  ensureBackupsDir();
  const tmpRoot = await mkdtemp(join(tmpdir(), "openweb-backup-"));
  const payloadDir = join(tmpRoot, "payload");
  const backupName = backupFileName();
  const backupPath = join(BACKUPS_DIR, backupName);

  try {
    mkdirSync(payloadDir, { recursive: true });

    const dbDumpPath = join(payloadDir, "database.sql");
    await dumpDatabaseToFile(databaseUrl, dbDumpPath);

    if (existsSync(UPLOADS_DIR)) {
      await cp(UPLOADS_DIR, join(payloadDir, "uploads"), { recursive: true, force: true });
    }

    const codeDir = join(payloadDir, "code");
    mkdirSync(codeDir, { recursive: true });
    const copyTargets = ["package.json", "package-lock.json", "apps/api", "apps/web", "deploy"];
    for (const target of copyTargets) {
      const from = join(PROJECT_ROOT, target);
      if (existsSync(from)) {
        await cp(from, join(codeDir, target), {
          recursive: true,
          force: true,
          filter: (src) => {
            const normalized = src.replaceAll("\\", "/");
            return !normalized.includes("/node_modules/") && !normalized.includes("/.git/") && !normalized.includes("/backups/");
          },
        });
      }
    }

    await writeFile(join(payloadDir, "manifest.json"), JSON.stringify({
      createdAt: new Date().toISOString(),
      backupName,
      hasUploads: existsSync(join(payloadDir, "uploads")),
      hasCodeSnapshot: existsSync(codeDir),
      format: "openweb-backup-v1",
    }, null, 2), "utf8");

    await runCommand("zip", ["-r", backupPath, "."], payloadDir);
    const file = await stat(backupPath);

    return {
      ok: true,
      backup: {
        name: backupName,
        size: file.size,
        createdAt: file.mtime.toISOString(),
        downloadUrl: `/api/backups/${encodeURIComponent(backupName)}/download`,
      },
    };
  } catch (error) {
    app.log.error({ error }, "Backup creation failed");
    return reply.status(500).send({ error: (error as Error).message || "Backup creation failed" });
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

app.get<{ Params: { name: string } }>("/api/backups/:name/download", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req, reply) => {
  const name = decodeURIComponent(req.params.name);
  if (!isSafeBackupName(name)) return reply.status(400).send({ error: "Invalid backup file name" });
  const fullPath = join(BACKUPS_DIR, name);
  if (!existsSync(fullPath)) return reply.status(404).send({ error: "Backup not found" });

  reply.header("Content-Type", "application/zip");
  reply.header("Content-Disposition", `attachment; filename="${name}"`);
  return reply.send(createReadStream(fullPath));
});

app.post("/api/backups/restore", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req, reply) => {
  let databaseUrl = "";
  try {
    databaseUrl = getDatabaseUrl();
  } catch (error) {
    return reply.status(500).send({ error: (error as Error).message || "Database configuration is required for restore" });
  }

  ensureUploadsDir();
  const file = await req.file();
  if (!file) return reply.status(400).send({ error: "ZIP file is required" });
  if (!file.filename.toLowerCase().endsWith(".zip")) return reply.status(400).send({ error: "Only .zip files are supported" });

  const tmpRoot = await mkdtemp(join(tmpdir(), "openweb-restore-"));
  const zipPath = join(tmpRoot, "backup.zip");
  const extractDir = join(tmpRoot, "extract");

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) chunks.push(chunk as Buffer);
    await writeFile(zipPath, Buffer.concat(chunks));
    mkdirSync(extractDir, { recursive: true });
    await runCommand("unzip", ["-o", zipPath, "-d", extractDir]);

    const dbDumpPath = join(extractDir, "database.sql");
    if (!existsSync(dbDumpPath)) return reply.status(400).send({ error: "Invalid backup: missing database.sql" });
    await restoreDatabaseFromFile(databaseUrl, dbDumpPath);

    const uploadsBackupDir = join(extractDir, "uploads");
    if (existsSync(uploadsBackupDir)) {
      // Keep mounted uploads root directory; clear contents to avoid EBUSY on volume mount points.
      await clearDirectoryContents(UPLOADS_DIR);
      await cp(uploadsBackupDir, UPLOADS_DIR, { recursive: true, force: true });
    }

    return { ok: true, message: "Backup restored successfully" };
  } catch (error) {
    app.log.error({ error }, "Backup restore failed");
    return reply.status(500).send({ error: (error as Error).message || "Backup restore failed" });
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

// ── SSL certificates (admin global only) ─────────────────────────────────────

app.get("/api/ssl/certificates", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async () => {
  if (!existsSync(LETSENCRYPT_LIVE_DIR)) return [];
  const entries = await readdir(LETSENCRYPT_LIVE_DIR, { withFileTypes: true });
  const certs = await Promise.all(entries
    .filter((entry) => entry.isDirectory())
    .map(async (entry) => {
      const domain = safeDomainPathPart(entry.name);
      if (!domain) return null;
      const fullchainPath = join(LETSENCRYPT_LIVE_DIR, domain, "fullchain.pem");
      const privkeyPath = join(LETSENCRYPT_LIVE_DIR, domain, "privkey.pem");
      if (!existsSync(fullchainPath) || !existsSync(privkeyPath)) return null;
      const info = await stat(fullchainPath);
      const expiresAt = await getCertificateExpiry(fullchainPath);
      const meta = await readSslCertificateMeta(domain);
      const domains = [domain, ...(meta?.domains ?? [])]
        .map((d) => d.trim().toLowerCase())
        .filter((d, i, arr) => d && arr.indexOf(d) === i);
      return {
        domain,
        domains,
        fullchainPath,
        privkeyPath,
        createdAt: info.mtime.toISOString(),
        expiresAt,
        provider: meta?.provider ?? "letsencrypt",
        organization: meta?.organization ?? null,
        organizationUnit: meta?.organizationUnit ?? null,
      };
    }));
  return certs.filter((item): item is NonNullable<typeof item> => !!item)
    .sort((a, b) => (a.domain < b.domain ? -1 : 1));
});

app.post("/api/ssl/certificates", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req, reply) => {
  const body = req.body as {
    domain?: string;
    email?: string;
    staging?: boolean;
    mode?: "webroot" | "standalone";
    webrootPath?: string;
    provider?: "letsencrypt" | "cloudflared";
    organization?: string;
    organizationUnit?: string;
    certificatePem?: string;
    privateKeyPem?: string;
  };
  const domains = parseDomainList(body.domain?.trim().toLowerCase() ?? "");
  const domain = domains[0] ?? "";
  const provider = body.provider === "cloudflared" ? "cloudflared" : "letsencrypt";
  const email = body.email?.trim() ?? "";
  const organization = body.organization?.trim() ?? "";
  const organizationUnit = body.organizationUnit?.trim() ?? "";
  const mode = body.mode === "standalone" ? "standalone" : "webroot";
  const staging = !!body.staging;
  const webrootPath = (body.webrootPath?.trim() || LETSENCRYPT_WEBROOT).trim();

  if (domains.length === 0) return reply.status(400).send({ error: "At least one valid domain is required" });
  if (!domains.every((d) => isValidDnsName(d))) return reply.status(400).send({ error: "One or more domains are invalid" });
  if (provider === "letsencrypt" && !isValidEmail(email)) return reply.status(400).send({ error: "A valid email is required" });
  if (provider === "letsencrypt" && mode === "webroot" && !webrootPath) {
    return reply.status(400).send({ error: "webrootPath is required for webroot mode" });
  }

  try {
    let stdout = "";
    let stderr = "";
    if (provider === "letsencrypt") {
      await ensureCertbotReachable();
      const args = [
        "certonly",
        "--non-interactive",
        "--agree-tos",
        "--email", email,
        "--cert-name", domain,
        "--keep-until-expiring",
      ];
      for (const d of domains) args.push("-d", d);
      if (staging) args.push("--staging");
      if (mode === "webroot") args.push("--webroot", "-w", webrootPath);
      else args.push("--standalone");
      const output = await runCertbotCapture(args);
      stdout = output.stdout;
      stderr = output.stderr;
    } else {
      const certPem = body.certificatePem?.trim() ?? "";
      const keyPem = body.privateKeyPem?.trim() ?? "";
      if (!certPem.includes("BEGIN CERTIFICATE")) return reply.status(400).send({ error: "Cloudflared certificate PEM is required" });
      if (!keyPem.includes("BEGIN")) return reply.status(400).send({ error: "Cloudflared private key PEM is required" });
      const certDir = join(LETSENCRYPT_LIVE_DIR, domain);
      mkdirSync(certDir, { recursive: true });
      await writeFile(join(certDir, "fullchain.pem"), certPem.endsWith("\n") ? certPem : `${certPem}\n`, "utf8");
      await writeFile(join(certDir, "privkey.pem"), keyPem.endsWith("\n") ? keyPem : `${keyPem}\n`, "utf8");
      stdout = "Cloudflared certificate files were saved.";
      stderr = "";
    }

    const fullchainPath = join(LETSENCRYPT_LIVE_DIR, domain, "fullchain.pem");
    const privkeyPath = join(LETSENCRYPT_LIVE_DIR, domain, "privkey.pem");
    if (!existsSync(fullchainPath) || !existsSync(privkeyPath)) {
      return reply.status(500).send({
        error: "Certbot completed but certificate files were not found in the expected path.",
        output: { stdout: clipOutput(stdout), stderr: clipOutput(stderr) },
      });
    }
    const fullchainStat = await stat(fullchainPath);
    const expiresAt = await getCertificateExpiry(fullchainPath);
    await writeSslCertificateMeta(domain, {
      provider,
      organization: organization || null,
      organizationUnit: organizationUnit || null,
      email: email || null,
      createdAt: new Date().toISOString(),
      domains,
    });
    return {
      ok: true,
      certificate: {
        domain,
        domains,
        fullchainPath,
        privkeyPath,
        createdAt: fullchainStat.mtime.toISOString(),
        expiresAt,
        provider,
        organization: organization || null,
        organizationUnit: organizationUnit || null,
      },
      output: { stdout: clipOutput(stdout), stderr: clipOutput(stderr) },
    };
  } catch (error) {
    app.log.error({ error, domain, provider }, "SSL certificate creation failed");
    return reply.status(500).send({ error: (error as Error).message || "Certificate creation failed" });
  }
});

app.delete<{ Params: { domain: string } }>("/api/ssl/certificates/:domain", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req, reply) => {
  const raw = decodeURIComponent(req.params.domain || "").trim().toLowerCase();
  const domain = safeDomainPathPart(raw);
  if (!domain) return reply.status(400).send({ error: "A valid domain is required" });

  const fullchainPath = join(LETSENCRYPT_LIVE_DIR, domain, "fullchain.pem");
  const privkeyPath = join(LETSENCRYPT_LIVE_DIR, domain, "privkey.pem");
  if (!existsSync(fullchainPath) || !existsSync(privkeyPath)) return reply.status(404).send({ error: "Certificate not found" });

  const meta = await readSslCertificateMeta(domain);
  try {
    if (meta?.provider === "cloudflared") {
      await rm(join(LETSENCRYPT_LIVE_DIR, domain), { recursive: true, force: true });
      return { ok: true, removedBy: "cloudflared", domain };
    }
    await ensureCertbotReachable();
    await runCertbotCapture(["delete", "--non-interactive", "--cert-name", domain]);
    await rm(certificateMetaPath(domain), { force: true });
    return { ok: true, removedBy: "letsencrypt", domain };
  } catch (error) {
    return reply.status(500).send({ error: (error as Error).message || "Failed to delete certificate" });
  }
});

app.get<{ Params: { domain: string; file: string } }>("/api/ssl/certificates/:domain/download/:file", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req, reply) => {
  const rawDomain = decodeURIComponent(req.params.domain || "").trim().toLowerCase();
  const domain = safeDomainPathPart(rawDomain);
  if (!domain) return reply.status(400).send({ error: "A valid domain is required" });
  const file = decodeURIComponent(req.params.file || "").trim();
  if (!isAllowedCertificateFile(file)) return reply.status(400).send({ error: "Invalid certificate file" });

  const fullPath = join(LETSENCRYPT_LIVE_DIR, domain, file);
  if (!existsSync(fullPath)) return reply.status(404).send({ error: "Certificate file not found" });
  const contentType = file.endsWith(".json") ? "application/json" : "application/x-pem-file";
  reply.header("Content-Type", contentType);
  reply.header("Content-Disposition", `attachment; filename="${domain}-${file}"`);
  return reply.send(createReadStream(fullPath));
});

app.get("/api/ssl/auto-renew", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async () => {
  return {
    enabled: SSL_AUTO_RENEW_ENABLED,
    intervalHours: SSL_AUTO_RENEW_INTERVAL_HOURS,
    state: sslRenewState,
    postHookConfigured: !!SSL_RENEW_POST_HOOK,
    nginxValidateConfigured: !!NGINX_VALIDATE_COMMAND,
    nginxReloadConfigured: !!NGINX_RELOAD_COMMAND,
  };
});

app.post("/api/ssl/auto-renew/run", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req, reply) => {
  const body = req.body as { dryRun?: boolean };
  try {
    const res = await runCertbotRenew(!!body?.dryRun);
    if (res.skipped || !res.output) return { ok: true, skipped: true, reason: res.reason ?? "Renew was skipped" };
    return {
      ok: true,
      skipped: false,
      output: {
        stdout: clipOutput(res.output.stdout),
        stderr: clipOutput(res.output.stderr),
      },
      state: sslRenewState,
    };
  } catch (error) {
    return reply.status(500).send({ error: (error as Error).message || "SSL renew failed" });
  }
});

app.get("/api/nginx/ssl-servers", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async () => {
  const items = await listSslServerConfigs();
  return {
    items,
    baseDomain: OPENWEB_BASE_DOMAIN || null,
    managedConfigPath: NGINX_MANAGED_CONFIG_PATH,
  };
});

app.put<{ Params: { siteId: string } }>("/api/nginx/ssl-servers/:siteId", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req, reply) => {
  const siteId = Number(req.params.siteId);
  if (Number.isNaN(siteId) || siteId <= 0) return reply.status(400).send({ error: "Invalid siteId" });
  const body = req.body as { host?: string; enabled?: boolean };
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) return reply.status(404).send({ error: "Site not found" });

  const fallbackHost = deriveSiteSslHost(site);
  const existingRaw = await db.execute(sql`SELECT host, enabled FROM "ssl_server_configs" WHERE site_id = ${siteId} LIMIT 1`) as unknown as { rows?: { host: string; enabled: boolean }[] } | { host: string; enabled: boolean }[];
  const existingRows = Array.isArray(existingRaw) ? existingRaw : (existingRaw.rows ?? []);
  const existing = existingRows[0];
  const enabled = body.enabled ?? existing?.enabled ?? false;

  const providedHost = body.host !== undefined ? body.host.trim().toLowerCase() : undefined;
  const candidateHost = (providedHost ?? existing?.host ?? fallbackHost ?? "").trim();
  const validHost = !!candidateHost && isValidDnsName(candidateHost);
  if (enabled && !validHost) {
    return reply.status(400).send({ error: "A valid SSL host is required before enabling this server." });
  }
  const host = validHost ? candidateHost : (existing?.host ?? fallbackHost ?? "").trim();

  await db.execute(sql`
    INSERT INTO "ssl_server_configs" (site_id, host, enabled, created_at, updated_at)
    VALUES (${siteId}, ${host}, ${enabled}, now(), now())
    ON CONFLICT (site_id)
    DO UPDATE SET host = EXCLUDED.host, enabled = EXCLUDED.enabled, updated_at = now()
  `);
  const items = await listSslServerConfigs();
  const item = items.find((x) => x.siteId === siteId);
  return item ?? { siteId, siteName: site.name, domain: site.domain, subDomain: site.subDomain, host, enabled };
});

app.post("/api/nginx/ssl-servers/apply", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req, reply) => {
  try {
    const items = await listSslServerConfigs();
    const coverage = await getCertificateCoverageMap();
    const { configText, hosts } = await generateManagedNginxSslConfig(items, coverage);
    const missingCertHosts = hosts.filter((host) => !coverage.has(host));
    if (missingCertHosts.length > 0) {
      return reply.status(400).send({
        error: `Cannot apply NGINX SSL config. Missing certificate files for: ${missingCertHosts.join(", ")}`,
      });
    }

    const applyRes = await applyManagedNginxConfigWithRollback(configText);
    if (!applyRes.ok) {
      return reply.status(500).send({
        error: `NGINX rejected the new SSL config. Changes were reverted.\n${applyRes.error}`,
      });
    }

    return {
      ok: true,
      path: NGINX_MANAGED_CONFIG_PATH,
      hosts,
      reloadCommand: NGINX_RELOAD_COMMAND || "not configured",
      validateCommand: NGINX_VALIDATE_COMMAND || "not configured",
      configPreview: clipOutput(configText, 8000),
      nginx: {
        validated: true,
        reloaded: true,
        validateStderr: clipOutput(applyRes.validateOutput.stderr),
        reloadStderr: clipOutput(applyRes.reloadOutput.stderr),
      },
    };
  } catch (error) {
    app.log.error({ error }, "Failed to apply managed NGINX SSL config");
    return reply.status(500).send({ error: (error as Error).message || "Failed to apply NGINX SSL config" });
  }
});

// ── Sites CRUD (admin only) ────────────────────────────────────────────────────

app.get("/api/sites", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async () => {
  return db.select().from(sites).orderBy(asc(sites.name));
});

app.post("/api/sites", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req, reply) => {
  const body = req.body as { name: string; slug?: string; domain?: string; subDomain?: string; routingMode?: string; isDefault?: boolean; adminEmail?: string; adminPassword?: string };
  if (!body.name?.trim()) return reply.status(400).send({ error: "name required" });
  const slug = (body.slug ?? body.name).trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "site";
  if (body.isDefault) await db.update(sites).set({ isDefault: false });
  const [created] = await db.insert(sites).values({
    name: body.name.trim(),
    slug,
    domain: body.domain ?? null,
    subDomain: body.subDomain ?? null,
    routingMode: body.routingMode ?? "url",
    isDefault: body.isDefault ?? false,
  }).returning();
  let adminUser: Record<string, unknown> | undefined;
  if (body.adminEmail?.trim() && body.adminPassword?.trim()) {
    const passwordHash = await hashPassword(body.adminPassword);
    const [row] = await db.insert(users).values({
      email: body.adminEmail.trim().toLowerCase(),
      passwordHash,
      role: "admin",
      siteId: created.id,
    }).returning();
    const { passwordHash: _, ...safe } = row;
    adminUser = safe;
  }
  const def = defaultSiteSettings();
  await db.insert(siteSettings).values({
    siteId: created.id,
    navType: def.navType,
    navConfig: JSON.stringify({ logoText: body.name.trim(), logoHref: "/", navLinks: [{ label: "Home", href: "/" }] }),
    footerConfig: def.footerConfig,
    seoConfig: JSON.stringify({ siteName: body.name.trim(), siteTitle: body.name.trim() }),
    blogApprovalMode: def.blogApprovalMode,
    updatedAt: new Date(),
  });
  return adminUser ? { ...created, adminUser } : created;
});

app.put<{ Params: { id: string } }>("/api/sites/:id", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const body = req.body as { name?: string; domain?: string; subDomain?: string; routingMode?: string; isDefault?: boolean };
  const [existing] = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
  if (!existing) return reply.status(404).send({ error: "Site not found" });
  if (body.isDefault) await db.update(sites).set({ isDefault: false }).where(ne(sites.id, id));
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.domain !== undefined) updates.domain = body.domain || null;
  if (body.subDomain !== undefined) updates.subDomain = body.subDomain || null;
  if (body.routingMode !== undefined) updates.routingMode = body.routingMode;
  if (body.isDefault !== undefined) updates.isDefault = body.isDefault;
  const [updated] = await db.update(sites).set(updates).where(eq(sites.id, id)).returning();
  return updated;
});

app.delete<{ Params: { id: string } }>("/api/sites/:id", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [existing] = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
  if (!existing) return reply.status(404).send({ error: "Site not found" });
  if (existing.isDefault) return reply.status(400).send({ error: "Cannot delete the default site" });
  const files = await db.select().from(mediaItems).where(eq(mediaItems.siteId, id));
  await Promise.all(files.map(async (f) => {
    if (f.providerPath) {
      await unlink(f.providerPath).catch(() => { });
      await deleteImageCache(f.providerPath);
    }
  }));
  await db.delete(sites).where(eq(sites.id, id));
  return { ok: true };
});

// ── Users CRUD (admin only) ────────────────────────────────────────────────────

app.get("/api/users", { preHandler: requireAuth(["admin", "blogger_admin"]) }, async (req) => {
  const rows = await db.select().from(users)
    .where(eq(users.siteId, req.siteId))
    .orderBy(asc(users.email));
  return rows.map(toSafeUser);
});

app.post("/api/users", { preHandler: requireAuth(["admin", "blogger_admin"]) }, async (req, reply) => {
  const body = req.body as {
    email: string;
    password: string;
    role?: string;
    siteId?: number | null;
    siteRoles?: { siteId: number; role: string }[];
    bio?: string | null;
    avatarUrl?: string | null;
    socialMedia?: { platform: string; url: string }[] | null;
    position?: string | null;
  };
  if (!body.email?.trim() || !body.password?.trim()) {
    return reply.status(400).send({ error: "email and password required" });
  }
  const me = req.user as JwtPayload;
  const role = (body.role as JwtPayload["role"]) ?? "subscriber";
  if (me.role === "blogger_admin" && !["blogger", "blogger_admin", "subscriber"].includes(role)) {
    return reply.status(403).send({ error: "Blogger admins can only create blogger, blogger_admin, or subscriber users" });
  }
  const passwordHash = await hashPassword(body.password);
  const [created] = await db.insert(users).values({
    email: body.email.trim().toLowerCase(),
    passwordHash,
    role,
    siteId: req.siteId,
    siteRoles: null,
    bio: body.bio ?? null,
    avatarUrl: body.avatarUrl ?? null,
    socialMedia: body.socialMedia ? JSON.stringify(body.socialMedia) : null,
    position: body.position ?? null,
  }).returning();
  return toSafeUser(created);
});

app.put<{ Params: { id: string } }>("/api/users/:id", { preHandler: requireAuth(["admin", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const body = req.body as { email?: string; password?: string; role?: string; siteId?: number | null; siteRoles?: { siteId: number; role: string }[] };
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing) return reply.status(404).send({ error: "User not found" });
  if (existing.siteId !== req.siteId) return reply.status(404).send({ error: "User not found" });
  const me = req.user as JwtPayload;
  if (me.role === "blogger_admin" && existing.role === "admin") {
    return reply.status(403).send({ error: "Blogger admins cannot edit admin users" });
  }
  const updates: Record<string, unknown> = {};
  if (body.email !== undefined) updates.email = body.email.trim().toLowerCase();
  if (body.password?.trim()) updates.passwordHash = await hashPassword(body.password);
  if (body.role !== undefined) {
    if (me.role === "blogger_admin" && !["blogger", "blogger_admin", "subscriber"].includes(body.role)) {
      return reply.status(403).send({ error: "Blogger admins can only assign blogger, blogger_admin, or subscriber roles" });
    }
    updates.role = body.role;
  }
  if ((body as { bio?: string | null }).bio !== undefined) updates.bio = (body as { bio?: string | null }).bio ?? null;
  if ((body as { avatarUrl?: string | null }).avatarUrl !== undefined) updates.avatarUrl = (body as { avatarUrl?: string | null }).avatarUrl ?? null;
  if ((body as { position?: string | null }).position !== undefined) updates.position = (body as { position?: string | null }).position ?? null;
  if ((body as { socialMedia?: { platform: string; url: string }[] | null }).socialMedia !== undefined) {
    const social = (body as { socialMedia?: { platform: string; url: string }[] | null }).socialMedia;
    updates.socialMedia = social ? JSON.stringify(social) : null;
  }
  const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
  return toSafeUser(updated);
});

app.delete<{ Params: { id: string } }>("/api/users/:id", { preHandler: requireAuth(["admin", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const me = (req.user as JwtPayload).sub;
  if (id === me) return reply.status(400).send({ error: "Cannot delete your own account" });
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing) return reply.status(404).send({ error: "User not found" });
  const meUser = req.user as JwtPayload;
  if (meUser.role === "blogger_admin" && existing.role === "admin") {
    return reply.status(403).send({ error: "Blogger admins cannot delete admin users" });
  }
  if (existing.role === "admin" && existing.siteId == null) {
    const [firstGlobalAdmin] = await db.select().from(users)
      .where(and(eq(users.role, "admin"), isNull(users.siteId)))
      .orderBy(asc(users.createdAt), asc(users.id))
      .limit(1);
    if (firstGlobalAdmin && existing.id === firstGlobalAdmin.id) {
      return reply.status(400).send({ error: "Cannot delete the first global admin account" });
    }
    return reply.status(403).send({ error: "Global admin users cannot be deleted from site-scoped user management" });
  }
  if (existing.siteId !== req.siteId) return reply.status(404).send({ error: "User not found" });
  await db.delete(users).where(eq(users.id, id));
  return { ok: true };
});

// ── Blog engine ────────────────────────────────────────────────────────────────

type BlogStatus = "draft" | "pending_review" | "approved" | "published" | "rejected";
const BLOG_STATUSES: BlogStatus[] = ["draft", "pending_review", "approved", "published", "rejected"];

const slugifyText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

async function getBlogApprovalMode(siteId: number) {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.siteId, siteId)).limit(1);
  return row?.blogApprovalMode ?? false;
}

async function getBlogPostById(postId: number, siteId: number) {
  const [post] = await db.select().from(blogPosts)
    .where(and(eq(blogPosts.id, postId), eq(blogPosts.siteId, siteId)))
    .limit(1);
  return post;
}

async function attachBlogRelations(postId: number, siteId: number) {
  const authorRows = await db.select().from(blogPostAuthors).where(eq(blogPostAuthors.postId, postId));
  const categoryRows = await db.select().from(blogPostCategories).where(eq(blogPostCategories.postId, postId));
  const tagRows = await db.select().from(blogPostTags).where(eq(blogPostTags.postId, postId));
  const authorIds = authorRows.map((a) => a.userId);
  const categoryIds = categoryRows.map((c) => c.categoryId);
  const tagIds = tagRows.map((t) => t.tagId);
  const allUsers = authorIds.length ? await db.select().from(users) : [];
  const allCategories = categoryIds.length ? await db.select().from(blogCategories).where(eq(blogCategories.siteId, siteId)) : [];
  const allTags = tagIds.length ? await db.select().from(blogTags).where(eq(blogTags.siteId, siteId)) : [];
  const usersById = new Map(allUsers.map((u) => [u.id, toSafeUser(u)]));
  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));
  const tagsById = new Map(allTags.map((t) => [t.id, t]));

  return {
    authors: authorIds.map((id) => usersById.get(id)).filter(Boolean) as ReturnType<typeof toSafeUser>[],
    categories: categoryIds.map((id) => categoriesById.get(id)).filter(Boolean),
    tags: tagIds.map((id) => tagsById.get(id)).filter(Boolean),
  };
}

app.get("/api/blog/settings", { preHandler: requireAuth(["admin", "blogger_admin"]) }, async (req) => {
  return { approvalMode: await getBlogApprovalMode(req.siteId) };
});

app.put("/api/blog/settings", { preHandler: requireAuth(["admin", "blogger_admin"]) }, async (req) => {
  const body = req.body as { approvalMode?: boolean };
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.siteId, req.siteId)).limit(1);
  if (!row) {
    const def = defaultSiteSettings();
    await db.insert(siteSettings).values({
      siteId: req.siteId,
      navType: def.navType,
      navConfig: def.navConfig,
      footerConfig: def.footerConfig,
      seoConfig: def.seoConfig,
      blogApprovalMode: body.approvalMode ?? false,
      updatedAt: new Date(),
    });
    return { approvalMode: body.approvalMode ?? false };
  }
  const [updated] = await db.update(siteSettings)
    .set({ blogApprovalMode: body.approvalMode ?? row.blogApprovalMode, updatedAt: new Date() })
    .where(eq(siteSettings.id, row.id))
    .returning();
  return { approvalMode: updated.blogApprovalMode ?? false };
});

app.get("/api/blog/categories", { preHandler: requireAuth(["admin", "blogger", "blogger_admin"]) }, async (req) => {
  return db.select().from(blogCategories).where(eq(blogCategories.siteId, req.siteId)).orderBy(asc(blogCategories.name));
});

app.post("/api/blog/categories", { preHandler: requireAuth(["admin", "blogger", "blogger_admin"]) }, async (req, reply) => {
  const body = req.body as { name: string; slug?: string };
  if (!body.name?.trim()) return reply.status(400).send({ error: "name required" });
  const slug = slugifyText(body.slug ?? body.name) || "category";
  const [created] = await db.insert(blogCategories).values({ siteId: req.siteId, name: body.name.trim(), slug }).returning();
  return created;
});

app.put<{ Params: { id: string } }>("/api/blog/categories/:id", { preHandler: requireAuth(["admin", "blogger", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const body = req.body as { name?: string; slug?: string };
  const [existing] = await db.select().from(blogCategories).where(and(eq(blogCategories.id, id), eq(blogCategories.siteId, req.siteId))).limit(1);
  if (!existing) return reply.status(404).send({ error: "Category not found" });
  const [updated] = await db.update(blogCategories).set({
    name: body.name?.trim() ?? existing.name,
    slug: body.slug !== undefined ? (slugifyText(body.slug) || existing.slug) : existing.slug,
  }).where(eq(blogCategories.id, id)).returning();
  return updated;
});

app.delete<{ Params: { id: string } }>("/api/blog/categories/:id", { preHandler: requireAuth(["admin", "blogger", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [existing] = await db.select().from(blogCategories).where(and(eq(blogCategories.id, id), eq(blogCategories.siteId, req.siteId))).limit(1);
  if (!existing) return reply.status(404).send({ error: "Category not found" });
  await db.delete(blogCategories).where(eq(blogCategories.id, id));
  return { ok: true };
});

app.get("/api/blog/tags", { preHandler: requireAuth(["admin", "blogger", "blogger_admin"]) }, async (req) => {
  return db.select().from(blogTags).where(eq(blogTags.siteId, req.siteId)).orderBy(asc(blogTags.name));
});

app.post("/api/blog/tags", { preHandler: requireAuth(["admin", "blogger", "blogger_admin"]) }, async (req, reply) => {
  const body = req.body as { name: string; slug?: string };
  if (!body.name?.trim()) return reply.status(400).send({ error: "name required" });
  const slug = slugifyText(body.slug ?? body.name) || "tag";
  const [created] = await db.insert(blogTags).values({ siteId: req.siteId, name: body.name.trim(), slug }).returning();
  return created;
});

app.put<{ Params: { id: string } }>("/api/blog/tags/:id", { preHandler: requireAuth(["admin", "blogger", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const body = req.body as { name?: string; slug?: string };
  const [existing] = await db.select().from(blogTags).where(and(eq(blogTags.id, id), eq(blogTags.siteId, req.siteId))).limit(1);
  if (!existing) return reply.status(404).send({ error: "Tag not found" });
  const [updated] = await db.update(blogTags).set({
    name: body.name?.trim() ?? existing.name,
    slug: body.slug !== undefined ? (slugifyText(body.slug) || existing.slug) : existing.slug,
  }).where(eq(blogTags.id, id)).returning();
  return updated;
});

app.delete<{ Params: { id: string } }>("/api/blog/tags/:id", { preHandler: requireAuth(["admin", "blogger", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [existing] = await db.select().from(blogTags).where(and(eq(blogTags.id, id), eq(blogTags.siteId, req.siteId))).limit(1);
  if (!existing) return reply.status(404).send({ error: "Tag not found" });
  await db.delete(blogTags).where(eq(blogTags.id, id));
  return { ok: true };
});

app.get("/api/blog/posts", { preHandler: requireAuth(["admin", "blogger", "blogger_admin"]) }, async (req) => {
  const me = req.user as JwtPayload;
  const rows = await db.select().from(blogPosts)
    .where(eq(blogPosts.siteId, req.siteId))
    .orderBy(desc(blogPosts.updatedAt));
  const filtered = me.role === "blogger" ? rows.filter((p) => p.createdBy === me.sub) : rows;
  const hydrated = await Promise.all(filtered.map(async (post) => ({ ...post, ...(await attachBlogRelations(post.id, req.siteId)) })));
  return hydrated;
});

app.get<{ Params: { id: string } }>("/api/blog/posts/:id", { preHandler: requireAuth(["admin", "blogger", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const me = req.user as JwtPayload;
  const post = await getBlogPostById(id, req.siteId);
  if (!post) return reply.status(404).send({ error: "Post not found" });
  if (me.role === "blogger" && post.createdBy !== me.sub) return reply.status(403).send({ error: "Forbidden" });
  return { ...post, ...(await attachBlogRelations(post.id, req.siteId)) };
});

app.post("/api/blog/posts", { preHandler: requireAuth(["admin", "blogger", "blogger_admin"]) }, async (req, reply) => {
  const me = req.user as JwtPayload;
  const body = req.body as {
    title: string;
    description?: string | null;
    content?: string | null;
    slug?: string;
    status?: BlogStatus;
    datePublished?: string | null;
    headerImage?: string | null;
    approvalNotes?: string | null;
    authorIds?: number[];
    categoryIds?: number[];
    tagIds?: number[];
  };
  if (!body.title?.trim()) return reply.status(400).send({ error: "title required" });
  const approvalMode = await getBlogApprovalMode(req.siteId);
  const requestedStatus = body.status && BLOG_STATUSES.includes(body.status) ? body.status : "draft";
  let status: BlogStatus = requestedStatus;
  if (me.role === "blogger" && approvalMode && requestedStatus === "published") status = "pending_review";
  if (me.role === "blogger" && !["draft", "pending_review", "published"].includes(status)) status = "draft";
  const now = new Date();
  const [created] = await db.insert(blogPosts).values({
    siteId: req.siteId,
    title: body.title.trim(),
    description: body.description ?? null,
    content: body.content ?? null,
    slug: slugifyText(body.slug ?? body.title) || "post",
    status,
    datePublished: status === "published" ? (body.datePublished ? new Date(body.datePublished) : now) : null,
    headerImage: body.headerImage ?? null,
    approvalNotes: body.approvalNotes ?? null,
    createdBy: me.sub,
    updatedBy: me.sub,
    createdAt: now,
    updatedAt: now,
  }).returning();

  const validSiteUsers = await db.select().from(users).where(eq(users.siteId, req.siteId));
  const validUserIds = new Set(validSiteUsers.map((u) => u.id));
  const authors = (body.authorIds?.length ? Array.from(new Set(body.authorIds)) : [me.sub]).filter((id) => validUserIds.has(id));
  if (authors.length === 0) authors.push(me.sub);
  for (const userId of authors) {
    await db.insert(blogPostAuthors).values({ postId: created.id, userId }).onConflictDoNothing();
  }
  for (const categoryId of Array.from(new Set(body.categoryIds ?? []))) {
    await db.insert(blogPostCategories).values({ postId: created.id, categoryId }).onConflictDoNothing();
  }
  for (const tagId of Array.from(new Set(body.tagIds ?? []))) {
    await db.insert(blogPostTags).values({ postId: created.id, tagId }).onConflictDoNothing();
  }
  return { ...created, ...(await attachBlogRelations(created.id, req.siteId)) };
});

app.put<{ Params: { id: string } }>("/api/blog/posts/:id", { preHandler: requireAuth(["admin", "blogger", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const me = req.user as JwtPayload;
  const body = req.body as {
    title?: string;
    description?: string | null;
    content?: string | null;
    slug?: string;
    status?: BlogStatus;
    datePublished?: string | null;
    headerImage?: string | null;
    approvalNotes?: string | null;
    authorIds?: number[];
    categoryIds?: number[];
    tagIds?: number[];
  };
  const existing = await getBlogPostById(id, req.siteId);
  if (!existing) return reply.status(404).send({ error: "Post not found" });
  if (me.role === "blogger" && existing.createdBy !== me.sub) return reply.status(403).send({ error: "Forbidden" });
  const approvalMode = await getBlogApprovalMode(req.siteId);
  const updates: Record<string, unknown> = { updatedBy: me.sub, updatedAt: new Date() };
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.description !== undefined) updates.description = body.description ?? null;
  if (body.content !== undefined) updates.content = body.content ?? null;
  if (body.slug !== undefined) updates.slug = slugifyText(body.slug) || existing.slug;
  if (body.headerImage !== undefined) updates.headerImage = body.headerImage ?? null;
  if (body.approvalNotes !== undefined && (me.role === "blogger_admin" || me.role === "admin")) updates.approvalNotes = body.approvalNotes ?? null;
  if (body.status !== undefined && BLOG_STATUSES.includes(body.status)) {
    let nextStatus: BlogStatus = body.status;
    if (me.role === "blogger" && approvalMode && body.status === "published") nextStatus = "pending_review";
    if (me.role === "blogger" && !["draft", "pending_review", "published"].includes(nextStatus)) nextStatus = existing.status as BlogStatus;
    updates.status = nextStatus;
    if (nextStatus === "published") updates.datePublished = body.datePublished ? new Date(body.datePublished) : (existing.datePublished ?? new Date());
  }
  if (body.datePublished !== undefined && (me.role === "admin" || me.role === "blogger_admin")) {
    updates.datePublished = body.datePublished ? new Date(body.datePublished) : null;
  }
  const [updated] = await db.update(blogPosts).set(updates).where(eq(blogPosts.id, id)).returning();

  if (body.authorIds !== undefined) {
    await db.delete(blogPostAuthors).where(eq(blogPostAuthors.postId, id));
    const validSiteUsers = await db.select().from(users).where(eq(users.siteId, req.siteId));
    const validUserIds = new Set(validSiteUsers.map((u) => u.id));
    const unique = Array.from(new Set(body.authorIds.length ? body.authorIds : [updated.createdBy ?? me.sub])).filter((userId) => validUserIds.has(userId));
    if (unique.length === 0) unique.push(me.sub);
    for (const userId of unique) {
      await db.insert(blogPostAuthors).values({ postId: id, userId }).onConflictDoNothing();
    }
  }
  if (body.categoryIds !== undefined) {
    await db.delete(blogPostCategories).where(eq(blogPostCategories.postId, id));
    for (const categoryId of Array.from(new Set(body.categoryIds))) {
      await db.insert(blogPostCategories).values({ postId: id, categoryId }).onConflictDoNothing();
    }
  }
  if (body.tagIds !== undefined) {
    await db.delete(blogPostTags).where(eq(blogPostTags.postId, id));
    for (const tagId of Array.from(new Set(body.tagIds))) {
      await db.insert(blogPostTags).values({ postId: id, tagId }).onConflictDoNothing();
    }
  }
  return { ...updated, ...(await attachBlogRelations(updated.id, req.siteId)) };
});

app.delete<{ Params: { id: string } }>("/api/blog/posts/:id", { preHandler: requireAuth(["admin", "blogger", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const me = req.user as JwtPayload;
  const existing = await getBlogPostById(id, req.siteId);
  if (!existing) return reply.status(404).send({ error: "Post not found" });
  if (me.role === "blogger" && existing.createdBy !== me.sub) return reply.status(403).send({ error: "Forbidden" });
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
  return { ok: true };
});

app.post<{ Params: { id: string } }>("/api/blog/posts/:id/submit", { preHandler: requireAuth(["admin", "blogger", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const me = req.user as JwtPayload;
  const existing = await getBlogPostById(id, req.siteId);
  if (!existing) return reply.status(404).send({ error: "Post not found" });
  if (me.role === "blogger" && existing.createdBy !== me.sub) return reply.status(403).send({ error: "Forbidden" });
  const approvalMode = await getBlogApprovalMode(req.siteId);
  const nextStatus: BlogStatus = approvalMode ? "pending_review" : "published";
  const [updated] = await db.update(blogPosts).set({
    status: nextStatus,
    datePublished: nextStatus === "published" ? (existing.datePublished ?? new Date()) : existing.datePublished,
    updatedBy: me.sub,
    updatedAt: new Date(),
  }).where(eq(blogPosts.id, id)).returning();
  return { ...updated, ...(await attachBlogRelations(updated.id, req.siteId)) };
});

app.post<{ Params: { id: string } }>("/api/blog/posts/:id/approve", { preHandler: requireAuth(["admin", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const body = req.body as { publish?: boolean; notes?: string | null };
  const existing = await getBlogPostById(id, req.siteId);
  if (!existing) return reply.status(404).send({ error: "Post not found" });
  const me = req.user as JwtPayload;
  const publishNow = body.publish !== false;
  const [updated] = await db.update(blogPosts).set({
    status: publishNow ? "published" : "approved",
    approvalNotes: body.notes ?? existing.approvalNotes,
    datePublished: publishNow ? (existing.datePublished ?? new Date()) : existing.datePublished,
    updatedBy: me.sub,
    updatedAt: new Date(),
  }).where(eq(blogPosts.id, id)).returning();
  return { ...updated, ...(await attachBlogRelations(updated.id, req.siteId)) };
});

app.post<{ Params: { id: string } }>("/api/blog/posts/:id/reject", { preHandler: requireAuth(["admin", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const body = req.body as { notes?: string | null };
  const existing = await getBlogPostById(id, req.siteId);
  if (!existing) return reply.status(404).send({ error: "Post not found" });
  const me = req.user as JwtPayload;
  const [updated] = await db.update(blogPosts).set({
    status: "rejected",
    approvalNotes: body.notes ?? existing.approvalNotes,
    updatedBy: me.sub,
    updatedAt: new Date(),
  }).where(eq(blogPosts.id, id)).returning();
  return { ...updated, ...(await attachBlogRelations(updated.id, req.siteId)) };
});

app.get("/api/blog/public/posts", async (req) => {
  const rows = await db.select().from(blogPosts)
    .where(and(eq(blogPosts.siteId, req.siteId), eq(blogPosts.status, "published")))
    .orderBy(desc(blogPosts.datePublished), desc(blogPosts.createdAt));
  const hydrated = await Promise.all(rows.map(async (post) => ({ ...post, ...(await attachBlogRelations(post.id, req.siteId)) })));
  return hydrated;
});

app.get<{ Params: { slug: string } }>("/api/blog/public/posts/:slug", async (req, reply) => {
  const slug = req.params.slug.trim().toLowerCase();
  const [post] = await db.select().from(blogPosts)
    .where(and(eq(blogPosts.siteId, req.siteId), eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
    .limit(1);
  if (!post) return reply.status(404).send({ error: "Post not found" });
  const hydrated = { ...post, ...(await attachBlogRelations(post.id, req.siteId)) };
  return hydrated;
});

// ── Forms, Newsletter, CRM ───────────────────────────────────────────────────

type FormFieldType =
  | "text" | "email" | "textarea" | "select" | "checkbox"
  | "multiple_choice" | "checkboxes" | "dropdown" | "number" | "date" | "time"
  | "linear_scale" | "rating" | "file" | "grid_multiple_choice" | "grid_checkbox";
const FORM_FIELD_TYPES: FormFieldType[] = [
  "text", "email", "textarea", "select", "checkbox",
  "multiple_choice", "checkboxes", "dropdown", "number", "date", "time",
  "linear_scale", "rating", "file", "grid_multiple_choice", "grid_checkbox",
];
type FontPreset = "default" | "serif" | "mono" | "rounded" | "playful";
const FONT_PRESETS: FontPreset[] = ["default", "serif", "mono", "rounded", "playful"];
type ConditionOperator = "equals" | "not_equals" | "contains" | "is_empty" | "is_not_empty";
type ConditionRule = { field: string; operator: ConditionOperator; value?: string };
type Condition = { match: "all" | "any"; rules: ConditionRule[] };
type FormFieldValidation = {
  kind: "none" | "regex" | "number" | "length";
  pattern?: string;
  min?: number;
  max?: number;
  message?: string;
};
type SectionRouting = { kind: "next" | "goto" | "submit"; targetSectionId?: string };
type FormField = {
  id: string;
  label: string;
  name: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: string[];
  condition?: Condition | null;
  validation?: FormFieldValidation | null;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  ratingMax?: number;
  ratingIcon?: "star" | "heart";
  rows?: string[];
  columns?: string[];
  fileAccept?: string;
  fileMaxMB?: number;
  fileMaxCount?: number;
  points?: number;
  correctAnswers?: string[];
  correctGrid?: Record<string, string[]>;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
  optionRouting?: Record<string, string>;
};
type FormSection = {
  id: string;
  title: string;
  description?: string;
  condition?: Condition | null;
  afterSection?: SectionRouting | null;
  fields: FormField[];
};
type FormTheme = {
  headerImage: string;
  themeColor: string;
  backgroundColor: string;
  headerFont: FontPreset;
  questionFont: FontPreset;
  textFont: FontPreset;
};
type FormSettings = {
  acceptingResponses: boolean;
  closedMessage: string;
  responseLimit: number;
  isQuiz: boolean;
  showScoreImmediately: boolean;
  collectEmail: boolean;
  showProgressBar: boolean;
};
type FieldTranslations = {
  label?: string;
  description?: string;
  placeholder?: string;
  options?: string[];
  rows?: string[];
  columns?: string[];
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
};
type SectionTranslations = { title?: string; description?: string };
type FormTranslations = {
  name?: string;
  description?: string;
  submitLabel?: string;
  successMessage?: string;
  closedMessage?: string;
  sections?: Record<string, SectionTranslations>;
  fields?: Record<string, FieldTranslations>;
};

const CONDITION_OPERATORS: ConditionOperator[] = ["equals", "not_equals", "contains", "is_empty", "is_not_empty"];

function normalizeCondition(input: unknown): Condition | null {
  if (!input || typeof input !== "object") return null;
  const c = input as Record<string, unknown>;
  const rules: ConditionRule[] = (Array.isArray(c.rules) ? c.rules : [])
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
    .map((r) => ({
      field: typeof r.field === "string" ? r.field : "",
      operator: (CONDITION_OPERATORS.includes(r.operator as ConditionOperator) ? r.operator : "equals") as ConditionOperator,
      value: typeof r.value === "string" ? r.value : "",
    }))
    .filter((r) => r.field);
  if (rules.length === 0) return null;
  return { match: c.match === "any" ? "any" : "all", rules };
}

function evaluateConditionRule(rule: ConditionRule, values: Record<string, unknown>): boolean {
  const raw = values[rule.field];
  const actual = raw == null ? "" : typeof raw === "boolean" ? (raw ? "true" : "false") : String(raw);
  const expected = rule.value ?? "";
  switch (rule.operator) {
    case "equals": return actual === expected;
    case "not_equals": return actual !== expected;
    case "contains": return actual.toLowerCase().includes(expected.toLowerCase());
    case "is_empty": return actual.trim() === "";
    case "is_not_empty": return actual.trim() !== "";
    default: return true;
  }
}

// Mirrored verbatim in apps/web/src/lib/formConditions.ts.
function evaluateCondition(condition: Condition | null | undefined, values: Record<string, unknown>): boolean {
  if (!condition || condition.rules.length === 0) return true;
  const results = condition.rules.map((r) => evaluateConditionRule(r, values));
  return condition.match === "any" ? results.some(Boolean) : results.every(Boolean);
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function coerceFormFieldType(raw: unknown): FormFieldType {
  return (typeof raw === "string" && (FORM_FIELD_TYPES as string[]).includes(raw) ? raw : "text") as FormFieldType;
}

function coerceStringArray(input: unknown): string[] {
  return Array.isArray(input) ? input.filter((o): o is string => typeof o === "string") : [];
}

function normalizeValidation(input: unknown): FormFieldValidation | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  const kind = (["none", "regex", "number", "length"].includes(v.kind as string)
    ? v.kind : "none") as FormFieldValidation["kind"];
  if (kind === "none") return null;
  const out: FormFieldValidation = { kind };
  if (typeof v.pattern === "string") out.pattern = v.pattern;
  if (typeof v.min === "number" && Number.isFinite(v.min)) out.min = v.min;
  if (typeof v.max === "number" && Number.isFinite(v.max)) out.max = v.max;
  if (typeof v.message === "string") out.message = v.message;
  return out;
}

function normalizeRouting(input: unknown): SectionRouting | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  const kind = (["next", "goto", "submit"].includes(r.kind as string) ? r.kind : "next") as SectionRouting["kind"];
  if (kind === "next") return null;
  const out: SectionRouting = { kind };
  if (kind === "goto" && typeof r.targetSectionId === "string") out.targetSectionId = r.targetSectionId;
  return out;
}

function normalizeStringMap(input: unknown): Record<string, string> | undefined {
  if (!input || typeof input !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === "string" && v) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeStringArrayMap(input: unknown): Record<string, string[]> | undefined {
  if (!input || typeof input !== "object") return undefined;
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const arr = coerceStringArray(v);
    if (arr.length) out[k] = arr;
  }
  return Object.keys(out).length ? out : undefined;
}

// Coerce one raw field object into a fully-shaped FormField. `slugifyName` is true on
// the write path (normalizeFormFields) and false on the read path (parseFormFields).
function normalizeFormField(item: unknown, index: number, slugifyName: boolean): FormField {
  const field = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
  const type = coerceFormFieldType(field.type);
  const nameRaw = typeof field.name === "string" ? field.name.trim() : "";
  let name = nameRaw || `field_${index + 1}`;
  if (slugifyName) name = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "_");
  const out: FormField = {
    id: typeof field.id === "string" && field.id.trim() ? field.id.trim() : `f_${index + 1}`,
    label: typeof field.label === "string" ? field.label : name,
    name,
    type,
    required: Boolean(field.required),
    placeholder: typeof field.placeholder === "string" ? field.placeholder : "",
    description: typeof field.description === "string" ? field.description : "",
    options: coerceStringArray(field.options),
    condition: normalizeCondition(field.condition),
    validation: normalizeValidation(field.validation),
  };
  if (type === "linear_scale") {
    out.scaleMin = typeof field.scaleMin === "number" ? field.scaleMin : 1;
    out.scaleMax = typeof field.scaleMax === "number" ? field.scaleMax : 5;
    out.scaleMinLabel = typeof field.scaleMinLabel === "string" ? field.scaleMinLabel : "";
    out.scaleMaxLabel = typeof field.scaleMaxLabel === "string" ? field.scaleMaxLabel : "";
  }
  if (type === "rating") {
    out.ratingMax = typeof field.ratingMax === "number" ? field.ratingMax : 5;
    out.ratingIcon = field.ratingIcon === "heart" ? "heart" : "star";
  }
  if (type === "grid_multiple_choice" || type === "grid_checkbox") {
    out.rows = coerceStringArray(field.rows);
    out.columns = coerceStringArray(field.columns);
  }
  if (type === "file") {
    out.fileAccept = typeof field.fileAccept === "string" ? field.fileAccept : "";
    out.fileMaxMB = typeof field.fileMaxMB === "number" ? field.fileMaxMB : 10;
    out.fileMaxCount = typeof field.fileMaxCount === "number" ? field.fileMaxCount : 1;
  }
  out.points = typeof field.points === "number" && Number.isFinite(field.points) ? Math.max(0, field.points) : 0;
  const correctAnswers = coerceStringArray(field.correctAnswers);
  if (correctAnswers.length) out.correctAnswers = correctAnswers;
  const correctGrid = normalizeStringArrayMap(field.correctGrid);
  if (correctGrid) out.correctGrid = correctGrid;
  if (typeof field.feedbackCorrect === "string") out.feedbackCorrect = field.feedbackCorrect;
  if (typeof field.feedbackIncorrect === "string") out.feedbackIncorrect = field.feedbackIncorrect;
  const optionRouting = normalizeStringMap(field.optionRouting);
  if (optionRouting) out.optionRouting = optionRouting;
  return out;
}

function parseFormFields(value: string | null): FormField[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item, i) => normalizeFormField(item, i, false));
  } catch {
    return [];
  }
}

function normalizeFormFields(input: unknown): FormField[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && typeof item === "object")
    .map((item, i) => normalizeFormField(item, i, true));
}

function normalizeFormTheme(input: unknown): FormTheme {
  const t = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const font = (v: unknown): FontPreset => (FONT_PRESETS.includes(v as FontPreset) ? (v as FontPreset) : "default");
  return {
    headerImage: typeof t.headerImage === "string" ? t.headerImage : "",
    themeColor: typeof t.themeColor === "string" && t.themeColor ? t.themeColor : "#0f766e",
    backgroundColor: typeof t.backgroundColor === "string" && t.backgroundColor ? t.backgroundColor : "#f1f5f9",
    headerFont: font(t.headerFont),
    questionFont: font(t.questionFont),
    textFont: font(t.textFont),
  };
}

function normalizeSectionTranslations(input: unknown): SectionTranslations {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: SectionTranslations = {};
  if (typeof o.title === "string") out.title = o.title;
  if (typeof o.description === "string") out.description = o.description;
  return out;
}
function normalizeFieldTranslations(input: unknown): FieldTranslations {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: FieldTranslations = {};
  if (typeof o.label === "string") out.label = o.label;
  if (typeof o.description === "string") out.description = o.description;
  if (typeof o.placeholder === "string") out.placeholder = o.placeholder;
  const opts = coerceStringArray(o.options); if (opts.length) out.options = opts;
  const rows = coerceStringArray(o.rows); if (rows.length) out.rows = rows;
  const cols = coerceStringArray(o.columns); if (cols.length) out.columns = cols;
  if (typeof o.scaleMinLabel === "string") out.scaleMinLabel = o.scaleMinLabel;
  if (typeof o.scaleMaxLabel === "string") out.scaleMaxLabel = o.scaleMaxLabel;
  return out;
}
function normalizeFormTranslation(input: unknown): FormTranslations {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: FormTranslations = {};
  if (typeof o.name === "string") out.name = o.name;
  if (typeof o.description === "string") out.description = o.description;
  if (typeof o.submitLabel === "string") out.submitLabel = o.submitLabel;
  if (typeof o.successMessage === "string") out.successMessage = o.successMessage;
  if (typeof o.closedMessage === "string") out.closedMessage = o.closedMessage;
  if (o.sections && typeof o.sections === "object") {
    const sections: Record<string, SectionTranslations> = {};
    for (const [k, v] of Object.entries(o.sections as Record<string, unknown>)) sections[k] = normalizeSectionTranslations(v);
    out.sections = sections;
  }
  if (o.fields && typeof o.fields === "object") {
    const fields: Record<string, FieldTranslations> = {};
    for (const [k, v] of Object.entries(o.fields as Record<string, unknown>)) fields[k] = normalizeFieldTranslations(v);
    out.fields = fields;
  }
  return out;
}
function normalizeTranslationsMap(input: unknown): Record<string, FormTranslations> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, FormTranslations> = {};
  for (const [lang, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof lang !== "string" || !lang.trim()) continue;
    out[lang.trim()] = normalizeFormTranslation(v);
  }
  return out;
}

function normalizeFormSettings(input: unknown): FormSettings {
  const s = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  const limit = typeof s.responseLimit === "number" && Number.isFinite(s.responseLimit)
    ? Math.max(0, Math.floor(s.responseLimit)) : 0;
  return {
    acceptingResponses: bool(s.acceptingResponses, true),
    closedMessage: typeof s.closedMessage === "string" && s.closedMessage
      ? s.closedMessage : "This form is no longer accepting responses.",
    responseLimit: limit,
    isQuiz: bool(s.isQuiz, false),
    showScoreImmediately: bool(s.showScoreImmediately, true),
    collectEmail: bool(s.collectEmail, false),
    showProgressBar: bool(s.showProgressBar, true),
  };
}

function normalizeFormSections(input: unknown): FormSection[] {
  if (!Array.isArray(input)) return [];
  const sections: FormSection[] = input
    .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === "object")
    .map((s, index) => ({
      id: typeof s.id === "string" && s.id.trim() ? s.id.trim() : `s_${index + 1}`,
      title: typeof s.title === "string" ? s.title : "",
      description: typeof s.description === "string" ? s.description : "",
      condition: normalizeCondition(s.condition),
      afterSection: normalizeRouting(s.afterSection),
      fields: normalizeFormFields(s.fields),
    }));
  // Field `name` must be unique across the whole form — conditions key off it.
  const seen = new Set<string>();
  for (const section of sections) {
    for (const field of section.fields) {
      let name = field.name;
      let n = 2;
      while (seen.has(name)) name = `${field.name}_${n++}`;
      seen.add(name);
      field.name = name;
    }
  }
  return sections;
}

function parseFormSections(value: string | null): FormSection[] {
  if (!value) return [];
  try { return normalizeFormSections(JSON.parse(value)); } catch { return []; }
}

function deriveFlatFields(sections: FormSection[]): FormField[] {
  return sections.flatMap((s) => s.fields);
}

function synthesizeSections(fields: FormField[]): FormSection[] {
  return fields.length ? [{ id: "default", title: "", description: "", condition: null, afterSection: null, fields }] : [];
}

// `sections` is the source of truth; legacy rows with only `fields` get one synthesized
// section. The returned `fields` is always the flattened section fields.
function mapFormRow(row: typeof forms.$inferSelect) {
  let sections = parseFormSections(row.sections);
  if (sections.length === 0) {
    const legacy = parseFormFields(row.fields);
    if (legacy.length > 0) sections = synthesizeSections(legacy);
  }
  return {
    ...row,
    layout: row.layout === "steps" ? "steps" : "single",
    sections,
    fields: deriveFlatFields(sections),
    theme: normalizeFormTheme(parseJsonObject(row.theme)),
    settings: normalizeFormSettings(parseJsonObject(row.settings)),
    primaryLanguage: row.primaryLanguage || "en",
    translations: normalizeTranslationsMap(parseJsonObject(row.translations)),
  };
}

function mapSubscriberRow(row: typeof newsletterSubscribers.$inferSelect) {
  return {
    ...row,
    meta: parseJsonObject(row.meta),
  };
}

function mapLeadRow(row: typeof crmLeads.$inferSelect & { archived?: boolean; tags?: string | null; custom_fields?: string | null; score?: number }) {
  return {
    ...row,
    payload: parseJsonObject(row.payload),
    archived: (row as unknown as { archived?: boolean }).archived ?? false,
    tags: parseJsonArraySafe<string>((row as unknown as { tags?: string }).tags),
    customFields: (() => { try { return JSON.parse((row as unknown as { custom_fields?: string }).custom_fields ?? "{}") as Record<string, string>; } catch { return {}; } })(),
    score: (row as unknown as { score?: number }).score ?? 0,
  };
}

function parseJsonArraySafe<T = unknown>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch { return []; }
}

type CrmColumnSupport = {
  leadsArchived: boolean;
  leadsTags: boolean;
  leadsCustomFields: boolean;
  leadsScore: boolean;
  channelsType: boolean;
};

let crmColumnSupportCache: { value: CrmColumnSupport; expiresAt: number } | null = null;

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const maybe = result as { rows?: unknown };
  if (maybe && Array.isArray(maybe.rows)) return maybe.rows as T[];
  return [];
}

function firstRow<T>(result: unknown): T | undefined {
  const rows = extractRows<T>(result);
  return rows[0];
}

async function getCrmColumnSupport(forceRefresh = false): Promise<CrmColumnSupport> {
  const now = Date.now();
  if (!forceRefresh && crmColumnSupportCache && crmColumnSupportCache.expiresAt > now) {
    return crmColumnSupportCache.value;
  }

  const rows = extractRows<{ table_name: string; column_name: string }>(await db.execute(sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'crm_leads' AND column_name IN ('archived', 'tags', 'custom_fields', 'score'))
        OR (table_name = 'crm_channels' AND column_name IN ('channel_type'))
      )
  `));

  const has = (table: string, column: string) => rows.some((r) => r.table_name === table && r.column_name === column);
  const value: CrmColumnSupport = {
    leadsArchived: has("crm_leads", "archived"),
    leadsTags: has("crm_leads", "tags"),
    leadsCustomFields: has("crm_leads", "custom_fields"),
    leadsScore: has("crm_leads", "score"),
    channelsType: has("crm_channels", "channel_type"),
  };
  crmColumnSupportCache = { value, expiresAt: now + 30_000 };
  return value;
}

function mapFormResponseRow(row: typeof crmLeads.$inferSelect) {
  const payload = parseJsonObject(row.payload);
  const values = payload.values && typeof payload.values === "object" ? payload.values as Record<string, unknown> : {};
  const meta = payload.meta && typeof payload.meta === "object" ? payload.meta as Record<string, unknown> : {};
  return {
    id: row.id,
    formId: row.formId,
    siteId: row.siteId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    values,
    meta,
    score: payload.score && typeof payload.score === "object"
      ? (payload.score as Record<string, unknown>) : null,
    userAgent: typeof payload.userAgent === "string" ? payload.userAgent : "",
    ip: typeof payload.ip === "string" ? payload.ip : "",
  };
}

async function findOrCreateSourceChannel(siteId: number, source: "form" | "newsletter" | "custom") {
  const [existing] = await db.select().from(crmChannels)
    .where(and(eq(crmChannels.siteId, siteId), eq(crmChannels.slug, source)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db.insert(crmChannels).values({
    siteId,
    name: source === "form" ? "Forms" : source === "newsletter" ? "Newsletter" : "Custom",
    slug: source,
    description: `${source} channel`,
    isActive: true,
    updatedAt: new Date(),
  }).returning();
  return created;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// True when a field has no meaningful answer — shape-aware per field type.
// Mirrored in apps/web/src/lib/formValidation.ts.
function isFieldValueEmpty(field: FormField, value: unknown): boolean {
  switch (field.type) {
    case "checkbox":
      return value !== true && value !== "true";
    case "checkboxes":
    case "file":
      return !Array.isArray(value) || value.length === 0;
    case "grid_multiple_choice":
    case "grid_checkbox": {
      if (!value || typeof value !== "object") return true;
      const v = value as Record<string, unknown>;
      const rows = field.rows ?? [];
      if (rows.length === 0) return true;
      return rows.some((r) => {
        const cell = v[r];
        return field.type === "grid_checkbox"
          ? !Array.isArray(cell) || cell.length === 0
          : typeof cell !== "string" || cell === "";
      });
    }
    default:
      return value == null || value === "";
  }
}

// Returns an error message, or null when the value is acceptable.
// Mirrored in apps/web/src/lib/formValidation.ts.
function validateFieldValue(field: FormField, value: unknown): string | null {
  const label = field.label || field.name;
  const empty = isFieldValueEmpty(field, value);
  if (field.required && empty) return `${label} is required`;
  if (empty) return null;
  if (field.type === "email" && typeof value === "string" && !EMAIL_RE.test(value.trim())) {
    return `${label} must be a valid email`;
  }
  if (field.type === "number" && !Number.isFinite(Number(value))) {
    return `${label} must be a number`;
  }
  if (field.type === "file" && Array.isArray(value)) {
    for (const f of value) {
      const url = f && typeof f === "object" ? (f as Record<string, unknown>).url : null;
      if (typeof url !== "string" || !url.startsWith("/uploads/")) return `${label}: invalid file`;
    }
    if ((field.fileMaxCount ?? 1) > 0 && value.length > (field.fileMaxCount ?? 1)) {
      return `${label}: too many files`;
    }
  }
  const rule = field.validation;
  if (rule && rule.kind !== "none") {
    const str = typeof value === "string" ? value : String(value ?? "");
    if (rule.kind === "regex" && rule.pattern) {
      try {
        if (!new RegExp(rule.pattern).test(str)) return rule.message || `${label} is invalid`;
      } catch { /* ignore malformed pattern */ }
    }
    if (rule.kind === "length") {
      if (rule.min != null && str.length < rule.min) return rule.message || `${label} must be at least ${rule.min} characters`;
      if (rule.max != null && str.length > rule.max) return rule.message || `${label} must be at most ${rule.max} characters`;
    }
    if (rule.kind === "number") {
      const n = Number(str);
      if (!Number.isFinite(n)) return rule.message || `${label} must be a number`;
      if (rule.min != null && n < rule.min) return rule.message || `${label} must be ≥ ${rule.min}`;
      if (rule.max != null && n > rule.max) return rule.message || `${label} must be ≤ ${rule.max}`;
    }
  }
  return null;
}

const sortedCopy = (a: string[]) => a.slice().sort();
const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && sortedCopy(a).every((x, i) => x === sortedCopy(b)[i]);

// Quiz grading — compares a submitted answer against the field's answer key.
function isAnswerCorrect(field: FormField, value: unknown): boolean {
  if (field.type === "grid_multiple_choice" || field.type === "grid_checkbox") {
    const cg = field.correctGrid ?? {};
    const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
    const rows = field.rows ?? [];
    if (rows.length === 0) return false;
    return rows.every((r) => {
      const want = cg[r] ?? [];
      if (want.length === 0) return false;
      const got = field.type === "grid_checkbox"
        ? (Array.isArray(v[r]) ? (v[r] as string[]) : [])
        : (typeof v[r] === "string" && v[r] ? [v[r] as string] : []);
      return sameSet(want, got);
    });
  }
  if (field.type === "checkboxes") {
    const want = field.correctAnswers ?? [];
    const got = Array.isArray(value) ? (value as string[]) : [];
    return want.length > 0 && sameSet(want, got);
  }
  const correct = field.correctAnswers ?? [];
  if (correct.length === 0) return false;
  const str = typeof value === "string" ? value : String(value ?? "");
  return correct.some((c) => c.trim().toLowerCase() === str.trim().toLowerCase());
}

function gradeSubmission(sections: FormSection[], values: Record<string, unknown>) {
  let earned = 0;
  let total = 0;
  const breakdown: { name: string; label: string; points: number; earned: number; correct: boolean }[] = [];
  for (const section of sections) {
    for (const field of section.fields) {
      const points = field.points ?? 0;
      if (points <= 0) continue;
      total += points;
      const correct = isAnswerCorrect(field, values[field.name]);
      const got = correct ? points : 0;
      earned += got;
      breakdown.push({ name: field.name, label: field.label || field.name, points, earned: got, correct });
    }
  }
  return { earned, total, percent: total > 0 ? Math.round((earned / total) * 100) : 0, breakdown };
}

// ── Translation helpers ──────────────────────────────────────────────────────

type MappedForm = ReturnType<typeof mapFormRow>;

/** Flatten every translatable string in a form to a stable-keyed map. */
function collectFormStrings(form: MappedForm): Record<string, string> {
  const out: Record<string, string> = {};
  if (form.name) out["form.name"] = form.name;
  if (form.description) out["form.description"] = form.description;
  if (form.submitLabel) out["form.submitLabel"] = form.submitLabel;
  if (form.successMessage) out["form.successMessage"] = form.successMessage;
  if (form.settings?.closedMessage) out["form.closedMessage"] = form.settings.closedMessage;
  for (const s of form.sections) {
    if (s.title) out[`section.${s.id}.title`] = s.title;
    if (s.description) out[`section.${s.id}.description`] = s.description;
    for (const f of s.fields) {
      if (f.label) out[`field.${f.id}.label`] = f.label;
      if (f.description) out[`field.${f.id}.description`] = f.description;
      if (f.placeholder) out[`field.${f.id}.placeholder`] = f.placeholder;
      if (f.scaleMinLabel) out[`field.${f.id}.scaleMinLabel`] = f.scaleMinLabel;
      if (f.scaleMaxLabel) out[`field.${f.id}.scaleMaxLabel`] = f.scaleMaxLabel;
      (f.options ?? []).forEach((opt, i) => { if (opt) out[`field.${f.id}.option.${i}`] = opt; });
      (f.rows ?? []).forEach((r, i) => { if (r) out[`field.${f.id}.row.${i}`] = r; });
      (f.columns ?? []).forEach((c, i) => { if (c) out[`field.${f.id}.col.${i}`] = c; });
    }
  }
  return out;
}

/** Inverse of collectFormStrings — folds the flat translated map back into FormTranslations. */
function rehydrateTranslations(translated: Record<string, string>): FormTranslations {
  const out: FormTranslations = {};
  const sections: Record<string, SectionTranslations> = {};
  const fields: Record<string, FieldTranslations> = {};
  for (const [key, val] of Object.entries(translated)) {
    if (typeof val !== "string") continue;
    const parts = key.split(".");
    if (parts[0] === "form") {
      const k = parts[1];
      if (k === "name") out.name = val;
      else if (k === "description") out.description = val;
      else if (k === "submitLabel") out.submitLabel = val;
      else if (k === "successMessage") out.successMessage = val;
      else if (k === "closedMessage") out.closedMessage = val;
    } else if (parts[0] === "section" && parts[1]) {
      const id = parts[1];
      const k = parts[2];
      sections[id] = sections[id] ?? {};
      if (k === "title") sections[id].title = val;
      else if (k === "description") sections[id].description = val;
    } else if (parts[0] === "field" && parts[1]) {
      const id = parts[1];
      const k = parts[2];
      fields[id] = fields[id] ?? {};
      if (k === "label") fields[id].label = val;
      else if (k === "description") fields[id].description = val;
      else if (k === "placeholder") fields[id].placeholder = val;
      else if (k === "scaleMinLabel") fields[id].scaleMinLabel = val;
      else if (k === "scaleMaxLabel") fields[id].scaleMaxLabel = val;
      else if (k === "option" || k === "row" || k === "col") {
        const i = Number(parts[3]);
        if (Number.isFinite(i)) {
          const arrKey = k === "option" ? "options" : k === "row" ? "rows" : "columns";
          const arr = (fields[id][arrKey] ?? []) as string[];
          arr[i] = val;
          fields[id][arrKey] = arr;
        }
      }
    }
  }
  if (Object.keys(sections).length) out.sections = sections;
  if (Object.keys(fields).length) out.fields = fields;
  return out;
}

function stripJsonFence(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fence ? fence[1] : text).trim();
}

/** Translate string values via the Anthropic Messages API. Falls back to copy-source. */
async function translateStringsViaAnthropic(
  strings: Record<string, string>, sourceLang: string, targetLang: string, targetName?: string,
  siteId?: number | null,
): Promise<{ translated: Record<string, string>; warning?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { translated: { ...strings }, warning: "ANTHROPIC_API_KEY is not set — copied the source strings so you can edit them manually." };
  }
  const model = "claude-haiku-4-5-20251001";
  const prompt =
    `Translate the string VALUES in the JSON object below from ${sourceLang} to ${targetName || targetLang} (${targetLang}). ` +
    `Keep every key exactly as it is. Preserve placeholders like {name}, %s, and any HTML tags. ` +
    `Return ONLY the resulting JSON object — no commentary, no code fence.\n\n` +
    JSON.stringify(strings, null, 2);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { translated: { ...strings }, warning: `Translation API failed (${res.status}). Source strings copied — edit manually. ${errText.slice(0, 200)}` };
    }
    const data = await res.json() as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    void recordAnthropicUsage({
      endpoint: "forms.translate",
      model,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      siteId: siteId ?? null,
    });
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = JSON.parse(stripJsonFence(text)) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") throw new Error("Translation response was not an object");
    const translated: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) translated[k] = typeof v === "string" ? v : String(v ?? "");
    return { translated };
  } catch (e) {
    return { translated: { ...strings }, warning: `Translation could not be parsed (${(e as Error).message}). Source strings copied — edit manually.` };
  }
}

/** Fire-and-forget insert; failures are logged but never bubble to the caller. */
async function recordAnthropicUsage(row: {
  endpoint: string; model: string; inputTokens: number; outputTokens: number; siteId: number | null;
}): Promise<void> {
  try {
    await db.insert(anthropicUsage).values({
      endpoint: row.endpoint,
      model: row.model,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      siteId: row.siteId,
    });
  } catch (e) {
    app.log.warn({ err: e }, "anthropic_usage insert failed");
  }
}

const FORM_UPLOAD_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
  "application/pdf", "text/plain", "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const FORM_UPLOAD_MAX_BYTES = 10_000_000;

app.get("/api/forms", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req) => {
  const rows = await db.select().from(forms)
    .where(eq(forms.siteId, req.siteId))
    .orderBy(asc(forms.name));
  return rows.map(mapFormRow);
});

app.get("/api/forms/responses", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req) => {
  const rows = await db.select().from(crmLeads)
    .where(and(eq(crmLeads.siteId, req.siteId), eq(crmLeads.source, "form")))
    .orderBy(desc(crmLeads.createdAt));
  return rows.map(mapFormResponseRow);
});

app.get<{ Params: { id: string } }>("/api/forms/:id", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [row] = await db.select().from(forms)
    .where(and(eq(forms.id, id), eq(forms.siteId, req.siteId)))
    .limit(1);
  if (!row) return reply.status(404).send({ error: "Form not found" });
  return mapFormRow(row);
});

app.get<{ Params: { id: string } }>("/api/forms/:id/responses", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [form] = await db.select().from(forms)
    .where(and(eq(forms.id, id), eq(forms.siteId, req.siteId)))
    .limit(1);
  if (!form) return reply.status(404).send({ error: "Form not found" });
  const rows = await db.select().from(crmLeads)
    .where(and(eq(crmLeads.siteId, req.siteId), eq(crmLeads.source, "form"), eq(crmLeads.formId, id)))
    .orderBy(desc(crmLeads.createdAt));
  return rows.map(mapFormResponseRow);
});

app.get<{ Params: { slug: string } }>("/api/forms/by-slug/:slug", async (req, reply) => {
  const [row] = await db.select().from(forms)
    .where(and(eq(forms.siteId, req.siteId), eq(forms.slug, req.params.slug), eq(forms.status, "active")))
    .limit(1);
  if (!row) return reply.status(404).send({ error: "Form not found" });
  return mapFormRow(row);
});

// Resolve a form slug that is unique within the site, suffixing -2, -3, … on collision.
async function uniqueFormSlug(siteId: number, base: string, excludeId?: number): Promise<string> {
  const root = slugifyText(base) || "form";
  let candidate = root;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [clash] = await db.select({ id: forms.id }).from(forms)
      .where(and(eq(forms.siteId, siteId), eq(forms.slug, candidate)))
      .limit(1);
    if (!clash || clash.id === excludeId) return candidate;
    candidate = `${root}-${n++}`;
  }
}

app.post("/api/forms", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const body = req.body as {
    name: string;
    slug?: string;
    description?: string | null;
    status?: "active" | "inactive";
    submitLabel?: string;
    successMessage?: string;
    layout?: "single" | "steps";
    fields?: unknown[];
    sections?: unknown[];
    theme?: unknown;
    settings?: unknown;
    primaryLanguage?: string;
    translations?: unknown;
  };
  if (!body.name?.trim()) return reply.status(400).send({ error: "name required" });
  const slug = await uniqueFormSlug(req.siteId, body.slug ?? body.name);
  const sections = body.sections !== undefined
    ? normalizeFormSections(body.sections)
    : synthesizeSections(normalizeFormFields(body.fields));
  const [created] = await db.insert(forms).values({
    siteId: req.siteId,
    name: body.name.trim(),
    slug,
    description: body.description ?? null,
    status: body.status === "inactive" ? "inactive" : "active",
    submitLabel: body.submitLabel?.trim() || "Submit",
    successMessage: body.successMessage?.trim() || "Thanks, we received your submission.",
    fields: JSON.stringify(deriveFlatFields(sections)),
    sections: JSON.stringify(sections),
    layout: body.layout === "steps" ? "steps" : "single",
    theme: JSON.stringify(normalizeFormTheme(body.theme)),
    settings: JSON.stringify(normalizeFormSettings(body.settings)),
    primaryLanguage: body.primaryLanguage?.trim() || "en",
    translations: JSON.stringify(normalizeTranslationsMap(body.translations)),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return mapFormRow(created);
});

app.put<{ Params: { id: string } }>("/api/forms/:id", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const body = req.body as {
    name?: string;
    slug?: string;
    description?: string | null;
    status?: "active" | "inactive";
    submitLabel?: string;
    successMessage?: string;
    layout?: "single" | "steps";
    fields?: unknown[];
    sections?: unknown[];
    theme?: unknown;
    settings?: unknown;
    primaryLanguage?: string;
    translations?: unknown;
  };
  const [existing] = await db.select().from(forms)
    .where(and(eq(forms.id, id), eq(forms.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Form not found" });

  let sections: FormSection[];
  if (body.sections !== undefined) sections = normalizeFormSections(body.sections);
  else if (body.fields !== undefined) sections = synthesizeSections(normalizeFormFields(body.fields));
  else sections = mapFormRow(existing).sections;

  const slug = body.slug !== undefined
    ? await uniqueFormSlug(req.siteId, body.slug, id)
    : existing.slug;

  const [updated] = await db.update(forms).set({
    name: body.name !== undefined ? body.name.trim() : existing.name,
    slug,
    description: body.description !== undefined ? body.description ?? null : existing.description,
    status: body.status !== undefined ? body.status : existing.status,
    submitLabel: body.submitLabel !== undefined ? (body.submitLabel.trim() || existing.submitLabel) : existing.submitLabel,
    successMessage: body.successMessage !== undefined ? (body.successMessage.trim() || existing.successMessage) : existing.successMessage,
    fields: JSON.stringify(deriveFlatFields(sections)),
    sections: JSON.stringify(sections),
    layout: body.layout !== undefined ? (body.layout === "steps" ? "steps" : "single") : existing.layout,
    theme: body.theme !== undefined ? JSON.stringify(normalizeFormTheme(body.theme)) : existing.theme,
    settings: body.settings !== undefined ? JSON.stringify(normalizeFormSettings(body.settings)) : existing.settings,
    primaryLanguage: body.primaryLanguage !== undefined ? (body.primaryLanguage.trim() || "en") : existing.primaryLanguage,
    translations: body.translations !== undefined ? JSON.stringify(normalizeTranslationsMap(body.translations)) : existing.translations,
    updatedAt: new Date(),
  }).where(eq(forms.id, id)).returning();
  return mapFormRow(updated);
});

app.delete<{ Params: { id: string } }>("/api/forms/:id", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [existing] = await db.select().from(forms)
    .where(and(eq(forms.id, id), eq(forms.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Form not found" });
  await db.delete(forms).where(eq(forms.id, id));
  return { ok: true };
});

app.post<{ Params: { id: string }; Body: { targetLang?: string; languageName?: string } }>(
  "/api/forms/:id/translate",
  { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) },
  async (req, reply) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
    const targetLang = (req.body?.targetLang ?? "").trim();
    if (!targetLang) return reply.status(400).send({ error: "targetLang required" });
    const [row] = await db.select().from(forms)
      .where(and(eq(forms.id, id), eq(forms.siteId, req.siteId)))
      .limit(1);
    if (!row) return reply.status(404).send({ error: "Form not found" });
    const form = mapFormRow(row);
    if (targetLang === form.primaryLanguage) {
      return reply.status(400).send({ error: "Target language matches the primary language" });
    }
    const strings = collectFormStrings(form);
    if (Object.keys(strings).length === 0) {
      return { translations: {} as FormTranslations, warning: "Nothing to translate yet — add some questions first." };
    }
    const { translated, warning } = await translateStringsViaAnthropic(
      strings, form.primaryLanguage, targetLang, req.body?.languageName, req.siteId,
    );
    const translations = rehydrateTranslations(translated);
    return warning ? { translations, warning } : { translations };
  },
);

// ── Anthropic API usage report ────────────────────────────────────────────────
// Returns aggregated token counts recorded by recordAnthropicUsage().
// Auth: either a valid admin/page_developer JWT, OR a loopback request (used
// by the setup-deploy.sh wizard via `docker exec api wget …`).
app.get<{ Querystring: { range?: string } }>(
  "/api/anthropic/usage",
  async (req, reply) => {
    const ip = req.ip || "";
    const isLoopback = ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
    if (!isLoopback) {
      try {
        await req.jwtVerify();
        const u = req.user as JwtPayload;
        if (!u || !["admin", "page_developer", "blogger_admin"].includes(u.role)) {
          return reply.status(403).send({ error: "Forbidden" });
        }
      } catch {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    }

    const range = (req.query?.range ?? "30d").toLowerCase();
    let cutoff: Date | null = null;
    if (range === "7d")  cutoff = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
    else if (range === "30d") cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    else if (range !== "all") {
      return reply.status(400).send({ error: "range must be 7d, 30d, or all" });
    }

    const whereExpr = cutoff
      ? sql`${anthropicUsage.createdAt} >= ${cutoff}`
      : sql`true`;

    const totals = await db.execute(sql<{
      total_requests: number; total_input: number; total_output: number; last_call: Date | null;
    }>`
      SELECT
        COUNT(*)::int                          AS total_requests,
        COALESCE(SUM(input_tokens), 0)::int    AS total_input,
        COALESCE(SUM(output_tokens), 0)::int   AS total_output,
        MAX(created_at)                        AS last_call
      FROM anthropic_usage
      WHERE ${whereExpr}
    `);

    const byModel = await db.execute(sql<{
      model: string; requests: number; input_tokens: number; output_tokens: number;
    }>`
      SELECT model,
             COUNT(*)::int                        AS requests,
             COALESCE(SUM(input_tokens), 0)::int  AS input_tokens,
             COALESCE(SUM(output_tokens), 0)::int AS output_tokens
      FROM anthropic_usage
      WHERE ${whereExpr}
      GROUP BY model
      ORDER BY requests DESC
    `);

    const t = (totals as unknown as Array<{
      total_requests: number; total_input: number; total_output: number; last_call: Date | null;
    }>)[0] ?? { total_requests: 0, total_input: 0, total_output: 0, last_call: null };

    return {
      range,
      totalRequests:     Number(t.total_requests ?? 0),
      totalInputTokens:  Number(t.total_input ?? 0),
      totalOutputTokens: Number(t.total_output ?? 0),
      lastCall:          t.last_call ? new Date(t.last_call).toISOString() : null,
      byModel:           byModel as unknown as Array<{
        model: string; requests: number; input_tokens: number; output_tokens: number;
      }>,
    };
  },
);

// Public file-upload endpoint for `file` question types. Unauthenticated — gated by the
// form being active and accepting responses. Stores files in UPLOADS_DIR with UUID names.
app.post<{ Params: { slug: string } }>("/api/forms/:slug/upload", async (req, reply) => {
  const [form] = await db.select().from(forms)
    .where(and(eq(forms.siteId, req.siteId), eq(forms.slug, req.params.slug), eq(forms.status, "active")))
    .limit(1);
  if (!form) return reply.status(404).send({ error: "Form not found" });
  const settings = normalizeFormSettings(parseJsonObject(form.settings));
  if (!settings.acceptingResponses) return reply.status(403).send({ error: settings.closedMessage });

  ensureUploadsDir();
  const file = await req.file();
  if (!file) return reply.status(400).send({ error: "No file uploaded" });
  if (!FORM_UPLOAD_MIME.has(file.mimetype)) {
    return reply.status(415).send({ error: "File type not allowed" });
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of file.file) {
    size += (chunk as Buffer).length;
    if (size > FORM_UPLOAD_MAX_BYTES) return reply.status(413).send({ error: "File too large (max 10MB)" });
    chunks.push(chunk as Buffer);
  }
  const buf = Buffer.concat(chunks);
  const ext = extname(file.filename) || "";
  const finalName = `${randomUUID()}${ext}`;
  await writeFile(join(UPLOADS_DIR, finalName), buf);
  return { url: `/uploads/${finalName}`, name: file.filename, size: buf.length, mime: file.mimetype };
});

app.post<{ Params: { slug: string } }>("/api/forms/submit/:slug", async (req, reply) => {
  const body = req.body as { values?: Record<string, unknown>; meta?: Record<string, unknown> };
  const [form] = await db.select().from(forms)
    .where(and(eq(forms.siteId, req.siteId), eq(forms.slug, req.params.slug), eq(forms.status, "active")))
    .limit(1);
  if (!form) return reply.status(404).send({ error: "Form not found" });

  const mapped = mapFormRow(form);
  const sections = mapped.sections;
  const settings = mapped.settings;

  if (!settings.acceptingResponses) {
    return reply.status(403).send({ error: settings.closedMessage });
  }
  if (settings.responseLimit > 0) {
    const existing = await db.select({ id: crmLeads.id }).from(crmLeads)
      .where(and(eq(crmLeads.siteId, req.siteId), eq(crmLeads.source, "form"), eq(crmLeads.formId, form.id)));
    if (existing.length >= settings.responseLimit) {
      return reply.status(403).send({ error: settings.closedMessage });
    }
  }

  const rawValues = body.values && typeof body.values === "object" ? body.values : {};
  const meta = (body.meta && typeof body.meta === "object" ? body.meta : {}) as Record<string, unknown>;
  const visitedRaw = meta.visitedSections;
  const visited = Array.isArray(visitedRaw)
    ? visitedRaw.filter((x): x is string => typeof x === "string")
    : null;

  // With branching the client reports the sections it actually showed; validate only
  // those. Otherwise fall back to condition-based visibility.
  const activeSections = visited
    ? sections.filter((s) => visited.includes(s.id))
    : sections.filter((s) => evaluateCondition(s.condition, rawValues));

  const values: Record<string, unknown> = {};
  for (const section of activeSections) {
    for (const field of section.fields) {
      if (!visited && !evaluateCondition(field.condition, rawValues)) continue;
      const value = rawValues[field.name];
      const err = validateFieldValue(field, value);
      if (err) return reply.status(400).send({ error: err });
      values[field.name] = isFieldValueEmpty(field, value)
        ? (field.type === "checkboxes" || field.type === "file" ? [] : "")
        : value;
    }
  }

  const channel = await findOrCreateSourceChannel(req.siteId, "form");
  const normalizedName = typeof values.name === "string" ? values.name : null;
  const respondentEmail = typeof meta.respondentEmail === "string" ? meta.respondentEmail : null;
  const normalizedEmail = typeof values.email === "string" && values.email
    ? values.email
    : (settings.collectEmail ? respondentEmail : null);
  const normalizedPhone = typeof values.phone === "string" ? values.phone : null;
  const normalizedCompany = typeof values.company === "string" ? values.company : null;

  const score = settings.isQuiz ? gradeSubmission(activeSections, values) : null;

  const payload: Record<string, unknown> = {
    values,
    meta,
    userAgent: req.headers["user-agent"] ?? "",
    ip: req.ip,
  };
  if (score) payload.score = score;

  const [lead] = await db.insert(crmLeads).values({
    siteId: req.siteId,
    formId: form.id,
    channelId: channel.id,
    source: "form",
    status: "new",
    name: normalizedName,
    email: normalizedEmail,
    phone: normalizedPhone,
    company: normalizedCompany,
    notes: null,
    payload: JSON.stringify(payload),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  return {
    ok: true,
    message: form.successMessage,
    lead: mapLeadRow(lead),
    score: score && settings.showScoreImmediately ? score : null,
  };
});

app.post("/api/crm/public-lead", async (req) => {
  const body = req.body as {
    channelSlug?: string;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    notes?: string;
    payload?: Record<string, unknown>;
  };
  const rawSlug = body.channelSlug?.trim().toLowerCase();
  const channelSlug = rawSlug ? (slugifyText(rawSlug) || "custom") : "custom";
  let channel = (await db.select().from(crmChannels)
    .where(and(eq(crmChannels.siteId, req.siteId), eq(crmChannels.slug, channelSlug)))
    .limit(1))[0];
  if (!channel) channel = await findOrCreateSourceChannel(req.siteId, "custom");

  const [lead] = await db.insert(crmLeads).values({
    siteId: req.siteId,
    formId: null,
    channelId: channel.id,
    source: "custom",
    status: "new",
    name: body.name?.trim() || null,
    email: body.email?.trim().toLowerCase() || null,
    phone: body.phone?.trim() || null,
    company: body.company?.trim() || null,
    notes: body.notes?.trim() || null,
    payload: JSON.stringify({
      ...(body.payload ?? {}),
      userAgent: req.headers["user-agent"] ?? "",
      ip: req.ip,
    }),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return { ok: true, lead: mapLeadRow(lead) };
});

app.get("/api/newsletter/subscribers", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req) => {
  const rows = await db.select().from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.siteId, req.siteId))
    .orderBy(desc(newsletterSubscribers.createdAt));
  return rows.map(mapSubscriberRow);
});

app.post("/api/newsletter/subscribe", async (req, reply) => {
  const body = req.body as { email: string; name?: string; source?: string; meta?: Record<string, unknown> };
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply.status(400).send({ error: "Valid email required" });
  }
  const [existing] = await db.select().from(newsletterSubscribers)
    .where(and(eq(newsletterSubscribers.siteId, req.siteId), eq(newsletterSubscribers.email, email)))
    .limit(1);
  const now = new Date();
  let subscriber: typeof newsletterSubscribers.$inferSelect;
  if (existing) {
    const [updated] = await db.update(newsletterSubscribers).set({
      name: body.name?.trim() || existing.name,
      status: "subscribed",
      source: body.source?.trim() || existing.source,
      meta: JSON.stringify(body.meta ?? parseJsonObject(existing.meta)),
      updatedAt: now,
    }).where(eq(newsletterSubscribers.id, existing.id)).returning();
    subscriber = updated;
  } else {
    const [created] = await db.insert(newsletterSubscribers).values({
      siteId: req.siteId,
      email,
      name: body.name?.trim() || null,
      status: "subscribed",
      source: body.source?.trim() || "newsletter",
      meta: JSON.stringify(body.meta ?? {}),
      createdAt: now,
      updatedAt: now,
    }).returning();
    subscriber = created;
  }
  const channel = await findOrCreateSourceChannel(req.siteId, "newsletter");
  await db.insert(crmLeads).values({
    siteId: req.siteId,
    formId: null,
    channelId: channel.id,
    source: "newsletter",
    status: "new",
    name: body.name?.trim() || null,
    email,
    phone: null,
    company: null,
    notes: null,
    payload: JSON.stringify({
      source: body.source ?? "newsletter",
      meta: body.meta ?? {},
      userAgent: req.headers["user-agent"] ?? "",
      ip: req.ip,
    }),
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true, subscriber: mapSubscriberRow(subscriber) };
});

app.put<{ Params: { id: string } }>("/api/newsletter/subscribers/:id", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const body = req.body as { name?: string | null; status?: "subscribed" | "unsubscribed" };
  const [existing] = await db.select().from(newsletterSubscribers)
    .where(and(eq(newsletterSubscribers.id, id), eq(newsletterSubscribers.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Subscriber not found" });
  const [updated] = await db.update(newsletterSubscribers).set({
    name: body.name !== undefined ? body.name : existing.name,
    status: body.status ?? existing.status,
    updatedAt: new Date(),
  }).where(eq(newsletterSubscribers.id, id)).returning();
  return mapSubscriberRow(updated);
});

app.delete<{ Params: { id: string } }>("/api/newsletter/subscribers/:id", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [existing] = await db.select().from(newsletterSubscribers)
    .where(and(eq(newsletterSubscribers.id, id), eq(newsletterSubscribers.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Subscriber not found" });
  await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id));
  return { ok: true };
});

app.get("/api/crm/channels", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req) => {
  const support = await getCrmColumnSupport();
  const rowsRaw = support.channelsType
    ? await db.execute(sql`SELECT *, channel_type AS "channelType" FROM "crm_channels" WHERE site_id = ${req.siteId} ORDER BY name ASC`)
    : await db.execute(sql`SELECT *, 'custom'::text AS "channelType" FROM "crm_channels" WHERE site_id = ${req.siteId} ORDER BY name ASC`);
  return extractRows(rowsRaw);
});

app.post("/api/crm/channels", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const body = req.body as { name: string; slug?: string; description?: string | null; isActive?: boolean; channelType?: string };
  if (!body.name?.trim()) return reply.status(400).send({ error: "name required" });
  const slug = slugifyText(body.slug ?? body.name) || "channel";
  const [created] = await db.insert(crmChannels).values({
    siteId: req.siteId,
    name: body.name.trim(),
    slug,
    description: body.description ?? null,
    isActive: body.isActive !== false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  const support = await getCrmColumnSupport();
  if (support.channelsType) {
    await db.execute(sql`UPDATE "crm_channels" SET "channel_type" = ${body.channelType ?? "custom"} WHERE "id" = ${created.id}`);
  }
  return { ...created, channelType: body.channelType ?? "custom" };
});

app.put<{ Params: { id: string } }>("/api/crm/channels/:id", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const body = req.body as { name?: string; slug?: string; description?: string | null; isActive?: boolean; channelType?: string };
  const [existing] = await db.select().from(crmChannels)
    .where(and(eq(crmChannels.id, id), eq(crmChannels.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Channel not found" });
  const [updated] = await db.update(crmChannels).set({
    name: body.name !== undefined ? body.name.trim() : existing.name,
    slug: body.slug !== undefined ? (slugifyText(body.slug) || existing.slug) : existing.slug,
    description: body.description !== undefined ? body.description ?? null : existing.description,
    isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
    updatedAt: new Date(),
  }).where(eq(crmChannels.id, id)).returning();
  const support = await getCrmColumnSupport();
  if (body.channelType !== undefined && support.channelsType) {
    await db.execute(sql`UPDATE "crm_channels" SET "channel_type" = ${body.channelType} WHERE "id" = ${id}`);
  }
  const channelType = support.channelsType
    ? (firstRow<{ channel_type: string }>(await db.execute(sql`SELECT channel_type FROM "crm_channels" WHERE "id" = ${id}`))?.channel_type ?? "custom")
    : "custom";
  return { ...updated, channelType };
});

app.delete<{ Params: { id: string } }>("/api/crm/channels/:id", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [existing] = await db.select().from(crmChannels)
    .where(and(eq(crmChannels.id, id), eq(crmChannels.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Channel not found" });
  if (["form", "newsletter", "custom"].includes(existing.slug)) {
    return reply.status(400).send({ error: "System channels cannot be deleted" });
  }
  await db.delete(crmChannels).where(eq(crmChannels.id, id));
  return { ok: true };
});

app.get("/api/crm/leads", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req) => {
  const q = req.query as { status?: string; archived?: string; search?: string; channelId?: string };
  const showArchived = q.archived === "true";
  const searchTerm = q.search?.trim().toLowerCase() ?? "";
  const channelIdFilter = q.channelId ? Number(q.channelId) : undefined;
  const support = await getCrmColumnSupport();
  if (showArchived && !support.leadsArchived) return [];

  const rawRows = await db.execute(sql`
    SELECT *,
      ${support.leadsArchived ? sql`archived` : sql`false`} AS archived,
      ${support.leadsTags ? sql`tags` : sql`'[]'::text`} AS tags,
      ${support.leadsCustomFields ? sql`custom_fields` : sql`'{}'::text`} AS custom_fields,
      ${support.leadsScore ? sql`score` : sql`0`} AS score
    FROM "crm_leads"
    WHERE site_id = ${req.siteId}
      ${support.leadsArchived ? sql`AND archived = ${showArchived}` : sql``}
      ${q.status ? sql`AND status = ${q.status}` : sql``}
      ${channelIdFilter ? sql`AND channel_id = ${channelIdFilter}` : sql``}
    ORDER BY created_at DESC
  `);
  const rows = extractRows<typeof crmLeads.$inferSelect & { archived: boolean; tags: string; custom_fields: string; score: number }>(rawRows);
  const filteredRows = searchTerm
    ? rows.filter((r) =>
      (r.name ?? "").toLowerCase().includes(searchTerm) ||
      (r.email ?? "").toLowerCase().includes(searchTerm) ||
      (r.company ?? "").toLowerCase().includes(searchTerm) ||
      (r.phone ?? "").toLowerCase().includes(searchTerm)
    )
    : rows;

  const channelRaw = support.channelsType
    ? await db.execute(sql`SELECT *, channel_type AS "channelType" FROM "crm_channels" WHERE site_id = ${req.siteId}`)
    : await db.execute(sql`SELECT *, 'custom'::text AS "channelType" FROM "crm_channels" WHERE site_id = ${req.siteId}`);
  const channelRows = extractRows<typeof crmChannels.$inferSelect & { channelType: string }>(channelRaw);
  const channelsById = new Map(channelRows.map((c) => [c.id, c]));

  return filteredRows.map((row) => ({
    ...mapLeadRow(row),
    channel: row.channelId ? (channelsById.get(row.channelId) ?? null) : null,
  }));
});

app.post("/api/crm/leads", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const body = req.body as {
    source?: "custom" | "form" | "newsletter";
    channelId?: number | null;
    status?: "new" | "contacted" | "qualified" | "lost";
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    notes?: string | null;
    payload?: Record<string, unknown>;
    tags?: string[];
    customFields?: Record<string, string>;
    score?: number;
  };
  let channelId = body.channelId ?? null;
  if (!channelId) {
    const source = body.source ?? "custom";
    const channel = await findOrCreateSourceChannel(req.siteId, source);
    channelId = channel.id;
  }
  const [created] = await db.insert(crmLeads).values({
    siteId: req.siteId,
    formId: null,
    channelId,
    source: body.source ?? "custom",
    status: body.status ?? "new",
    name: body.name ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    company: body.company ?? null,
    notes: body.notes ?? null,
    payload: JSON.stringify(body.payload ?? {}),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  const tags = JSON.stringify(body.tags ?? []);
  const customFields = JSON.stringify(body.customFields ?? {});
  const score = body.score ?? 0;
  const support = await getCrmColumnSupport();
  if (support.leadsTags || support.leadsCustomFields || support.leadsScore) {
    const updates: string[] = [];
    if (support.leadsTags) updates.push(`tags = '${tags.replace(/'/g, "''")}'`);
    if (support.leadsCustomFields) updates.push(`custom_fields = '${customFields.replace(/'/g, "''")}'`);
    if (support.leadsScore) updates.push(`score = ${Math.max(0, Math.min(100, score))}`);
    if (updates.length > 0) {
      await db.execute(sql.raw(`UPDATE "crm_leads" SET ${updates.join(", ")} WHERE id = ${created.id}`));
    }
  }
  return { ...mapLeadRow(created), tags: body.tags ?? [], customFields: body.customFields ?? {}, score, archived: false };
});

app.put<{ Params: { id: string } }>("/api/crm/leads/:id", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const body = req.body as {
    status?: "new" | "contacted" | "qualified" | "lost";
    notes?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    channelId?: number | null;
    tags?: string[];
    customFields?: Record<string, string>;
    score?: number;
  };
  const [existing] = await db.select().from(crmLeads)
    .where(and(eq(crmLeads.id, id), eq(crmLeads.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Lead not found" });
  const [updated] = await db.update(crmLeads).set({
    status: body.status ?? existing.status,
    notes: body.notes !== undefined ? body.notes : existing.notes,
    name: body.name !== undefined ? body.name : existing.name,
    email: body.email !== undefined ? body.email : existing.email,
    phone: body.phone !== undefined ? body.phone : existing.phone,
    company: body.company !== undefined ? body.company : existing.company,
    channelId: body.channelId !== undefined ? body.channelId : existing.channelId,
    updatedAt: new Date(),
  }).where(eq(crmLeads.id, id)).returning();
  const support = await getCrmColumnSupport();
  const extraUpdates: string[] = [];
  if (support.leadsTags && body.tags !== undefined) extraUpdates.push(`tags = '${JSON.stringify(body.tags).replace(/'/g, "''")}'`);
  if (support.leadsCustomFields && body.customFields !== undefined) extraUpdates.push(`custom_fields = '${JSON.stringify(body.customFields).replace(/'/g, "''")}'`);
  if (support.leadsScore && body.score !== undefined) extraUpdates.push(`score = ${Math.max(0, Math.min(100, body.score))}`);
  if (extraUpdates.length > 0) {
    await db.execute(sql.raw(`UPDATE "crm_leads" SET ${extraUpdates.join(", ")} WHERE id = ${id}`));
  }
  const fresh = support.leadsArchived || support.leadsTags || support.leadsCustomFields || support.leadsScore
    ? firstRow<{ archived: boolean; tags: string; custom_fields: string; score: number }>(await db.execute(sql`
      SELECT
        ${support.leadsArchived ? sql`archived` : sql`false`} AS archived,
        ${support.leadsTags ? sql`tags` : sql`'[]'::text`} AS tags,
        ${support.leadsCustomFields ? sql`custom_fields` : sql`'{}'::text`} AS custom_fields,
        ${support.leadsScore ? sql`score` : sql`0`} AS score
      FROM "crm_leads" WHERE id = ${id}
    `))
    : undefined;
  return {
    ...mapLeadRow(updated),
    archived: fresh?.archived ?? false,
    tags: parseJsonArraySafe<string>(fresh?.tags),
    customFields: (() => { try { return JSON.parse(fresh?.custom_fields ?? "{}") as Record<string, string>; } catch { return {}; } })(),
    score: fresh?.score ?? 0,
  };
});

app.delete<{ Params: { id: string } }>("/api/crm/leads/:id", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [existing] = await db.select().from(crmLeads)
    .where(and(eq(crmLeads.id, id), eq(crmLeads.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Lead not found" });
  await db.delete(crmLeads).where(eq(crmLeads.id, id));
  return { ok: true };
});

app.post<{ Params: { id: string } }>("/api/crm/leads/:id/archive", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [existing] = await db.select().from(crmLeads).where(and(eq(crmLeads.id, id), eq(crmLeads.siteId, req.siteId))).limit(1);
  if (!existing) return reply.status(404).send({ error: "Lead not found" });
  const support = await getCrmColumnSupport();
  if (support.leadsArchived) {
    await db.execute(sql`UPDATE "crm_leads" SET archived = true, updated_at = now() WHERE id = ${id}`);
  }
  return { ok: true };
});

app.post<{ Params: { id: string } }>("/api/crm/leads/:id/unarchive", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [existing] = await db.select().from(crmLeads).where(and(eq(crmLeads.id, id), eq(crmLeads.siteId, req.siteId))).limit(1);
  if (!existing) return reply.status(404).send({ error: "Lead not found" });
  const support = await getCrmColumnSupport();
  if (support.leadsArchived) {
    await db.execute(sql`UPDATE "crm_leads" SET archived = false, updated_at = now() WHERE id = ${id}`);
  }
  return { ok: true };
});

app.get<{ Params: { id: string } }>("/api/crm/leads/:id/activities", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [lead] = await db.select().from(crmLeads).where(and(eq(crmLeads.id, id), eq(crmLeads.siteId, req.siteId))).limit(1);
  if (!lead) return reply.status(404).send({ error: "Lead not found" });
  const raw = await db.execute(sql`
    SELECT a.*, u.email AS created_by_email
    FROM "crm_lead_activities" a
    LEFT JOIN "users" u ON u.id = a.created_by
    WHERE a.lead_id = ${id} AND a.site_id = ${req.siteId}
    ORDER BY a.created_at DESC
  `);
  return extractRows(raw);
});

app.post<{ Params: { id: string } }>("/api/crm/leads/:id/activities", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const body = req.body as { type?: string; content?: string };
  const [lead] = await db.select().from(crmLeads).where(and(eq(crmLeads.id, id), eq(crmLeads.siteId, req.siteId))).limit(1);
  if (!lead) return reply.status(404).send({ error: "Lead not found" });
  const me = req.user as import("./auth.js").JwtPayload;
  const raw = await db.execute(sql`
    INSERT INTO "crm_lead_activities" (lead_id, site_id, type, content, created_by, created_at)
    VALUES (${id}, ${req.siteId}, ${body.type ?? "note"}, ${body.content ?? null}, ${me.sub}, now())
    RETURNING *
  `);
  return firstRow(raw) ?? null;
});

app.get("/api/crm/analytics", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req) => {
  const support = await getCrmColumnSupport();
  const activeCond = support.leadsArchived ? sql`NOT archived` : sql`true`;
  const archivedCond = support.leadsArchived ? sql`archived` : sql`false`;
  const activeLeadCond = support.leadsArchived ? sql`NOT l.archived` : sql`true`;
  const qualifiedLeadCond = support.leadsArchived ? sql`NOT l.archived AND l.status = 'qualified'` : sql`l.status = 'qualified'`;
  const [totals] = extractRows<Record<string, string>>(await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE ${activeCond}) AS active_leads,
      COUNT(*) FILTER (WHERE ${archivedCond}) AS archived_leads,
      COUNT(*) FILTER (WHERE ${activeCond} AND status = 'new') AS new_leads,
      COUNT(*) FILTER (WHERE ${activeCond} AND status = 'contacted') AS contacted_leads,
      COUNT(*) FILTER (WHERE ${activeCond} AND status = 'qualified') AS qualified_leads,
      COUNT(*) FILTER (WHERE ${activeCond} AND status = 'lost') AS lost_leads,
      ROUND(AVG(${support.leadsScore ? sql`score` : sql`0`}) FILTER (WHERE ${activeCond}), 1) AS avg_score,
      COUNT(*) FILTER (WHERE ${activeCond} AND created_at >= now() - interval '30 days') AS leads_last_30d,
      COUNT(*) FILTER (WHERE ${activeCond} AND created_at >= now() - interval '7 days') AS leads_last_7d
    FROM "crm_leads" WHERE site_id = ${req.siteId}
  `));

  const byChannel = extractRows(await db.execute(sql`
    SELECT c.name AS channel_name, ${support.channelsType ? sql`c.channel_type` : sql`'custom'::text`} AS channel_type, c.slug,
      COUNT(l.id) FILTER (WHERE ${activeLeadCond}) AS leads,
      COUNT(l.id) FILTER (WHERE ${qualifiedLeadCond}) AS qualified
    FROM "crm_channels" c
    LEFT JOIN "crm_leads" l ON l.channel_id = c.id AND l.site_id = ${req.siteId}
    WHERE c.site_id = ${req.siteId}
    GROUP BY c.id, c.name, c.slug${support.channelsType ? sql`, c.channel_type` : sql``}
    ORDER BY leads DESC
  `));

  const trend30d = extractRows(await db.execute(sql`
    SELECT date_trunc('day', created_at) AS day, COUNT(*) AS leads
    FROM "crm_leads"
    WHERE site_id = ${req.siteId} AND ${activeCond} AND created_at >= now() - interval '30 days'
    GROUP BY day ORDER BY day ASC
  `));

  return {
    totals: {
      activeLeads: Number(totals?.active_leads ?? 0),
      archivedLeads: Number(totals?.archived_leads ?? 0),
      newLeads: Number(totals?.new_leads ?? 0),
      contactedLeads: Number(totals?.contacted_leads ?? 0),
      qualifiedLeads: Number(totals?.qualified_leads ?? 0),
      lostLeads: Number(totals?.lost_leads ?? 0),
      avgScore: Number(totals?.avg_score ?? 0),
      leadsLast30d: Number(totals?.leads_last_30d ?? 0),
      leadsLast7d: Number(totals?.leads_last_7d ?? 0),
    },
    byChannel,
    trend30d,
  };
});

app.get("/api/crm/ai-context", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req) => {
  const support = await getCrmColumnSupport();
  const activeCond = support.leadsArchived ? sql`NOT archived` : sql`true`;
  const archivedCond = support.leadsArchived ? sql`archived` : sql`false`;
  const activeLeadCond = support.leadsArchived ? sql`NOT l.archived` : sql`true`;
  const qualifiedLeadCond = support.leadsArchived ? sql`NOT l.archived AND l.status = 'qualified'` : sql`l.status = 'qualified'`;
  const lostLeadCond = support.leadsArchived ? sql`NOT l.archived AND l.status = 'lost'` : sql`l.status = 'lost'`;
  const [totals] = extractRows<Record<string, string>>(await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE ${activeCond}) AS active_leads,
      COUNT(*) FILTER (WHERE ${archivedCond}) AS archived_leads,
      COUNT(*) FILTER (WHERE ${activeCond} AND status = 'new') AS new_leads,
      COUNT(*) FILTER (WHERE ${activeCond} AND status = 'contacted') AS contacted_leads,
      COUNT(*) FILTER (WHERE ${activeCond} AND status = 'qualified') AS qualified_leads,
      COUNT(*) FILTER (WHERE ${activeCond} AND status = 'lost') AS lost_leads,
      ROUND(AVG(${support.leadsScore ? sql`score` : sql`0`}) FILTER (WHERE ${activeCond}), 1) AS avg_score
    FROM "crm_leads" WHERE site_id = ${req.siteId}
  `));

  const byChannel = extractRows(await db.execute(sql`
    SELECT c.name AS channel_name, ${support.channelsType ? sql`c.channel_type` : sql`'custom'::text`} AS channel_type, c.slug,
      COUNT(l.id) FILTER (WHERE ${activeLeadCond}) AS leads,
      COUNT(l.id) FILTER (WHERE ${qualifiedLeadCond}) AS qualified,
      COUNT(l.id) FILTER (WHERE ${lostLeadCond}) AS lost,
      ROUND(AVG(${support.leadsScore ? sql`l.score` : sql`0`}) FILTER (WHERE ${activeLeadCond}), 1) AS avg_score
    FROM "crm_channels" c
    LEFT JOIN "crm_leads" l ON l.channel_id = c.id AND l.site_id = ${req.siteId}
    WHERE c.site_id = ${req.siteId}
    GROUP BY c.id, c.name, c.slug${support.channelsType ? sql`, c.channel_type` : sql``}
    ORDER BY leads DESC
  `));

  const recentLeads = extractRows(await db.execute(sql`
    SELECT l.id, l.name, l.email, l.company, l.status, l.source, ${support.leadsScore ? sql`l.score` : sql`0`} AS score,
      c.name AS channel_name, ${support.channelsType ? sql`c.channel_type` : sql`'custom'::text`} AS channel_type,
      l.created_at, l.updated_at
    FROM "crm_leads" l
    LEFT JOIN "crm_channels" c ON c.id = l.channel_id
    WHERE l.site_id = ${req.siteId} AND ${activeLeadCond}
    ORDER BY l.created_at DESC LIMIT 20
  `));

  const topLeadsByScore = extractRows(await db.execute(sql`
    SELECT l.id, l.name, l.email, l.company, l.status, ${support.leadsScore ? sql`l.score` : sql`0`} AS score,
      c.name AS channel_name
    FROM "crm_leads" l
    LEFT JOIN "crm_channels" c ON c.id = l.channel_id
    WHERE l.site_id = ${req.siteId} AND ${activeLeadCond}
    ORDER BY ${support.leadsScore ? sql`l.score` : sql`l.created_at`} DESC LIMIT 10
  `));

  const conversionRate = Number(totals?.qualified_leads ?? 0) / Math.max(1, Number(totals?.active_leads ?? 1));

  return {
    _meta: {
      description: "OpenWeb CRM context for AI analysis. Contains pipeline summary, channel performance, and lead data.",
      generatedAt: new Date().toISOString(),
      siteId: req.siteId,
    },
    pipeline: {
      totalActive: Number(totals?.active_leads ?? 0),
      totalArchived: Number(totals?.archived_leads ?? 0),
      byStatus: {
        new: Number(totals?.new_leads ?? 0),
        contacted: Number(totals?.contacted_leads ?? 0),
        qualified: Number(totals?.qualified_leads ?? 0),
        lost: Number(totals?.lost_leads ?? 0),
      },
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgLeadScore: Number(totals?.avg_score ?? 0),
    },
    channels: byChannel,
    recentLeads,
    topLeadsByScore,
    insights: {
      highestPerformingChannel: (byChannel as { channel_name: string; leads: string }[])[0]?.channel_name ?? null,
      qualificationRate: Math.round(conversionRate * 100),
      recommendations: [
        Number(totals?.new_leads ?? 0) > 10 ? "You have many new leads — consider running a contact campaign." : null,
        Number(totals?.contacted_leads ?? 0) > Number(totals?.qualified_leads ?? 0) * 3 ? "Contacted leads aren't converting — review your qualification criteria." : null,
        Number(totals?.lost_leads ?? 0) > Number(totals?.active_leads ?? 0) * 0.4 ? "High lead loss rate — audit your follow-up timing and messaging." : null,
      ].filter(Boolean),
    },
  };
});

// ── Plugins CRUD (admin only) ──────────────────────────────────────────────────

type PluginManifest = {
  name: string;
  description: string;
  author?: string;
  authors?: string[];
  version: string;
  website: string;
  main?: string;
  client?: string;
};

type PluginCronContext = {
  siteId: number | null;
  now: Date;
};

type PluginCronJob = {
  pluginSlug: string;
  name: string;
  expression: string;
  allSites: boolean;
  handler: (ctx: PluginCronContext) => unknown | Promise<unknown>;
  lastTickKey: string | null;
};

const PLUGINS_DIR = join(UPLOADS_DIR, "plugins");
const pluginCronJobs: PluginCronJob[] = [];
let pluginCronTimer: NodeJS.Timeout | null = null;
const pluginSql = postgres(getDatabaseUrl(), { max: 5, idle_timeout: 20, prepare: false });

function ensurePluginsDir() {
  if (!existsSync(PLUGINS_DIR)) mkdirSync(PLUGINS_DIR, { recursive: true });
}
ensurePluginsDir();

function safeSqlIdentifier(input: string, label: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(input)) throw new Error(`Invalid ${label}: ${input}`);
  return input.toLowerCase();
}

function pluginTableName(pluginSlug: string, localTable: string) {
  const safeSlug = pluginSlug.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const safeLocalTable = safeSqlIdentifier(localTable, "table name");
  return safeSqlIdentifier(`plugin_${safeSlug}_${safeLocalTable}`, "table name");
}

function parseCronField(field: string, min: number, max: number, value: number) {
  const token = field.trim();
  if (token === "*") return true;
  if (/^\*\/\d+$/.test(token)) {
    const step = Number(token.split("/")[1]);
    if (!Number.isInteger(step) || step <= 0) return false;
    return (value - min) % step === 0;
  }
  const values = token.split(",").map((t) => Number(t.trim()));
  if (values.some((n) => !Number.isInteger(n) || n < min || n > max)) return false;
  return values.includes(value);
}

function validateCronField(field: string, min: number, max: number) {
  const token = field.trim();
  if (token === "*") return true;
  if (/^\*\/\d+$/.test(token)) {
    const step = Number(token.split("/")[1]);
    return Number.isInteger(step) && step > 0;
  }
  const values = token.split(",").map((t) => Number(t.trim()));
  return values.length > 0 && values.every((n) => Number.isInteger(n) && n >= min && n <= max);
}

function cronExpressionIsValid(expression: string) {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [m, h, d, mo, w] = parts;
  return validateCronField(m, 0, 59)
    && validateCronField(h, 0, 23)
    && validateCronField(d, 1, 31)
    && validateCronField(mo, 1, 12)
    && validateCronField(w, 0, 6);
}

function cronMatches(expression: string, now: Date) {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [m, h, d, mo, w] = parts;
  return parseCronField(m, 0, 59, now.getMinutes())
    && parseCronField(h, 0, 23, now.getHours())
    && parseCronField(d, 1, 31, now.getDate())
    && parseCronField(mo, 1, 12, now.getMonth() + 1)
    && parseCronField(w, 0, 6, now.getDay());
}

function cronTickKey(now: Date) {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
}

async function readPluginManifest(pluginSlug: string): Promise<PluginManifest | null> {
  const manifestPath = join(PLUGINS_DIR, pluginSlug, "plugin.json");
  if (!existsSync(manifestPath)) return null;
  try {
    const raw = await readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as PluginManifest;
    const hasAuthors = Array.isArray(parsed.authors) ? parsed.authors.length > 0 : !!parsed.author;
    if (!parsed.name?.trim() || !parsed.description?.trim() || !parsed.version?.trim() || !parsed.website?.trim() || !hasAuthors) {
      return null;
    }
    return {
      ...parsed,
      main: parsed.main?.trim() || "index.js",
      client: parsed.client?.trim() || "",
    };
  } catch {
    return null;
  }
}

function pluginDir(slug: string) {
  return join(PLUGINS_DIR, slug);
}

async function uninstallPluginNodeModules(slug: string) {
  await rm(join(pluginDir(slug), "node_modules"), { recursive: true, force: true });
}

async function installPluginDependencies(slug: string) {
  const dir = pluginDir(slug);
  if (!existsSync(join(dir, "package.json"))) return;
  await runCommand("npm", ["install", "--omit=dev", "--no-audit", "--no-fund"], dir);
}

async function mapPluginRow(row: typeof plugins.$inferSelect) {
  const manifest = await readPluginManifest(row.slug);
  return {
    ...row,
    name: manifest?.name ?? row.name,
    description: manifest?.description ?? row.description,
    author: manifest?.author ?? null,
    authors: manifest?.authors ?? null,
    version: manifest?.version ?? null,
    website: manifest?.website ?? null,
    hasServer: !!manifest?.main,
    hasClient: !!manifest?.client,
  };
}

function resolvePluginExtractRoot(baseDir: string) {
  const directManifest = join(baseDir, "plugin.json");
  if (existsSync(directManifest)) return baseDir;
  return readdir(baseDir).then((entries) => {
    if (entries.length !== 1) return baseDir;
    const candidate = join(baseDir, entries[0]);
    if (!existsSync(join(candidate, "plugin.json"))) return baseDir;
    return candidate;
  });
}

// Public endpoint — returns only enabled plugins that have a client script (no auth required)
app.get("/api/plugins/client-active", async (req) => {
  const rows = await db.select({ slug: plugins.slug, clientCode: plugins.clientCode, enabled: plugins.enabled })
    .from(plugins)
    .where(eq(plugins.siteId, req.siteId));
  return rows
    .filter((r) => r.enabled && r.clientCode && r.clientCode.trim().length > 0)
    .map((r) => ({ slug: r.slug, hasClient: true }));
});

app.get("/api/plugins", { preHandler: requireAuth(["admin"]) }, async (req) => {
  const rows = await db.select().from(plugins).where(eq(plugins.siteId, req.siteId)).orderBy(asc(plugins.name));
  return Promise.all(rows.map(mapPluginRow));
});

app.post("/api/plugins", { preHandler: requireAuth(["admin"]) }, async (_req, reply) => {
  return reply.status(400).send({ error: "Plugin creation now requires ZIP upload via /api/plugins/upload" });
});

app.post("/api/plugins/upload", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req, reply) => {
  ensurePluginsDir();
  const file = await req.file();
  if (!file) return reply.status(400).send({ error: "ZIP file is required" });
  if (!file.filename.toLowerCase().endsWith(".zip")) return reply.status(400).send({ error: "Only .zip files are supported" });

  const tmpRoot = await mkdtemp(join(tmpdir(), "openweb-plugin-upload-"));
  const zipPath = join(tmpRoot, "plugin.zip");
  const extractDir = join(tmpRoot, "extract");

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) chunks.push(chunk as Buffer);
    await writeFile(zipPath, Buffer.concat(chunks));
    mkdirSync(extractDir, { recursive: true });
    await runCommand("unzip", ["-o", zipPath, "-d", extractDir]);
    const root = await resolvePluginExtractRoot(extractDir);

    const manifestRaw = await readFile(join(root, "plugin.json"), "utf8").catch(() => "");
    if (!manifestRaw) return reply.status(400).send({ error: "plugin.json is required in ZIP root" });
    const manifest = JSON.parse(manifestRaw) as PluginManifest;
    const hasAuthors = Array.isArray(manifest.authors) ? manifest.authors.length > 0 : !!manifest.author;
    if (!manifest.name?.trim() || !manifest.description?.trim() || !manifest.version?.trim() || !manifest.website?.trim() || !hasAuthors) {
      return reply.status(400).send({ error: "plugin.json must include name, description, author/authors, version, and website" });
    }
    const slug = slugifyText(manifest.name) || "plugin";
    const target = pluginDir(slug);
    await rm(target, { recursive: true, force: true });
    await cp(root, target, { recursive: true, force: true });
    await rm(join(target, "node_modules"), { recursive: true, force: true });

    const [existing] = await db.select().from(plugins).where(and(eq(plugins.slug, slug), eq(plugins.siteId, req.siteId))).limit(1);
    let saved: typeof plugins.$inferSelect;
    if (existing) {
      const [updated] = await db.update(plugins).set({
        name: manifest.name.trim(),
        description: manifest.description.trim(),
      }).where(eq(plugins.id, existing.id)).returning();
      saved = updated;
      if (existing.enabled) await installPluginDependencies(slug);
    } else {
      const [created] = await db.insert(plugins).values({
        siteId: req.siteId,
        name: manifest.name.trim(),
        slug,
        description: manifest.description.trim(),
        serverCode: null,
        clientCode: null,
        enabled: false,
      }).returning();
      saved = created;
    }
    return mapPluginRow(saved);
  } catch (error) {
    app.log.error({ error }, "Plugin ZIP upload failed");
    return reply.status(500).send({ error: (error as Error).message || "Plugin upload failed" });
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

app.put<{ Params: { id: string } }>("/api/plugins/:id", { preHandler: requireAuth(["admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const body = req.body as { enabled?: boolean };
  const [existing] = await db.select().from(plugins)
    .where(and(eq(plugins.id, id), eq(plugins.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Plugin not found" });
  if (body.enabled === undefined) return reply.status(400).send({ error: "Only enabled can be updated. Upload ZIP to change plugin code." });

  if (body.enabled) await installPluginDependencies(existing.slug);
  else await uninstallPluginNodeModules(existing.slug);

  const [updated] = await db.update(plugins).set({ enabled: body.enabled }).where(eq(plugins.id, id)).returning();
  return mapPluginRow(updated);
});

app.delete<{ Params: { id: string } }>("/api/plugins/:id", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [existing] = await db.select().from(plugins)
    .where(and(eq(plugins.id, id), eq(plugins.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Plugin not found" });
  await uninstallPluginNodeModules(existing.slug);
  await rm(pluginDir(existing.slug), { recursive: true, force: true });
  await db.delete(plugins).where(eq(plugins.id, id));
  return { ok: true };
});

app.post<{ Params: { id: string } }>("/api/plugins/:id/reload", { preHandler: requireAuth(["admin"], { globalOnly: true }) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  reply.send({ ok: true, message: "Restarting server to reload plugins..." });
  setImmediate(() => process.exit(0));
});

app.get<{ Params: { slug: string } }>("/api/plugins/:slug/client.js", async (req, reply) => {
  const [plugin] = await db.select().from(plugins)
    .where(and(eq(plugins.slug, req.params.slug), eq(plugins.siteId, req.siteId), eq(plugins.enabled, true)))
    .limit(1);
  if (!plugin) return reply.status(404).send("/* plugin not found or disabled */");
  const manifest = await readPluginManifest(plugin.slug);
  if (!manifest?.client) return reply.status(404).send("/* plugin has no client entry */");
  const clientPath = join(pluginDir(plugin.slug), manifest.client);
  if (!existsSync(clientPath)) return reply.status(404).send("/* client entry missing */");
  const code = await readFile(clientPath, "utf8");
  return reply.type("application/javascript").send(code);
});

// ── Plugin VM/module loader ────────────────────────────────────────────────────

function startPluginCronRunner() {
  if (pluginCronTimer) return;
  pluginCronTimer = setInterval(async () => {
    if (pluginCronJobs.length === 0) return;
    const now = new Date();
    const tickKey = cronTickKey(now);
    for (const job of pluginCronJobs) {
      if (job.lastTickKey === tickKey) continue;
      if (!cronMatches(job.expression, now)) continue;
      job.lastTickKey = tickKey;
      try {
        if (job.allSites) {
          const allSitesRows = await db.select({ id: sites.id }).from(sites);
          for (const siteRow of allSitesRows) await job.handler({ siteId: siteRow.id, now });
        } else {
          await job.handler({ siteId: null, now });
        }
      } catch (error) {
        app.log.error({ error, plugin: job.pluginSlug, job: job.name }, "Plugin cron job failed");
      }
    }
  }, 10_000);
}

function createPluginRuntimeApi(plugin: typeof plugins.$inferSelect) {
  const pluginLog = {
    info: (msg: string) => app.log.info(`[plugin:${plugin.slug}] ${msg}`),
    error: (msg: string) => app.log.error(`[plugin:${plugin.slug}] ${msg}`),
  };
  const pluginPagesApi = {
    list: (siteId: number) => db.select().from(pages).where(eq(pages.siteId, siteId)).orderBy(desc(pages.updatedAt)),
    getById: async (siteId: number, id: number) => {
      const [row] = await db.select().from(pages).where(and(eq(pages.siteId, siteId), eq(pages.id, id))).limit(1);
      return row ?? null;
    },
    getBySlug: async (siteId: number, slug: string) => {
      const [row] = await db.select().from(pages).where(and(eq(pages.siteId, siteId), eq(pages.slug, slug))).limit(1);
      return row ?? null;
    },
    create: async (siteId: number, body: { title: string; slug: string; content?: string | null }) => {
      const cleanedSlug = body.slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const [created] = await db.insert(pages).values({
        siteId,
        title: body.title.trim(),
        slug: cleanedSlug,
        content: body.content ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return created;
    },
  };
  const pluginDbApi = {
    query: async (queryText: string, params: unknown[] = []) => {
      if (!queryText?.trim()) throw new Error("query text is required");
      return pluginSql.unsafe(queryText, params as never[]);
    },
    createTable: async (localTable: string, columns: Record<string, string>, opts?: { includeSiteId?: boolean }) => {
      const table = pluginTableName(plugin.slug, localTable);
      const includeSiteId = opts?.includeSiteId !== false;
      const defs: string[] = [];
      if (includeSiteId && !Object.keys(columns).some((c) => c.toLowerCase() === "site_id")) {
        defs.push("site_id integer not null references sites(id) on delete cascade");
      }
      for (const [name, definition] of Object.entries(columns)) {
        const col = safeSqlIdentifier(name, "column name");
        if (!definition?.trim()) throw new Error(`Column definition required for ${col}`);
        defs.push(`${col} ${definition}`);
      }
      await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS "${table}" (${defs.join(", ")})`));
      return { ok: true, table };
    },
    dropTable: async (localTable: string) => {
      const table = pluginTableName(plugin.slug, localTable);
      await db.execute(sql.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`));
      return { ok: true, table };
    },
    tableName: (localTable: string) => pluginTableName(plugin.slug, localTable),
    pages: pluginPagesApi,
  };
  const pluginSitesApi = {
    list: () => db.select().from(sites).orderBy(asc(sites.id)),
    getById: async (id: number) => {
      const [site] = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
      return site ?? null;
    },
  };
  const pluginCronApi = {
    schedule: (
      name: string,
      expression: string,
      handler: (ctx: PluginCronContext) => unknown | Promise<unknown>,
      options?: { allSites?: boolean; runOnStart?: boolean },
    ) => {
      if (!name?.trim()) throw new Error("Cron name is required");
      if (!cronExpressionIsValid(expression)) throw new Error(`Invalid cron expression: ${expression}`);
      const existingIdx = pluginCronJobs.findIndex((j) => j.pluginSlug === plugin.slug && j.name === name);
      if (existingIdx >= 0) pluginCronJobs.splice(existingIdx, 1);
      const job: PluginCronJob = { pluginSlug: plugin.slug, name: name.trim(), expression: expression.trim(), allSites: options?.allSites === true, handler, lastTickKey: null };
      pluginCronJobs.push(job);
      startPluginCronRunner();
      if (options?.runOnStart) {
        setImmediate(async () => {
          if (job.allSites) {
            const allSitesRows = await db.select({ id: sites.id }).from(sites);
            for (const siteRow of allSitesRows) await handler({ siteId: siteRow.id, now: new Date() });
          } else {
            await handler({ siteId: null, now: new Date() });
          }
        });
      }
      return { ok: true };
    },
  };
  const registerRoute = (
    method: string,
    path: string,
    handler: (req: unknown, reply: unknown, ctx: { siteId: number; pluginSlug: string }) => unknown | Promise<unknown>,
    options?: { allSites?: boolean; auth?: JwtPayload["role"][]; globalOnly?: boolean },
  ) => {
    const upperMethod = method.toUpperCase() as "GET" | "POST" | "PUT" | "DELETE";
    app.route({
      method: upperMethod,
      url: path,
      preHandler: async (req, reply) => {
        if (options?.auth?.length || options?.globalOnly) {
          await requireAuth(options?.auth ?? [], { globalOnly: options?.globalOnly })(req, reply);
          if (reply.sent) return;
        }
        if (!options?.allSites && req.siteId !== plugin.siteId) return reply.status(404).send({ error: "Not found" });
      },
      handler: async (req, reply) => handler(req, reply, { siteId: req.siteId, pluginSlug: plugin.slug }),
    });
  };
  return {
    registerRoute,
    db: pluginDbApi,
    pages: pluginPagesApi,
    sites: pluginSitesApi,
    cron: pluginCronApi,
    plugin: { id: plugin.id, slug: plugin.slug, name: plugin.name, siteId: plugin.siteId },
    log: pluginLog,
  };
}

async function loadPlugins() {
  ensurePluginsDir();
  const enabled = await db.select().from(plugins).where(eq(plugins.enabled, true));
  for (const plugin of enabled) {
    const manifest = await readPluginManifest(plugin.slug);
    if (!manifest?.main) continue;
    const runtimeApi = createPluginRuntimeApi(plugin);
    const entryPath = join(pluginDir(plugin.slug), manifest.main);
    if (!existsSync(entryPath)) {
      app.log.error(`[plugin:${plugin.slug}] main entry not found: ${manifest.main}`);
      continue;
    }
    try {
      await installPluginDependencies(plugin.slug);
      let mod: unknown;
      try {
        mod = await import(`${pathToFileURL(entryPath).href}?v=${Date.now()}`);
      } catch {
        const req = createRequire(join(pluginDir(plugin.slug), "package.json"));
        mod = req(entryPath);
      }
      const exported = mod as { default?: unknown; register?: unknown };
      const register = (typeof exported.default === "function" ? exported.default : exported.register) as ((api: ReturnType<typeof createPluginRuntimeApi>) => unknown) | undefined;
      if (!register) {
        app.log.error(`[plugin:${plugin.slug}] plugin main must export default or register(api) function`);
        continue;
      }
      await register(runtimeApi);
      app.log.info(`[plugin:${plugin.slug}] loaded`);
    } catch (e) {
      app.log.error(`Plugin ${plugin.slug} failed: ${e}`);
    }
  }
}

await loadPlugins();
startSslAutoRenewScheduler();

const port = Number(process.env.PORT) || 3000;
await app.listen({ port, host: "0.0.0.0" });
