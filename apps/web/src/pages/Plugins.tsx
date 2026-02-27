import { useEffect, useState } from "react";
import { AlertTriangle, Puzzle, RefreshCw, Trash2, Upload } from "lucide-react";
import { api, type Plugin } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { onDataChange } from "@/lib/dataEvents";

export function Plugins() {
  const { user } = useAuth();
  const isGlobalAdmin = user?.role === "admin" && user.siteId == null;

  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    api.plugins.list().then(setPlugins).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/plugins")) load();
    });
  }, []);

  async function handleUpload() {
    if (!uploadFile) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const created = await api.plugins.upload(uploadFile);
      setPlugins((prev) => {
        const existing = prev.find((p) => p.id === created.id);
        if (existing) return prev.map((p) => (p.id === created.id ? created : p));
        return [...prev, created];
      });
      setMessage(`Plugin uploaded: ${created.name}`);
      setUploadFile(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(plugin: Plugin) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await api.plugins.update(plugin.id, { enabled: !plugin.enabled });
      setPlugins((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setMessage(`${updated.name} ${updated.enabled ? "enabled" : "disabled"}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(plugin: Plugin) {
    if (!confirm(`Delete plugin "${plugin.name}"? This removes its installed packages from the server.`)) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.plugins.delete(plugin.id);
      setPlugins((prev) => prev.filter((p) => p.id !== plugin.id));
      setMessage(`Plugin deleted: ${plugin.name}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReload(plugin: Plugin) {
    if (!confirm("Restart API server now to reload plugins?")) return;
    setBusy(true);
    setError(null);
    try {
      await api.plugins.reload(plugin.id);
    } catch {
      // API restarts intentionally.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plugins</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Plugins are installed from ZIP files with a required <code>plugin.json</code> manifest.
          </p>
        </div>
      </div>

      {isGlobalAdmin && (
        <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-3">
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
            <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              ZIP must include <code>plugin.json</code> with: name, description, author/authors, version, website.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              disabled={busy}
              className="text-sm"
            />
            <button
              onClick={handleUpload}
              disabled={busy || !uploadFile}
              className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Upload className="size-4" />
              {busy ? "Uploading..." : "Upload plugin ZIP"}
            </button>
            <button
              onClick={load}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <RefreshCw className="size-4" /> Refresh
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      {plugins.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
            <Puzzle className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No plugins installed for this site.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plugins.map((plugin) => (
            <div key={plugin.id} className="rounded-2xl border border-border/60 bg-background p-4">
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Puzzle className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{plugin.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{plugin.description || "No description"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    v{plugin.version ?? "-"} • {plugin.author ?? (plugin.authors?.join(", ") || "-")} • {plugin.website ?? "-"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">slug: {plugin.slug}</p>
                </div>
                <button
                  onClick={() => handleToggle(plugin)}
                  disabled={busy}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${plugin.enabled ? "bg-foreground" : "bg-muted"}`}
                  title={plugin.enabled ? "Disable" : "Enable"}
                >
                  <span className={`inline-block size-3.5 rounded-full bg-background shadow transition-transform ${plugin.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                {isGlobalAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleReload(plugin)}
                      disabled={busy}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
                    >
                      Reload API
                    </button>
                    <button onClick={() => handleDelete(plugin)} disabled={busy} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                      <Trash2 className="size-4 text-destructive" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
