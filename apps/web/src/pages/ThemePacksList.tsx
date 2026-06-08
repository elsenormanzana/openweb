import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Palette, Pencil, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { onDataChange, emitDataChange } from "@/lib/dataEvents";
import { readableOn, type ColorPalette } from "@/lib/palette";
import { THEME_PRESETS, paletteMatchesPreset, type ThemePreset } from "@/lib/themePresets";

type ThemePack = { id: number; name: string; slug: string; cssContent: string | null };

/** Side-by-side light/dark mini-mockup of a preset palette. */
function PresetPreview({ preset }: { preset: ThemePreset }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {([preset.light, preset.dark] as ColorPalette[]).map((p, idx) => (
        <div
          key={idx}
          className="rounded-xl border p-2.5"
          style={{ background: p.background, borderColor: p.border }}
        >
          <div className="rounded-lg p-2.5 flex flex-col gap-1.5" style={{ background: p.surface }}>
            <div className="h-1.5 w-2/3 rounded-full" style={{ background: p.text }} />
            <div className="h-1.5 w-1/2 rounded-full" style={{ background: p.muted }} />
            <span
              className="mt-1 inline-flex h-5 items-center self-start rounded-full px-2.5 text-[9px] font-semibold"
              style={{ background: p.primary, color: readableOn(p.primary) }}
            >
              Button
            </span>
          </div>
          <p className="mt-1.5 text-[9px] font-medium uppercase tracking-wider" style={{ color: p.muted }}>
            {idx === 0 ? "Light" : "Dark"}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ThemePacksList() {
  const [themes, setThemes] = useState<ThemePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [appliedPalette, setAppliedPalette] = useState<Partial<ColorPalette> | undefined>();
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.themePacks.list()
      .then(setThemes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.siteSettings.get().then((s) => setAppliedPalette(s.navConfig?.palette)).catch(() => {});
    return onDataChange((event) => {
      if (event.path.startsWith("/api/theme-packs")) load();
    });
  }, []);

  const applyPreset = async (preset: ThemePreset) => {
    setApplyingId(preset.id);
    setError(null);
    try {
      const s = await api.siteSettings.get();
      await api.siteSettings.update({
        navConfig: { ...(s.navConfig ?? {}), palette: preset.light, darkPalette: preset.dark },
      });
      setAppliedPalette(preset.light);
      emitDataChange({ method: "PUT", path: "/api/site-settings" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply theme");
    } finally {
      setApplyingId(null);
    }
  };

  const confirmDelete = () => {
    if (deleteId == null) return;
    api.themePacks.delete(deleteId).then(() => { setDeleteId(null); load(); }).catch((e) => setError(e.message));
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="space-y-10 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Themes</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Apply a curated palette, or write your own custom CSS theme.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Curated presets */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Theme presets</h2>
          <p className="text-muted-foreground text-sm">
            One click sets your light and dark brand colors. Fine-tune any of them afterward in Site Layout.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {THEME_PRESETS.map((preset) => {
            const applied = paletteMatchesPreset(appliedPalette, preset);
            return (
              <div
                key={preset.id}
                className={`rounded-2xl border bg-background p-4 flex flex-col gap-3 transition-all ${
                  applied ? "border-foreground ring-1 ring-foreground/10" : "border-border/60 hover:border-border hover:shadow-sm"
                }`}
              >
                <PresetPreview preset={preset} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{preset.name}</p>
                    {applied && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">
                        <Check className="size-3" /> Applied
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{preset.description}</p>
                </div>
                <Button
                  size="sm"
                  variant={applied ? "outline" : "default"}
                  disabled={applyingId === preset.id || applied}
                  onClick={() => applyPreset(preset)}
                >
                  {applyingId === preset.id ? "Applying…" : applied ? "Current theme" : "Apply theme"}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Custom CSS theme packs */}
      <section className="space-y-4 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Custom CSS themes</h2>
            <p className="text-muted-foreground text-sm">
              {themes.length} {themes.length === 1 ? "theme pack" : "theme packs"} — advanced, raw CSS.
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
      </section>

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
