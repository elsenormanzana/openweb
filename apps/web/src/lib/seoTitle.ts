import type { SeoConfig } from "@/lib/api";

type TitlePage = {
  title: string;
  seoTitle: string | null;
};

function joinTitle(parts: Array<string | undefined | null>): string {
  return parts.map((v) => (v ?? "").trim()).filter(Boolean).join(" - ");
}

export function buildPageTitle(page: TitlePage, seo: SeoConfig): string {
  const base = (page.seoTitle || page.title).trim();
  return joinTitle([base, seo.siteName, seo.siteSubtitle, seo.globalSiteName]);
}

export function buildHomepageTitle(page: TitlePage | null, seo: SeoConfig): string {
  if (page?.seoTitle?.trim()) {
    return joinTitle([page.seoTitle, seo.siteSubtitle, seo.globalSiteName]);
  }
  if (seo.siteName?.trim()) {
    return joinTitle([seo.siteName, seo.siteSubtitle, seo.globalSiteName]);
  }
  return joinTitle([seo.globalSiteName, seo.siteSubtitle]);
}
