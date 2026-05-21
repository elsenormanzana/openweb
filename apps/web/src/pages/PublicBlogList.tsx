import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type BlogPost, type SeoConfig } from "@/lib/api";
import { GlobalLayout } from "@/components/GlobalLayout";
import { useSeoHead } from "@/lib/useSeoHead";
import { buildPageTitle } from "@/lib/seoTitle";
import { onDataChange } from "@/lib/dataEvents";
import { useInitialData } from "@/lib/initialData";

export function PublicBlogList() {
  const initial = useInitialData();
  const [posts, setPosts] = useState<BlogPost[]>(initial.blogPosts ?? []);
  const [seoConfig, setSeoConfig] = useState<SeoConfig>(initial.settings?.seoConfig ?? {});
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = () => {
      api.blog.public.list().then(setPosts).catch(() => {});
      api.siteSettings.get().then((s) => setSeoConfig(s.seoConfig ?? {})).catch(() => {});
    };

    if (posts.length === 0) {
      load();
    }

    return onDataChange((event) => {
      if (event.path.startsWith("/api/blog/") || event.path.startsWith("/api/site-settings")) load();
    });
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return posts;
    const q = query.toLowerCase();
    return posts.filter((p) => p.title.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q));
  }, [posts, query]);

  const pageTitle = buildPageTitle({ title: "Blog", seoTitle: null }, seoConfig);

  useSeoHead({
    title: pageTitle || undefined,
    description: seoConfig.defaultDescription || "Latest articles and updates.",
    ogImage: seoConfig.defaultOgImage || undefined,
    canonical: seoConfig.siteUrl ? `${seoConfig.siteUrl.replace(/\/$/, "")}/blog` : undefined,
    siteName: seoConfig.globalSiteName || seoConfig.siteName,
  });

  return (
    <GlobalLayout>
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Blog</h1>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts"
            className="w-full md:w-80 rounded-lg border border-border/60 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((post) => (
            <Link key={post.id} to={`/blog/${post.slug}`} className="rounded-2xl border border-border/60 bg-background p-4 hover:border-border transition-colors">
              {post.headerImage && <img src={post.headerImage} alt={post.title} className="w-full h-40 object-cover rounded-xl mb-3" />}
              <p className="text-lg font-semibold">{post.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{post.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {post.tags.slice(0, 4).map((tag) => <span key={tag.id} className="text-xs bg-muted rounded-full px-2 py-0.5">#{tag.name}</span>)}
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              No posts found.
            </div>
          )}
        </div>
      </div>
    </GlobalLayout>
  );
}
