import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Palette, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { onDataChange } from "@/lib/dataEvents";

type ThemePack = { id: number; name: string; slug: string; cssContent: string | null };

export function ThemePacksList() {
  const [themes, setThemes] = useState<ThemePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    api.themePacks.list()
      .then(setThemes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/theme-packs")) load();
    });
  }, []);

  const confirmDelete = () => {
    if (deleteId == null) return;
    api.themePacks.delete(deleteId).then(() => { setDeleteId(null); load(); }).catch((e) => setError(e.message));
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Themes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {themes.length} {themes.length === 1 ? "theme pack" : "theme packs"}
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/themes/new">
            <Plus className="size-4 mr-1.5" />
            New theme
          </Link>
        </Button>
      </div>

      {themes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <Palette className="size-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium text-sm">No theme packs</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Create custom CSS themes for your site</p>
          <Button asChild size="sm">
            <Link to="/admin/themes/new">
              <Plus className="size-4 mr-1.5" />
              New theme
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {themes.map((t) => (
            <div
              key={t.id}
              className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-background px-5 py-4 hover:border-border hover:shadow-sm transition-all"
            >
              <div className="size-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Palette className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">/{t.slug}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/admin/themes/${t.id}`}>
                    <Pencil className="size-3.5 mr-1" />
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteId(t.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete theme pack</DialogTitle>
            <DialogDescription>
              Remove "{themes.find((t) => t.id === deleteId)?.name}"? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
