import "dotenv/config";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { db } from "./db/index.js";
import { asc, desc, eq, ne, and, isNull, sql } from "drizzle-orm";
import {
  pages, themePacks, siteSettings, storageConfig, mediaItems, sites, users, plugins,
  blogPosts, blogCategories, blogTags, blogPostAuthors, blogPostCategories, blogPostTags,
  forms, newsletterSubscribers, crmChannels, crmLeads,
} from "./db/schema.js";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { existsSync, mkdirSync } from "node:fs";
import { createReadStream } from "node:fs";
import { writeFile, unlink, readdir, stat, rm, mkdtemp, cp, readFile } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import postgres from "postgres";
import sharp from "sharp";
import { hashPassword, verifyPassword, requireAuth, type JwtPayload } from "./auth.js";

declare module "fastify" {
  interface FastifyRequest {
    siteId: number;
  }
}

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? "CHANGE_ME",
  sign: { expiresIn: "24h" },
});

// Runtime compatibility patch: ensure latest pages column exists even if migration was missed.
await db.execute(sql.raw(`
  ALTER TABLE "pages"
  ADD COLUMN IF NOT EXISTS "disable_elevated_nav_spacing" boolean DEFAULT false NOT NULL
`));

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

// ── Site detection hook ────────────────────────────────────────────────────────

app.addHook("onRequest", async (req) => {
  const headerSite = req.headers["x-site-id"];
  const siteHeaderRaw = Array.isArray(headerSite) ? headerSite[0] : headerSite;
  const siteFromHeader = Number(siteHeaderRaw);
  if (siteHeaderRaw && Number.isInteger(siteFromHeader) && siteFromHeader > 0) {
    const [siteFromId] = await db.select().from(sites).where(eq(sites.id, siteFromHeader)).limit(1);
    if (siteFromId) {
      req.siteId = siteFromHeader;
      return;
    }
  }
  const allSites = await db.select().from(sites);
  const host = req.hostname.toLowerCase();
  const byDomain = allSites.find((s) => s.domain?.toLowerCase() === host);
  if (byDomain) { req.siteId = byDomain.id; return; }
  const sub = host.split(".")[0];
  const bySub = allSites.find((s) => s.subDomain?.toLowerCase() === sub);
  if (bySub) { req.siteId = bySub.id; return; }
  req.siteId = allSites.find((s) => s.isDefault)?.id ?? 1;
});

app.get("/health", async () => ({ ok: true }));

// ── Auth routes ────────────────────────────────────────────────────────────────

app.get("/api/setup/needed", async () => {
  const [user] = await db.select().from(users).limit(1);
  return { needed: !user };
});

app.post("/api/setup", async (req, reply) => {
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

app.post("/api/auth/login", async (req, reply) => {
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
  return db.select().from(pages)
    .where(eq(pages.siteId, req.siteId))
    .orderBy(desc(pages.updatedAt));
});

app.get<{ Params: { slug: string } }>("/api/pages/by-slug/:slug", async (req, reply) => {
  const slug = req.params.slug;
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

app.post("/api/pages", { preHandler: requireAuth(["admin", "page_developer"]) }, async (req, reply) => {
  const body = req.body as { title: string; slug: string; content?: string };
  if (!body.title?.trim() || !body.slug?.trim()) {
    return reply.status(400).send({ error: "title and slug required" });
  }
  const slug = body.slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!slug) return reply.status(400).send({ error: "Invalid slug" });
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
    disableElevatedNavSpacing?: boolean;
    seoTitle?: string | null; seoDescription?: string | null;
    seoKeywords?: string | null; ogImage?: string | null;
    noIndex?: boolean; canonicalUrl?: string | null;
  };
  const [existing] = await db.select().from(pages)
    .where(and(eq(pages.id, id), eq(pages.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Page not found" });
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.content !== undefined) updates.content = body.content ?? null;
  if (body.ignoreGlobalLayout !== undefined) updates.ignoreGlobalLayout = body.ignoreGlobalLayout;
  if (body.disableElevatedNavSpacing !== undefined) updates.disableElevatedNavSpacing = body.disableElevatedNavSpacing;
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
    return {
      navType: def.navType,
      navConfig: JSON.parse(def.navConfig),
      footerConfig: JSON.parse(def.footerConfig),
      seoConfig: {},
      blogApprovalMode: def.blogApprovalMode,
    };
  }
  return {
    navType: row.navType ?? "navbar",
    navConfig: (() => { try { return JSON.parse(row.navConfig ?? "{}"); } catch { return JSON.parse(def.navConfig); } })(),
    footerConfig: (() => { try { return JSON.parse(row.footerConfig ?? "{}"); } catch { return JSON.parse(def.footerConfig); } })(),
    seoConfig: (() => { try { return JSON.parse(row.seoConfig ?? "{}"); } catch { return {}; } })(),
    blogApprovalMode: row.blogApprovalMode ?? false,
  };
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
    const [created] = await db.insert(siteSettings).values({
      siteId: req.siteId,
      navType: body.navType ?? "navbar",
      navConfig: navConfigStr ?? def.navConfig,
      footerConfig: footerConfigStr ?? def.footerConfig,
      seoConfig: seoConfigStr ?? def.seoConfig,
      blogApprovalMode: body.blogApprovalMode ?? def.blogApprovalMode,
      updatedAt: now,
    }).returning();
    return {
      navType: created.navType,
      navConfig: JSON.parse(created.navConfig ?? "{}"),
      footerConfig: JSON.parse(created.footerConfig ?? "{}"),
      seoConfig: JSON.parse(created.seoConfig ?? "{}"),
      blogApprovalMode: created.blogApprovalMode ?? false,
    };
  }
  const [updated] = await db.update(siteSettings).set({
    navType: body.navType ?? row.navType,
    navConfig: navConfigStr !== undefined ? navConfigStr : row.navConfig,
    footerConfig: footerConfigStr !== undefined ? footerConfigStr : row.footerConfig,
    seoConfig: seoConfigStr !== undefined ? seoConfigStr : row.seoConfig,
    blogApprovalMode: body.blogApprovalMode ?? row.blogApprovalMode,
    updatedAt: now,
  }).where(eq(siteSettings.id, row.id)).returning();
  return {
    navType: updated.navType,
    navConfig: JSON.parse(updated.navConfig ?? "{}"),
    footerConfig: JSON.parse(updated.footerConfig ?? "{}"),
    seoConfig: JSON.parse(updated.seoConfig ?? "{}"),
    blogApprovalMode: updated.blogApprovalMode ?? false,
  };
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
  if (seoConfig.robotsTxt) return reply.type("text/plain").send(seoConfig.robotsTxt as string);
  const siteUrl = (seoConfig.siteUrl as string | undefined)?.replace(/\/$/, "") ?? `${req.protocol}://${req.hostname}`;
  const enableSitemap = seoConfig.enableSitemap !== false;
  const lines = ["User-agent: *", "Allow: /", "Disallow: /admin"];
  if (enableSitemap) lines.push(`\nSitemap: ${siteUrl}/sitemap.xml`);
  return reply.type("text/plain").send(lines.join("\n"));
});

// ── Theme packs CRUD ──────────────────────────────────────────────────────────

app.get("/api/theme-packs", async (req) => {
  return db.select().from(themePacks)
    .where(eq(themePacks.siteId, req.siteId))
    .orderBy(asc(themePacks.name));
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
  } catch {}
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
function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
}
function ensureBackupsDir() {
  if (!existsSync(BACKUPS_DIR)) mkdirSync(BACKUPS_DIR, { recursive: true });
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

async function runCommand(cmd: string, args: string[], cwd?: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `${cmd} exited with code ${code}`));
    });
  });
}

app.get("/api/media", async (req) => {
  return db.select().from(mediaItems)
    .where(eq(mediaItems.siteId, req.siteId))
    .orderBy(desc(mediaItems.createdAt));
});

app.delete<{ Params: { id: string } }>("/api/media/:id", { preHandler: requireAuth(["admin", "page_developer"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const [row] = await db.select().from(mediaItems)
    .where(and(eq(mediaItems.id, id), eq(mediaItems.siteId, req.siteId)))
    .limit(1);
  if (!row) return reply.status(404).send({ error: "Media not found" });
  if (row.providerPath) await unlink(row.providerPath).catch(() => {});
  await db.delete(mediaItems).where(eq(mediaItems.id, id));
  return { ok: true };
});

await app.register(fastifyMultipart, { limits: { fileSize: 100_000_000 } });
await app.register(fastifyStatic, { root: UPLOADS_DIR, prefix: "/uploads/", decorateReply: false });

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
  if (!process.env.DATABASE_URL?.trim()) {
    return reply.status(500).send({ error: "DATABASE_URL is required for backups" });
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
    await runCommand("pg_dump", ["--clean", "--if-exists", "--no-owner", "--no-privileges", "--file", dbDumpPath, process.env.DATABASE_URL]);

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
  if (!process.env.DATABASE_URL?.trim()) {
    return reply.status(500).send({ error: "DATABASE_URL is required for restore" });
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
    await runCommand("psql", [process.env.DATABASE_URL, "-f", dbDumpPath]);

    const uploadsBackupDir = join(extractDir, "uploads");
    if (existsSync(uploadsBackupDir)) {
      await rm(UPLOADS_DIR, { recursive: true, force: true });
      mkdirSync(UPLOADS_DIR, { recursive: true });
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
  await Promise.all(files.map((f) => f.providerPath ? unlink(f.providerPath).catch(() => {}) : Promise.resolve()));
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
  return Promise.all(rows.map(async (post) => ({ ...post, ...(await attachBlogRelations(post.id, req.siteId)) })));
});

app.get<{ Params: { slug: string } }>("/api/blog/public/posts/:slug", async (req, reply) => {
  const [post] = await db.select().from(blogPosts)
    .where(and(eq(blogPosts.siteId, req.siteId), eq(blogPosts.slug, req.params.slug), eq(blogPosts.status, "published")))
    .limit(1);
  if (!post) return reply.status(404).send({ error: "Post not found" });
  return { ...post, ...(await attachBlogRelations(post.id, req.siteId)) };
});

// ── Forms, Newsletter, CRM ───────────────────────────────────────────────────

type FormFieldType = "text" | "email" | "textarea" | "select" | "checkbox";
type FormField = {
  id: string;
  label: string;
  name: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function parseFormFields(value: string | null): FormField[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === "object").map((item) => {
      const f = item as Record<string, unknown>;
      const type = typeof f.type === "string" ? f.type : "text";
      const options = Array.isArray(f.options)
        ? f.options.filter((o): o is string => typeof o === "string")
        : [];
      return {
        id: typeof f.id === "string" ? f.id : `f_${Math.random().toString(36).slice(2, 10)}`,
        label: typeof f.label === "string" ? f.label : "",
        name: typeof f.name === "string" ? f.name : "",
        type: (["text", "email", "textarea", "select", "checkbox"].includes(type) ? type : "text") as FormFieldType,
        required: Boolean(f.required),
        placeholder: typeof f.placeholder === "string" ? f.placeholder : "",
        options,
      };
    });
  } catch {
    return [];
  }
}

function normalizeFormFields(input: unknown): FormField[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const field = item as Record<string, unknown>;
      const typeRaw = typeof field.type === "string" ? field.type : "text";
      const type = (["text", "email", "textarea", "select", "checkbox"].includes(typeRaw) ? typeRaw : "text") as FormFieldType;
      const nameRaw = typeof field.name === "string" ? field.name.trim() : "";
      const name = nameRaw || `field_${index + 1}`;
      return {
        id: typeof field.id === "string" && field.id.trim() ? field.id.trim() : `f_${index + 1}`,
        label: typeof field.label === "string" ? field.label : name,
        name: name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "_"),
        type,
        required: Boolean(field.required),
        placeholder: typeof field.placeholder === "string" ? field.placeholder : "",
        options: Array.isArray(field.options) ? field.options.filter((o): o is string => typeof o === "string") : [],
      };
    });
}

function mapFormRow(row: typeof forms.$inferSelect) {
  return {
    ...row,
    fields: parseFormFields(row.fields),
  };
}

function mapSubscriberRow(row: typeof newsletterSubscribers.$inferSelect) {
  return {
    ...row,
    meta: parseJsonObject(row.meta),
  };
}

function mapLeadRow(row: typeof crmLeads.$inferSelect) {
  return {
    ...row,
    payload: parseJsonObject(row.payload),
  };
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

app.post("/api/forms", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const body = req.body as {
    name: string;
    slug?: string;
    description?: string | null;
    status?: "active" | "inactive";
    submitLabel?: string;
    successMessage?: string;
    fields?: unknown[];
  };
  if (!body.name?.trim()) return reply.status(400).send({ error: "name required" });
  const slug = slugifyText(body.slug ?? body.name) || "form";
  const [created] = await db.insert(forms).values({
    siteId: req.siteId,
    name: body.name.trim(),
    slug,
    description: body.description ?? null,
    status: body.status === "inactive" ? "inactive" : "active",
    submitLabel: body.submitLabel?.trim() || "Submit",
    successMessage: body.successMessage?.trim() || "Thanks, we received your submission.",
    fields: JSON.stringify(normalizeFormFields(body.fields)),
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
    fields?: unknown[];
  };
  const [existing] = await db.select().from(forms)
    .where(and(eq(forms.id, id), eq(forms.siteId, req.siteId)))
    .limit(1);
  if (!existing) return reply.status(404).send({ error: "Form not found" });
  const [updated] = await db.update(forms).set({
    name: body.name !== undefined ? body.name.trim() : existing.name,
    slug: body.slug !== undefined ? (slugifyText(body.slug) || existing.slug) : existing.slug,
    description: body.description !== undefined ? body.description ?? null : existing.description,
    status: body.status !== undefined ? body.status : existing.status,
    submitLabel: body.submitLabel !== undefined ? (body.submitLabel.trim() || existing.submitLabel) : existing.submitLabel,
    successMessage: body.successMessage !== undefined ? (body.successMessage.trim() || existing.successMessage) : existing.successMessage,
    fields: body.fields !== undefined ? JSON.stringify(normalizeFormFields(body.fields)) : existing.fields,
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

app.post<{ Params: { slug: string } }>("/api/forms/submit/:slug", async (req, reply) => {
  const body = req.body as { values?: Record<string, unknown>; meta?: Record<string, unknown> };
  const [form] = await db.select().from(forms)
    .where(and(eq(forms.siteId, req.siteId), eq(forms.slug, req.params.slug), eq(forms.status, "active")))
    .limit(1);
  if (!form) return reply.status(404).send({ error: "Form not found" });

  const fields = parseFormFields(form.fields);
  const rawValues = body.values && typeof body.values === "object" ? body.values : {};
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const value = (rawValues as Record<string, unknown>)[field.name];
    const isEmpty = value == null || value === "";
    if (field.required && isEmpty) {
      return reply.status(400).send({ error: `${field.label || field.name} is required` });
    }
    if (field.type === "email" && typeof value === "string" && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      return reply.status(400).send({ error: `${field.label || field.name} must be a valid email` });
    }
    values[field.name] = value ?? "";
  }

  const channel = await findOrCreateSourceChannel(req.siteId, "form");
  const normalizedName = typeof values.name === "string" ? values.name : null;
  const normalizedEmail = typeof values.email === "string" ? values.email : null;
  const normalizedPhone = typeof values.phone === "string" ? values.phone : null;
  const normalizedCompany = typeof values.company === "string" ? values.company : null;
  const payload = {
    values,
    meta: body.meta ?? {},
    userAgent: req.headers["user-agent"] ?? "",
    ip: req.ip,
  };
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

  return { ok: true, message: form.successMessage, lead: mapLeadRow(lead) };
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
  return db.select().from(crmChannels)
    .where(eq(crmChannels.siteId, req.siteId))
    .orderBy(asc(crmChannels.name));
});

app.post("/api/crm/channels", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const body = req.body as { name: string; slug?: string; description?: string | null; isActive?: boolean };
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
  return created;
});

app.put<{ Params: { id: string } }>("/api/crm/channels/:id", { preHandler: requireAuth(["admin", "page_developer", "blogger_admin"]) }, async (req, reply) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
  const body = req.body as { name?: string; slug?: string; description?: string | null; isActive?: boolean };
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
  return updated;
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
  const statusQuery = typeof (req.query as { status?: string }).status === "string"
    ? (req.query as { status?: string }).status
    : undefined;
  const baseWhere = eq(crmLeads.siteId, req.siteId);
  const rows = await db.select().from(crmLeads)
    .where(statusQuery ? and(baseWhere, eq(crmLeads.status, statusQuery)) : baseWhere)
    .orderBy(desc(crmLeads.createdAt));
  const channelRows = await db.select().from(crmChannels).where(eq(crmChannels.siteId, req.siteId));
  const channelsById = new Map(channelRows.map((c) => [c.id, c]));
  return rows.map((row) => ({
    ...mapLeadRow(row),
    channel: row.channelId ? channelsById.get(row.channelId) ?? null : null,
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
  return mapLeadRow(created);
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
  return mapLeadRow(updated);
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
const pluginSql = postgres(process.env.DATABASE_URL!);

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

const port = Number(process.env.PORT) || 3000;
await app.listen({ port, host: "0.0.0.0" });
