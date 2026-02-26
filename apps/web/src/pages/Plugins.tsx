import { useEffect, useState } from "react";
import { Puzzle, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { api, type Plugin } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { onDataChange } from "@/lib/dataEvents";

export function Plugins() {
  const { user } = useAuth();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Partial<Plugin>>>({});
  const isGlobalAdmin = user?.role === "admin" && user.siteId == null;

  const load = () => api.plugins.list().then(setPlugins).catch(() => {});

  useEffect(() => {
    load();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/plugins")) load();
    });
  }, []);

  function getDraft(p: Plugin): Plugin {
    return { ...p, ...drafts[p.id] };
  }

  function patchDraft(id: number, patch: Partial<Plugin>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const created = await api.plugins.create({ name: newName.trim() });
      setPlugins((prev) => [...prev, created]);
      setNewName("");
      setCreating(false);
      setExpanded(created.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create");
    }
  }

  async function handleSave(p: Plugin) {
    const draft = drafts[p.id] ?? {};
    if (!Object.keys(draft).length) return;
    setSaving(p.id);
    try {
      const updated = await api.plugins.update(p.id, draft);
      setPlugins((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setDrafts((d) => { const n = { ...d }; delete n[p.id]; return n; });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  async function handleToggle(p: Plugin) {
    try {
      const updated = await api.plugins.update(p.id, { enabled: !p.enabled });
      setPlugins((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Toggle failed");
    }
  }

  async function handleDelete(p: Plugin) {
    if (!confirm(`Delete plugin "${p.name}"?`)) return;
    try {
      await api.plugins.delete(p.id);
      setPlugins((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleReload(p: Plugin) {
    if (!confirm("This will restart the server to reload plugins. Continue?")) return;
    try {
      await api.plugins.reload(p.id);
    } catch {
      // Expected — server restarts
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plugins</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isGlobalAdmin
              ? "Install and manage plugins for the selected site."
              : "You can only activate or deactivate plugins for your site."}
          </p>
        </div>
        {isGlobalAdmin && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" />
            Install plugin
          </button>
        )}
      </div>

      {creating && isGlobalAdmin && (
        <div className="rounded-2xl border border-border/60 bg-background p-4 flex gap-2">
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Plugin name"
            className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={handleCreate} className="rounded-xl bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90">Create</button>
          <button onClick={() => setCreating(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
        </div>
      )}

      {plugins.length === 0 && !creating ? (
        <div className="rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
            <Puzzle className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            {isGlobalAdmin ? "No plugins yet. Install one above." : "No plugins are installed for this site yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {plugins.map((p) => {
            const d = getDraft(p);
            const isOpen = expanded === p.id;
            const isDirty = Object.keys(drafts[p.id] ?? {}).length > 0;
            return (
              <div key={p.id} className="rounded-2xl border border-border/60 bg-background hover:border-border transition-all">
                <div className="flex items-center gap-4 p-4">
                  <div className="size-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Puzzle className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <div className="flex gap-1.5 mt-0.5">
                      {p.serverCode && <span className="text-xs rounded-full bg-orange-100 text-orange-700 px-2 py-0.5">Server</span>}
                      {p.clientCode && <span className="text-xs rounded-full bg-blue-100 text-blue-700 px-2 py-0.5">Client</span>}
                    </div>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(p)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${p.enabled ? "bg-foreground" : "bg-muted"}`}
                    title={p.enabled ? "Disable" : "Enable"}
                  >
                    <span className={`inline-block size-3.5 rounded-full bg-background shadow transition-transform ${p.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                  {isGlobalAdmin && (
                    <>
                      <button onClick={() => setExpanded(isOpen ? null : p.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        {isOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                      </button>
                      <button onClick={() => handleDelete(p)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                        <Trash2 className="size-4 text-destructive" />
                      </button>
                    </>
                  )}
                </div>

                {isOpen && isGlobalAdmin && (
                  <div className="border-t border-border/60 p-4 space-y-4">
                    <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                      <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">Server plugins require a server restart to take effect. Use the Reload button after saving.</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Description</label>
                      <input value={d.description ?? ""} onChange={(e) => patchDraft(p.id, { description: e.target.value })}
                        className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Optional description" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Server code <span className="text-muted-foreground font-normal">(Node.js, sandboxed)</span></label>
                      <textarea value={d.serverCode ?? ""} onChange={(e) => patchDraft(p.id, { serverCode: e.target.value })}
                        rows={8} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                        placeholder={`// Available: registerRoute(method, path, handler), db.pages.list(siteId), log.info(msg)\nregisterRoute("GET", "/api/hello", () => ({ hello: "world" }));`} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Client code <span className="text-muted-foreground font-normal">(injected in browser)</span></label>
                      <textarea value={d.clientCode ?? ""} onChange={(e) => patchDraft(p.id, { clientCode: e.target.value })}
                        rows={4} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                        placeholder="console.log('Plugin loaded!');" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(p)} disabled={saving === p.id || !isDirty}
                        className="rounded-xl bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                        {saving === p.id ? "Saving…" : isDirty ? "Save changes" : "Saved"}
                      </button>
                      {p.serverCode && (
                        <button onClick={() => handleReload(p)}
                          className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                          Reload server
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
