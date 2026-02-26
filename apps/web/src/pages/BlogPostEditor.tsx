import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BlockEditor } from "@/components/BlockEditor";
import { api, type BlogCategory, type BlogPost, type BlogTag, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const BLOG_STARTER = JSON.stringify([
  { id: crypto.randomUUID(), type: "heading", props: { text: "Blog Headline", level: "h1", align: "left", color: "" } },
  { id: crypto.randomUUID(), type: "text", props: { content: "<p>Write your intro paragraph here.</p>", align: "left" } },
  { id: crypto.randomUUID(), type: "image", props: { src: "", alt: "Header image", width: "full", caption: "" } },
  { id: crypto.randomUUID(), type: "text", props: { content: "<p>Add your main content with sections, lists, and examples.</p>", align: "left" } },
]);

export function BlogPostEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const editingId = id ? Number(id) : null;
  const isEditing = editingId != null && !Number.isNaN(editingId);

  const [post, setPost] = useState<BlogPost | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [approvalMode, setApprovalMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [headerImage, setHeaderImage] = useState("");
  const [content, setContent] = useState(BLOG_STARTER);
  const [status, setStatus] = useState<BlogPost["status"]>("draft");
  const [datePublished, setDatePublished] = useState("");
  const [authorIds, setAuthorIds] = useState<number[]>([]);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);

  const canReview = user?.role === "admin" || user?.role === "blogger_admin";

  useEffect(() => {
    Promise.all([
      api.users.list(),
      api.blog.categories.list(),
      api.blog.tags.list(),
      api.blog.settings.get().catch(() => ({ approvalMode: false })),
      isEditing ? api.blog.posts.get(editingId as number) : Promise.resolve(null),
    ])
      .then(([us, cs, ts, bs, existing]) => {
        setUsers(us);
        setCategories(cs);
        setTags(ts);
        setApprovalMode(bs.approvalMode);
        if (existing) {
          setPost(existing);
          setTitle(existing.title);
          setSlug(existing.slug);
          setDescription(existing.description ?? "");
          setHeaderImage(existing.headerImage ?? "");
          setContent(existing.content ?? BLOG_STARTER);
          setStatus(existing.status);
          setDatePublished(existing.datePublished ? existing.datePublished.slice(0, 10) : "");
          setAuthorIds(existing.authors.map((a) => a.id));
          setCategoryIds(existing.categories.map((c) => c.id));
          setTagIds(existing.tags.map((t) => t.id));
        } else if (user) {
          setAuthorIds([user.sub]);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [editingId]);

  const submitLabel = useMemo(() => {
    if (approvalMode && user?.role === "blogger") return "Submit for review";
    return "Publish";
  }, [approvalMode, user?.role]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        title,
        slug,
        description: description || null,
        content,
        headerImage: headerImage || null,
        status,
        datePublished: datePublished || null,
        authorIds,
        categoryIds,
        tagIds,
      };
      const saved = isEditing
        ? await api.blog.posts.update(editingId as number, body)
        : await api.blog.posts.create(body);
      navigate(`/admin/blog/${saved.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function submitForReviewOrPublish() {
    if (!isEditing) return;
    await api.blog.posts.submit(editingId as number);
    const fresh = await api.blog.posts.get(editingId as number);
    setPost(fresh);
    setStatus(fresh.status);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{isEditing ? "Edit Blog Post" : "New Blog Post"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Use blocks tailored for blog storytelling and publishing workflow.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/blog" className="rounded-xl border border-border px-3 py-2 text-sm">Back</Link>
          <button onClick={save} disabled={saving} className="rounded-xl bg-foreground text-background px-4 py-2 text-sm disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
          {isEditing && (
            <button onClick={submitForReviewOrPublish} className="rounded-xl border border-border px-4 py-2 text-sm">{submitLabel}</button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid lg:grid-cols-[340px,1fr] gap-5">
        <div className="space-y-4 rounded-2xl border border-border/60 bg-background p-4 h-fit">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Slug</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Header Image URL</label>
            <input value={headerImage} onChange={(e) => setHeaderImage(e.target.value)} className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as BlogPost["status"])} className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm">
              <option value="draft">draft</option>
              <option value="pending_review">pending_review</option>
              {canReview && <option value="approved">approved</option>}
              <option value="published">published</option>
              {canReview && <option value="rejected">rejected</option>}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Publish Date</label>
            <input type="date" value={datePublished} onChange={(e) => setDatePublished(e.target.value)} className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Authors</label>
            <div className="max-h-28 overflow-y-auto rounded-lg border border-border/60 p-2 space-y-1">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={authorIds.includes(u.id)}
                    onChange={(e) => setAuthorIds((prev) => e.target.checked ? [...new Set([...prev, u.id])] : prev.filter((id) => id !== u.id))}
                  />
                  {u.email}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Categories</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c.id} type="button" onClick={() => setCategoryIds((prev) => prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id])}
                  className={`text-xs rounded-full px-2.5 py-1 border ${categoryIds.includes(c.id) ? "bg-foreground text-background border-foreground" : "bg-background border-border/60"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <button key={t.id} type="button" onClick={() => setTagIds((prev) => prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id])}
                  className={`text-xs rounded-full px-2.5 py-1 border ${tagIds.includes(t.id) ? "bg-foreground text-background border-foreground" : "bg-background border-border/60"}`}>
                  #{t.name}
                </button>
              ))}
            </div>
          </div>

          {post?.approvalNotes && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
              Review Notes: {post.approvalNotes}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-background p-2">
          <BlockEditor content={content} onChange={setContent} />
        </div>
      </div>
    </div>
  );
}

