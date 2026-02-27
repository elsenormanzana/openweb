import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Page, type SeoConfig } from "@/lib/api";
import { GlobalLayout } from "@/components/GlobalLayout";
import { BlockRenderer } from "@/components/BlockRenderer";
import { useSeoHead } from "@/lib/useSeoHead";
import { buildHomepageTitle } from "@/lib/seoTitle";
import { onDataChange } from "@/lib/dataEvents";

export function PublicHomePage() {
  const [page, setPage] = useState<Page | null | undefined>(undefined);
  const [seoConfig, setSeoConfig] = useState<SeoConfig>({});
  const [hasPublishedBlogs, setHasPublishedBlogs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      Promise.all([api.homepage.get(), api.siteSettings.get()])
        .then(([data, settings]) => {
          setPage(data ?? null);
          setSeoConfig(settings.seoConfig ?? {});
        })
        .catch((e) => setError(e.message));
      api.blog.public.list().then((posts) => setHasPublishedBlogs(posts.length > 0)).catch(() => {});
    };
    load();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/pages") || event.path.startsWith("/api/homepage") || event.path.startsWith("/api/blog/") || event.path.startsWith("/api/site-settings")) {
        load();
      }
    });
  }, []);

  const pageTitle = buildHomepageTitle(page ?? null, seoConfig);

  useSeoHead({
    title: pageTitle || undefined,
    description: page?.seoDescription || seoConfig.defaultDescription || undefined,
    keywords: page?.seoKeywords || undefined,
    ogImage: page?.ogImage || seoConfig.defaultOgImage || undefined,
    canonical: seoConfig.siteUrl?.replace(/\/$/, "") || undefined,
    noIndex: page?.noIndex,
    siteName: seoConfig.globalSiteName || seoConfig.siteName,
  });

  if (page === undefined) return null;

  if (error || page === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm">No homepage page is configured.</p>
          {hasPublishedBlogs && (
            <Link to="/blog" className="text-sm underline text-foreground">View published blog posts</Link>
          )}
        </div>
      </div>
    );
  }

  const content = <BlockRenderer content={page.content} />;
  if (page.ignoreGlobalLayout) return content;
  return (
    <GlobalLayout>
      <div className={page.disableElevatedNavSpacing ? "-mt-24 md:-mt-28" : ""}>
        {content}
      </div>
    </GlobalLayout>
  );
}
