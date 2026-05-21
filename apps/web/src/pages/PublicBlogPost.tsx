import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type BlogPost, type SeoConfig } from "@/lib/api";
import { GlobalLayout } from "@/components/GlobalLayout";
import { BlockRenderer } from "@/components/BlockRenderer";
import { useSeoHead } from "@/lib/useSeoHead";
import { buildPageTitle } from "@/lib/seoTitle";
import { useInitialData } from "@/lib/initialData";

export function PublicBlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const initial = useInitialData();
  const [post, setPost] = useState<BlogPost | null>(
    initial.blogPost && initial.blogPost.slug === slug ? initial.blogPost : null
  );
  const [seoConfig, setSeoConfig] = useState<SeoConfig>(initial.settings?.seoConfig ?? {});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    if (!post || post.slug !== slug) {
      api.blog.public.getBySlug(slug).then(setPost).catch((e) => setError(e.message));
      api.siteSettings.get().then((s) => setSeoConfig(s.seoConfig ?? {})).catch(() => {});
    }
  }, [slug]);

  const pageTitle = post ? buildPageTitle({ title: post.title, seoTitle: null }, seoConfig) : "";

  useSeoHead({
    title: pageTitle || undefined,
    description: post?.description || seoConfig.defaultDescription || undefined,
    ogImage: post?.headerImage || seoConfig.defaultOgImage || undefined,
    canonical: slug && seoConfig.siteUrl ? `${seoConfig.siteUrl.replace(/\/$/, "")}/blog/${slug}` : undefined,
    siteName: seoConfig.globalSiteName || seoConfig.siteName,
  });

  if (error) {
    return (
      <GlobalLayout>
        <div className="max-w-3xl mx-auto px-4 py-14 text-sm text-destructive">{error}</div>
      </GlobalLayout>
    );
  }

  if (!post) return null;

  return (
    <GlobalLayout>
      <article className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground">← Back to blog</Link>
        {post.headerImage && <img src={post.headerImage} alt={post.title} className="w-full rounded-2xl object-cover max-h-[420px]" />}
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">{post.title}</h1>
          {post.description && <p className="text-muted-foreground">{post.description}</p>}
          <div className="flex flex-wrap gap-2">
            {post.authors.map((a) => (
              <span key={a.id} className="text-xs rounded-full bg-muted px-2.5 py-1">{a.position ? `${a.position} · ` : ""}{a.email}</span>
            ))}
          </div>
        </header>
        <BlockRenderer content={post.content} />
      </article>
    </GlobalLayout>
  );
}

