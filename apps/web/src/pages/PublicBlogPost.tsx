import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type BlogPost } from "@/lib/api";
import { GlobalLayout } from "@/components/GlobalLayout";
import { BlockRenderer } from "@/components/BlockRenderer";
import { useSeoHead } from "@/lib/useSeoHead";

export function PublicBlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api.blog.public.getBySlug(slug).then(setPost).catch((e) => setError(e.message));
  }, [slug]);

  useSeoHead({
    title: post?.title,
    description: post?.description ?? undefined,
    ogImage: post?.headerImage ?? undefined,
    canonical: slug ? `${window.location.origin}/blog/${slug}` : undefined,
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

