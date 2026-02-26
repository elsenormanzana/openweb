import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function ThemePackEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const themeId = id === "new" ? 0 : Number(id);
  const idValid = isNew || !Number.isNaN(themeId);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [cssContent, setCssContent] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew || !idValid) {
      if (!idValid) setLoading(false);
      return;
    }
    api.themePacks
      .get(themeId)
      .then((data) => {
        setName(data.name);
        setSlug(data.slug);
        setCssContent(data.cssContent ?? "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew, idValid, themeId]);

  const save = () => {
    if (!isNew && !idValid) return;
    setSaving(true);
    setError(null);
    const body = { name, slug: slug || undefined, cssContent: cssContent || undefined };
    (isNew
      ? api.themePacks.create(body)
      : api.themePacks.update(themeId, body)
    )
      .then((data) => {
        setSaving(false);
        navigate(isNew ? `/admin/themes/${data.id}` : "/admin/themes", { replace: true });
      })
      .catch((e) => {
        setError(e.message);
        setSaving(false);
      });
  };

  if (!idValid) return <p className="text-destructive">Invalid theme ID.</p>;
  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{isNew ? "Add theme pack" : "Edit theme pack"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My theme" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (identifier)</Label>
          <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-theme" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="css">CSS content</Label>
          <textarea
            id="css"
            className="w-full min-h-[240px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={cssContent}
            onChange={(e) => setCssContent(e.target.value)}
            placeholder=":root { --accent: #3b82f6; }"
          />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
