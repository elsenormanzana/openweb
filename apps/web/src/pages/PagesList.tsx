import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText, Settings, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { onDataChange } from "@/lib/dataEvents";

type Page = { id: number; title: string; slug: string; content: string | null; isHomepage?: boolean };

export function PagesList() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    api.pages.list()
      .then(setPages)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/pages") || event.path.startsWith("/api/homepage")) load();
    });
  }, []);

  const confirmDelete = () => {
    if (deleteId == null) return;
    api.pages.delete(deleteId).then(() => { setDeleteId(null); load(); }).catch((e) => setError(e.message));
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pages</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {pages.length} {pages.length === 1 ? "page" : "pages"}
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/pages/new">
            <Plus className="size-4 mr-1.5" />
            New page
          </Link>
        </Button>
      </div>

      {/* Pages list */}
      {pages.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <FileText className="size-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium text-sm">No pages yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Create your first page to get started</p>
          <Button asChild size="sm">
            <Link to="/admin/pages/new">
              <Plus className="size-4 mr-1.5" />
              New page
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((p) => (
            <div
              key={p.id}
              className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-background px-5 py-4 hover:border-border hover:shadow-sm transition-all"
            >
              <div className="size-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <FileText className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{p.title}</span>
                  {p.isHomepage && (
                    <span className="rounded-full bg-foreground text-background px-2 py-0.5 text-[10px] font-semibold tracking-wide">
                      Homepage
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">/{p.slug}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/admin/pages/${p.id}/editor`}>
                    <Pencil className="size-3.5 mr-1" />
                    Edit
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/admin/pages/${p.id}/settings`}>
                    <Settings className="size-3.5 mr-1" />
                    Settings
                  </Link>
                </Button>
                {!p.isHomepage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(p.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete dialog */}
      <Dialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete page</DialogTitle>
            <DialogDescription>
              Remove "{pages.find((p) => p.id === deleteId)?.title}"? This cannot be undone.
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
