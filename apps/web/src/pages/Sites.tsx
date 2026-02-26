import { useEffect, useState } from "react";
import { Globe, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { api, type Site } from "@/lib/api";
import { onDataChange } from "@/lib/dataEvents";

type FormState = {
  name: string;
  domain: string;
  subDomain: string;
  routingMode: string;
  isDefault: boolean;
  adminEmail: string;
  adminPassword: string;
};

const emptyForm = (): FormState => ({ name: "", domain: "", subDomain: "", routingMode: "url", isDefault: false, adminEmail: "", adminPassword: "" });

export function Sites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [dialog, setDialog] = useState<null | { mode: "create" | "edit"; site?: Site }>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.sites.list().then(setSites).catch(() => {});

  useEffect(() => {
    load();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/sites")) load();
    });
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setError("");
    setDialog({ mode: "create" });
  }

  function openEdit(s: Site) {
    setForm({ name: s.name, domain: s.domain ?? "", subDomain: s.subDomain ?? "", routingMode: s.routingMode, isDefault: s.isDefault, adminEmail: "", adminPassword: "" });
    setError("");
    setDialog({ mode: "edit", site: s });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (dialog?.mode === "create") {
        const created = await api.sites.create({
          name: form.name, routingMode: form.routingMode, isDefault: form.isDefault,
          domain: form.domain || undefined, subDomain: form.subDomain || undefined,
          adminEmail: form.adminEmail || undefined, adminPassword: form.adminPassword || undefined,
        });
        setSites((prev) => [...prev, created]);
      } else if (dialog?.site) {
        const updated = await api.sites.update(dialog.site.id, { ...form, domain: form.domain || undefined, subDomain: form.subDomain || undefined });
        setSites((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      }
      setDialog(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: Site) {
    if (s.isDefault) { alert("Cannot delete the default site."); return; }
    if (!confirm(`Delete site "${s.name}"? All its data will be removed.`)) return;
    try {
      await api.sites.delete(s.id);
      setSites((prev) => prev.filter((x) => x.id !== s.id));
      const current = sessionStorage.getItem("openweb_site_id");
      if (current && Number(current) === s.id) {
        sessionStorage.removeItem("openweb_site_id");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sites</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage multiple websites from a single database.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" />
          Add site
        </button>
      </div>

      {sites.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
            <Globe className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No sites yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sites.map((s) => (
            <div key={s.id} className="group rounded-2xl border border-border/60 bg-background p-4 hover:border-border hover:shadow-sm transition-all flex items-center gap-4">
              <div className="size-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Globe className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  {s.isDefault && (
                    <span className="text-xs font-medium rounded-full bg-foreground text-background px-2 py-0.5">Default</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.routingMode === "url" ? `URL slug: /${s.slug}` : `Subdomain: ${s.subDomain ?? s.slug}`}
                  {s.domain && ` · ${s.domain}`}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { sessionStorage.setItem("openweb_site_id", String(s.id)); window.location.assign("/admin"); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Open admin panel">
                  <ExternalLink className="size-4 text-muted-foreground" />
                </button>
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Edit">
                  <Pencil className="size-4 text-muted-foreground" />
                </button>
                <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Delete">
                  <Trash2 className="size-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-background rounded-2xl border border-border shadow-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">{dialog.mode === "create" ? "Add site" : "Edit site"}</h2>
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="My Website" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Routing mode</label>
              <select value={form.routingMode} onChange={(e) => setForm((f) => ({ ...f, routingMode: e.target.value }))}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="url">URL-based</option>
                <option value="subdomain">Subdomain</option>
              </select>
            </div>
            {form.routingMode === "subdomain" ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Subdomain</label>
                <input value={form.subDomain} onChange={(e) => setForm((f) => ({ ...f, subDomain: e.target.value }))}
                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="mysite" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Custom domain (optional)</label>
                <input value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="example.com" />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} className="rounded" />
              <span className="text-sm font-medium">Set as default site</span>
            </label>
            {dialog.mode === "create" && (
              <div className="space-y-1.5 border-t border-border/40 pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Site admin (optional)</p>
                <input value={form.adminEmail} onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="admin@example.com" type="email" />
                <input value={form.adminPassword} onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Password" type="password" />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setDialog(null)} className="flex-1 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 rounded-xl bg-foreground text-background py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
