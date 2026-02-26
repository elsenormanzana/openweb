import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, CheckCircle2, XCircle, Clock3, Trash2 } from "lucide-react";
import { api, type BlogPost, type BlogCategory, type BlogTag } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { onDataChange } from "@/lib/dataEvents";

export function BlogPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [approvalMode, setApprovalMode] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");
  const isReviewer = user?.role === "admin" || user?.role === "blogger_admin";

  async function refresh() {
    const [p, c, t] = await Promise.all([
      api.blog.posts.list(),
      api.blog.categories.list(),
      api.blog.tags.list(),
    ]);
    setPosts(p);
    setCategories(c);
    setTags(t);
    if (isReviewer) {
      const s = await api.blog.settings.get();
      setApprovalMode(s.approvalMode);
    }
  }

  useEffect(() => {
    refresh().catch(() => {});
    return onDataChange((event) => {
      if (event.path.startsWith("/api/blog/") || event.path.startsWith("/api/users")) {
        refresh().catch(() => {});
      }
    });
  }, []);

  const queue = useMemo(() => posts.filter((p) => p.status === "pending_review"), [posts]);

  async function toggleApprovalMode() {
    const next = !approvalMode;
    await api.blog.settings.update({ approvalMode: next });
    setApprovalMode(next);
  }

  async function addCategory() {
    if (!newCategory.trim()) return;
    await api.blog.categories.create({ name: newCategory.trim() });
    setNewCategory("");
    refresh().catch(() => {});
  }

  async function addTag() {
    if (!newTag.trim()) return;
    await api.blog.tags.create({ name: newTag.trim() });
    setNewTag("");
    refresh().catch(() => {});
  }

  async function removePost(post: BlogPost) {
    if (!confirm(`Delete "${post.title}"?`)) return;
    await api.blog.posts.delete(post.id);
    refresh().catch(() => {});
  }

  async function submitForReview(post: BlogPost) {
    await api.blog.posts.submit(post.id);
    refresh().catch(() => {});
  }

  async function approve(post: BlogPost) {
    await api.blog.posts.approve(post.id, { publish: true });
    refresh().catch(() => {});
  }

  async function reject(post: BlogPost) {
    const notes = prompt("Optional rejection notes") ?? "";
    await api.blog.posts.reject(post.id, { notes: notes || null });
    refresh().catch(() => {});
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage posts, categories, tags, and publishing workflow.</p>
        </div>
        <Link to="/admin/blog/new" className="rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-medium inline-flex items-center gap-2">
          <Plus className="size-4" />
          New post
        </Link>
      </div>

      {isReviewer && (
        <div className="rounded-2xl border border-border/60 bg-background p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Approval mode</p>
            <p className="text-xs text-muted-foreground">When enabled, bloggers submit posts for approval before publishing.</p>
          </div>
          <button
            onClick={toggleApprovalMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${approvalMode ? "bg-foreground" : "bg-muted"}`}
            title={approvalMode ? "Disable approval mode" : "Enable approval mode"}
          >
            <span className={`inline-block size-4 rounded-full bg-background transition-transform ${approvalMode ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      )}

      {(user?.role === "admin" || user?.role === "blogger" || user?.role === "blogger_admin") && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-3">
            <p className="font-medium text-sm">Categories</p>
            <div className="flex gap-2">
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category" className="flex-1 rounded-lg border border-border/60 px-3 py-2 text-sm" />
              <button onClick={addCategory} className="rounded-lg border border-border px-3 py-2 text-sm">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => <span key={c.id} className="text-xs rounded-full bg-muted px-2.5 py-1">{c.name}</span>)}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-3">
            <p className="font-medium text-sm">Tags</p>
            <div className="flex gap-2">
              <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag" className="flex-1 rounded-lg border border-border/60 px-3 py-2 text-sm" />
              <button onClick={addTag} className="rounded-lg border border-border px-3 py-2 text-sm">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => <span key={t.id} className="text-xs rounded-full bg-muted px-2.5 py-1">#{t.name}</span>)}
            </div>
          </div>
        </div>
      )}

      {isReviewer && queue.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-900">Review Queue</p>
          {queue.map((post) => (
            <div key={`queue-${post.id}`} className="rounded-lg border border-amber-200 bg-white p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{post.title}</p>
                <p className="text-xs text-muted-foreground">/{post.slug}</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/admin/blog/${post.id}`} className="rounded-lg border border-border px-3 py-1.5 text-xs">Open</Link>
                <button onClick={() => approve(post)} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs inline-flex items-center gap-1"><CheckCircle2 className="size-3.5" />Approve</button>
                <button onClick={() => reject(post)} className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs inline-flex items-center gap-1"><XCircle className="size-3.5" />Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {posts.map((post) => (
          <div key={post.id} className="rounded-2xl border border-border/60 bg-background p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{post.title}</p>
              <p className="text-xs text-muted-foreground">/{post.slug}</p>
            </div>
            <span className="text-xs rounded-full bg-muted px-2 py-0.5 inline-flex items-center gap-1">
              {post.status === "pending_review" && <Clock3 className="size-3" />}
              {post.status}
            </span>
            <div className="flex gap-1">
              <Link to={`/admin/blog/${post.id}`} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">Edit</Link>
              {(post.status === "draft" || post.status === "rejected") && (
                <button onClick={() => submitForReview(post)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">Submit</button>
              )}
              <button onClick={() => removePost(post)} className="rounded-lg border border-destructive/30 text-destructive px-2 py-1.5 text-xs">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            No blog posts yet.
          </div>
        )}
      </div>
    </div>
  );
}
