import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Home, FileText, Image, Layout, Search, ChevronRight, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { onDataChange } from "@/lib/dataEvents";

type Page = { id: number; title: string; slug: string; content: string | null; isHomepage: boolean };

const quickLinks = [
  { to: "/admin/pages", label: "Pages", desc: "Create & edit pages", icon: FileText },
  { to: "/admin/media", label: "Media", desc: "Upload photos & files", icon: Image },
  { to: "/admin/layout", label: "Site Layout", desc: "Navbar, colors, footer", icon: Layout },
  { to: "/admin/seo", label: "SEO", desc: "Search & discoverability", icon: Search },
];

export function HomepageEditor() {
  const [homepage, setHomepage] = useState<Page | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    Promise.all([api.homepage.get(), api.pages.list()])
      .then(([hp, list]) => {
        setHomepage(hp ?? null);
        setPages(list);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/pages") || event.path.startsWith("/api/homepage")) load();
    });
  }, []);

  const setAsHomepage = (pageId: number) => {
    setSaving(true);
    api.homepage
      .setPageId(pageId)
      .then(() => api.homepage.get())
      .then((hp) => { if (hp) setHomepage(hp); })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Welcome back. Here's your site at a glance.</p>
      </div>

      {/* Homepage card */}
      <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
        <div className="px-6 py-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-11 rounded-2xl bg-muted flex items-center justify-center shrink-0">
              <Home className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Homepage</p>
              {homepage ? (
                <>
                  <p className="font-semibold">{homepage.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">/{homepage.slug}</p>
                </>
              ) : (
                <p className="font-medium text-muted-foreground">Not set</p>
              )}
            </div>
          </div>
          {homepage && (
            <Button asChild size="sm" className="shrink-0">
              <Link to={`/admin/pages/${homepage.id}/editor`}>
                <Pencil className="size-3.5 mr-1.5" />
                Edit
              </Link>
            </Button>
          )}
        </div>

        {/* Change homepage */}
        <div className="border-t border-border/40 px-6 py-4 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {homepage ? "Change homepage" : "Choose a homepage"}
          </p>
          {pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pages yet.{" "}
              <Link to="/admin/pages/new" className="underline underline-offset-2 hover:text-foreground">
                Create your first page
              </Link>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pages.filter((p) => !p.isHomepage).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setAsHomepage(p.id)}
                  disabled={saving}
                  className="text-sm rounded-lg border border-border/60 bg-background px-3 py-1.5 hover:border-border hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Quick links</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {quickLinks.map(({ to, label, desc, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-background px-5 py-4 hover:border-border hover:shadow-sm transition-all"
            >
              <div className="size-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
