import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { slugify } from "@/lib/utils";

export function PageNew() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const save = () => {
    if (!title.trim()) { setError("Title required"); return; }
    setSaving(true);
    setError(null);
    api.pages
      .create({ title: title.trim(), slug: slug.trim() || slugify(title), content: "" })
      .then((data) => navigate(`/admin/pages/${data.id}/editor`, { replace: true }))
      .catch((e) => { setError(e.message); setSaving(false); });
  };

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New page</h1>
        <p className="text-muted-foreground mt-1 text-sm">Give your page a name and it'll open in the editor.</p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-background p-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My page"
            onKeyDown={(e) => e.key === "Enter" && save()}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">URL slug</Label>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">/</span>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }}
              placeholder={slugify(title) || "my-page"}
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Creating…" : "Create & open editor"}
        </Button>
      </div>
    </div>
  );
}
