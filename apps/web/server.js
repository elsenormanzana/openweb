// Web SSR server. Renders public pages with the real React component tree and
// serves the SPA shell for admin/auth routes. The API is a pure JSON service —
// this process fetches page data from it and prerenders the markup.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import express from "express";
import compression from "compression";

const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT) || (isProd ? 80 : 5173);
const API_URL = (process.env.API_URL || "http://localhost:3000").replace(/\/$/, "");
const ROOT = import.meta.dirname;
const CACHE_TTL = 60_000;

// Rendered-HTML cache, keyed by host+url. Keeps the React render off the hot
// path; the API purges it (POST /__purge) the moment content changes.
const cache = new Map();

// Admin/auth routes are authed and dynamic — they get the bare SPA shell.
const SHELL_RE = /^\/(admin|login|setup|register|portal)(\/|$)/;

// `</script>` and HTML-significant chars must not break out of the inline JSON.
const serializeData = (data) => JSON.stringify(data).replace(/</g, "\\u003c");

// HTML is always revalidated — freshness is handled by this server's own cache
// (purged by the API on change). Hashed JS/CSS assets are cached separately.
function sendHtml(res, status, html) {
  res
    .status(status)
    .set("Content-Type", "text/html; charset=utf-8")
    .set("Cache-Control", "no-cache")
    .end(html);
}

// ── API access ────────────────────────────────────────────────────────────────

// The API resolves the tenant from the request host; `fetch` forbids setting
// the Host header, so the real host is forwarded as X-Site-Host instead.
async function apiGet(apiPath, host) {
  const res = await fetch(API_URL + apiPath, {
    headers: { "x-site-host": host, accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (res.status === 404) return { notFound: true };
  if (!res.ok) throw new Error(`API ${apiPath} responded ${res.status}`);
  return { data: await res.json() };
}

// Resolve exactly the data a public route needs from the JSON API.
async function loadInitialData(pathname, host) {
  const settings = apiGet("/api/site-settings", host);

  if (pathname === "/") {
    const [page, s] = await Promise.all([apiGet("/api/homepage", host), settings]);
    return { initialData: { page: page.data ?? null, settings: s.data ?? null } };
  }
  if (pathname === "/blog") {
    const [posts, s] = await Promise.all([apiGet("/api/blog/public/posts", host), settings]);
    return { initialData: { blogPosts: posts.data ?? [], settings: s.data ?? null } };
  }
  const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const slug = decodeURIComponent(blogMatch[1]);
    const [post, s] = await Promise.all([
      apiGet(`/api/blog/public/posts/${encodeURIComponent(slug)}`, host),
      settings,
    ]);
    if (post.notFound) return { notFound: true };
    return { initialData: { blogPost: post.data, settings: s.data ?? null } };
  }
  const slug = decodeURIComponent(pathname.slice(1));
  const [page, s] = await Promise.all([
    apiGet(`/api/pages/by-slug/${encodeURIComponent(slug)}`, host),
    settings,
  ]);
  if (page.notFound) return { notFound: true };
  return { initialData: { page: page.data, settings: s.data ?? null } };
}

// ── HTML assembly ─────────────────────────────────────────────────────────────

function assembleHtml(template, headHtml, appHtml, data) {
  return template
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace("</head>", `    ${headHtml}\n  </head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root">${appHtml}</div>\n    <script>window.__INITIAL_DATA__=${serializeData(data)}</script>`
    );
}

// ── Server ────────────────────────────────────────────────────────────────────

async function createServer() {
  const app = express();
  app.set("trust proxy", true);
  app.use(compression());

  let vite = null;
  let prodTemplate = "";
  let prodEntry = null;

  if (isProd) {
    prodTemplate = fs.readFileSync(path.join(ROOT, "dist/client/index.html"), "utf8");
    prodEntry = await import(pathToFileURL(path.join(ROOT, "dist/server/entry-server.js")).href);
    app.use("/assets", express.static(path.join(ROOT, "dist/client/assets"), {
      immutable: true,
      maxAge: "1y",
      index: false,
    }));
    app.use(express.static(path.join(ROOT, "dist/client"), { index: false }));
  } else {
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({
      root: ROOT,
      appType: "custom",
      server: { middlewareMode: true },
    });
    app.use(vite.middlewares);
  }

  // Internal cache purge — called by the API on content changes. Never routed
  // to publicly by nginx.
  app.post("/__purge", (_req, res) => {
    cache.clear();
    res.json({ ok: true });
  });

  // Load the index template + SSR entry for the current request.
  async function loadRenderer(url) {
    if (isProd) return { template: prodTemplate, ...prodEntry };
    const raw = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    const template = await vite.transformIndexHtml(url, raw);
    const mod = await vite.ssrLoadModule("/src/entry-server.tsx");
    return { template, render: mod.render, renderHead: mod.renderHead };
  }

  // Serve the SPA shell with an empty #root (admin routes, or graceful fallback).
  async function serveShell(req, res, status) {
    let html = isProd ? prodTemplate : fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    if (!isProd) html = await vite.transformIndexHtml(req.originalUrl, html);
    sendHtml(res, status, html);
  }

  app.get(/.*/, async (req, res, next) => {
    const pathname = req.path.replace(/\/+$/, "") || "/";

    if (SHELL_RE.test(pathname)) return serveShell(req, res, 200);
    // Asset/API paths never reach SSR (nginx routes them away; vite handles dev).
    if (/^\/(api|uploads|assets|@|src|node_modules)\b/.test(pathname)) return next();

    const host = (req.headers.host || "").toLowerCase();
    const cacheKey = host + req.originalUrl;
    const hit = cache.get(cacheKey);
    if (hit && hit.expires > Date.now()) {
      return sendHtml(res, 200, hit.html);
    }

    try {
      const result = await loadInitialData(pathname, host);
      if (result.notFound) return serveShell(req, res, 404);

      const { template, render, renderHead } = await loadRenderer(req.originalUrl);
      const data = result.initialData;
      const origin = `${req.protocol}://${host}`;
      const appHtml = await render(req.originalUrl, data);
      const headHtml = renderHead(req.originalUrl, data, origin);
      const html = assembleHtml(template, headHtml, appHtml, data);

      cache.set(cacheKey, { html, expires: Date.now() + CACHE_TTL });
      sendHtml(res, 200, html);
    } catch (err) {
      if (vite) vite.ssrFixStacktrace(err);
      console.error(`[ssr] ${req.originalUrl}:`, err);
      // Degrade gracefully — the SPA shell still renders client-side.
      serveShell(req, res, 200).catch(() => res.status(500).end("Internal Server Error"));
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[web] ${isProd ? "production" : "dev"} SSR server listening on :${PORT}`);
  });
}

createServer();
