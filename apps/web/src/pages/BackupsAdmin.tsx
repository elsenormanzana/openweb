import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type BackupItem } from "@/lib/api";
import { Download, RefreshCw, Upload } from "lucide-react";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function BackupsAdmin() {
  const [items, setItems] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [items]
  );

  const load = () => {
    setLoading(true);
    api.backups
      .list()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const createBackup = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.backups.create();
      setItems((prev) => [res.backup, ...prev]);
      setSuccess(`Backup created: ${res.backup.name}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const downloadBackup = async (name: string) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const blob = await api.backups.download(name);
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      setSuccess(`Download started: ${name}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const restoreBackup = async () => {
    if (!restoreFile) {
      setError("Choose a .zip backup file first.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await api.backups.restore(restoreFile);
      setSuccess("Backup restored successfully.");
      setRestoreFile(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backups</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Create ZIP backups, download them, and restore by uploading a ZIP backup file.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Includes database dump, uploads folder, and a code snapshot.
          </p>
          <div className="flex gap-2">
            <Button onClick={createBackup} disabled={busy}>
              {busy ? "Creating..." : "Create ZIP backup"}
            </Button>
            <Button variant="outline" onClick={load} disabled={busy || loading}>
              <RefreshCw className="size-4 mr-1.5" /> Refresh list
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Restore backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backupZip">Backup ZIP file</Label>
            <Input
              id="backupZip"
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
              disabled={busy}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Restore replaces database content and uploads with the selected backup.
          </p>
          <Button variant="destructive" onClick={restoreBackup} disabled={busy || !restoreFile}>
            <Upload className="size-4 mr-1.5" /> {busy ? "Restoring..." : "Upload & restore ZIP"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available backups</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading backups…</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No backups yet.</p>
          ) : (
            <div className="space-y-2">
              {sorted.map((item) => (
                <div key={item.name} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()} • {formatBytes(item.size)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => downloadBackup(item.name)} disabled={busy}>
                    <Download className="size-4 mr-1.5" /> Download
                  </Button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {success && <p className="mt-3 text-sm text-emerald-600">{success}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
