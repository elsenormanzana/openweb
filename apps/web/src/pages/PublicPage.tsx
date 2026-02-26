import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type Page, type SeoConfig } from "@/lib/api";
import { GlobalLayout } from "@/components/GlobalLayout";
import { BlockRenderer } from "@/components/BlockRenderer";
import { useSeoHead } from "@/lib/useSeoHead";
import { buildPageTitle } from "@/lib/seoTitle";
import { onDataChange } from "@/lib/dataEvents";

export function PublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null | undefined>(undefined);
  const [seoConfig, setSeoConfig] = useState<SeoConfig>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const load = () => {
      Promise.all([
        api.pages.getBySlug(slug),
        api.siteSettings.get(),
      ])
        .then(([p, settings]) => {
          setPage(p);
          setSeoConfig(settings.seoConfig ?? {});
        })
        .catch((e) => {
          if (e.message === "Page not found") setPage(null);
          else setError(e.message);
        });
    };
    load();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/pages") || event.path.startsWith("/api/site-settings")) load();
    });
  }, [slug]);

  const pageTitle = page ? buildPageTitle(page, seoConfig) : "";
  const pageUrl = `${seoConfig.siteUrl?.replace(/\/$/, "") || ""}/${slug}`;

  useSeoHead({
    title: pageTitle || undefined,
    description: page?.seoDescription || seoConfig.defaultDescription || undefined,
    keywords: page?.seoKeywords || undefined,
    ogImage: page?.ogImage || seoConfig.defaultOgImage || undefined,
    canonical: page?.canonicalUrl || pageUrl || undefined,
    noIndex: page?.noIndex,
    siteName: seoConfig.globalSiteName || seoConfig.siteName,
  });

  if (page === undefined) return null;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (page === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Page not found.</p>
      </div>
    );
  }

  const content = <BlockRenderer content={page.content} />;
  if (page.ignoreGlobalLayout) return content;
  return <GlobalLayout>{content}</GlobalLayout>;
}
