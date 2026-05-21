import { StrictMode } from "react";
import { prerender } from "react-dom/static";
import { StaticRouter } from "react-router-dom";
import App from "./App";
import { InitialDataProvider, type InitialData } from "@/lib/initialData";
import { buildHomepageTitle, buildPageTitle } from "@/lib/seoTitle";
import type { SeoConfig } from "@/lib/api";

// ── Body render ───────────────────────────────────────────────────────────────

/**
 * Render the React app for `url` into a complete HTML string. `prerender`
 * waits for every Suspense boundary — so lazily-loaded blocks resolve into the
 * output and the markup is final, with no fallback flashes.
 */
export async function render(url: string, data: InitialData): Promise<string> {
  const { prelude } = await prerender(
    <StrictMode>
      <InitialDataProvider value={data}>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </InitialDataProvider>
    </StrictMode>
  );
  return new Response(prelude).text();
}

// ── Head render ───────────────────────────────────────────────────────────────

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

function metaName(name: string, content: string | null | undefined): string {
  return content ? `<meta name="${name}" content="${esc(content)}" />` : "";
}
function metaProp(property: string, content: string | null | undefined): string {
  return content ? `<meta property="${property}" content="${esc(content)}" />` : "";
}

function jsonLd(seo: SeoConfig): string {
  const type = seo.businessType ?? "WebSite";
  const name = seo.businessName || seo.siteName;
  if (!name) return "";
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": type,
    name,
    url: seo.siteUrl,
    description: seo.businessDescription || seo.defaultDescription,
  };
  if (seo.businessLogo) ld.logo = { "@type": "ImageObject", url: seo.businessLogo };
  const sameAs = (seo.socialProfiles ?? []).map((p) => p.url).filter(Boolean);
  if (sameAs.length) ld.sameAs = sameAs;
  if (type === "LocalBusiness" || type === "Organization") {
    if (seo.businessPhone) ld.telephone = seo.businessPhone;
    if (seo.businessEmail) ld.email = seo.businessEmail;
    if (seo.businessStreet || seo.businessCity) {
      ld.address = {
        "@type": "PostalAddress",
        streetAddress: seo.businessStreet,
        addressLocality: seo.businessCity,
        addressRegion: seo.businessState,
        postalCode: seo.businessZip,
        addressCountry: seo.businessCountry,
      };
    }
  }
  // A literal "</script>" would close the block early — escape the "<".
  return `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`;
}

/** Build the server-rendered <head> SEO block for a public route. */
export function renderHead(url: string, data: InitialData, origin: string): string {
  const seo: SeoConfig = data.settings?.seoConfig ?? {};
  const path = url.split("?")[0];
  const page = data.page ?? null;
  const post = data.blogPost ?? null;

  let title: string;
  if (path === "/") title = buildHomepageTitle(page, seo);
  else if (post) title = buildPageTitle({ title: post.title, seoTitle: null }, seo);
  else if (path === "/blog") title = buildPageTitle({ title: "Blog", seoTitle: null }, seo);
  else if (page) title = buildPageTitle({ title: page.title, seoTitle: page.seoTitle }, seo);
  else title = seo.siteName || seo.globalSiteName || "";

  const description = page?.seoDescription || post?.description || seo.defaultDescription || "";
  const ogImage = page?.ogImage || post?.headerImage || seo.defaultOgImage || "";
  const noIndex = page?.noIndex ?? false;
  const base = (seo.siteUrl || origin).replace(/\/$/, "");
  const canonical = page?.canonicalUrl || (base ? base + path : "");
  const siteName = seo.globalSiteName || seo.siteName || "";

  return [
    `<title>${esc(title)}</title>`,
    metaName("description", description),
    metaName("keywords", page?.seoKeywords),
    metaName("robots", noIndex ? "noindex, nofollow" : "index, follow"),
    canonical && `<link rel="canonical" href="${esc(canonical)}" />`,
    metaProp("og:type", "website"),
    metaProp("og:title", title),
    metaProp("og:description", description),
    metaProp("og:url", canonical),
    metaProp("og:image", ogImage),
    metaProp("og:site_name", siteName),
    metaName("twitter:card", ogImage ? "summary_large_image" : "summary"),
    metaName("twitter:title", title),
    metaName("twitter:description", description),
    metaName("twitter:image", ogImage),
    metaName("google-site-verification", seo.googleVerification),
    metaName("msvalidate.01", seo.bingVerification),
    metaName("yandex-verification", seo.yandexVerification),
    jsonLd(seo),
  ].filter(Boolean).join("\n    ");
}
