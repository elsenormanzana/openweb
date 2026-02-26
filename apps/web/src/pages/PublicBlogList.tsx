import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type BlogPost } from "@/lib/api";
import { GlobalLayout } from "@/components/GlobalLayout";
import { useSeoHead } from "@/lib/useSeoHead";
import { onDataChange } from "@/lib/dataEvents";

export function PublicBlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = () => api.blog.public.list().then(setPosts).catch(() => {});
    load();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/blog/")) load();
    });
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return posts;
    const q = query.toLowerCase();
    return posts.filter((p) => p.title.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q));
  }, [posts, query]);

  useSeoHead({ title: "Blog", description: "Latest articles and updates." });

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
