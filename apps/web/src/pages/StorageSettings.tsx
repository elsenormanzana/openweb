import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Check, LogIn } from "lucide-react";

type ProviderDef = {
  id: string;
  label: string;
  desc: string;
  fields: string[];
  oauth?: boolean;
};

const PROVIDERS: ProviderDef[] = [
  { id: "local", label: "Local", desc: "Files stored on your server", fields: [] },
  { id: "s3", label: "AWS S3", desc: "Amazon S3 bucket", fields: ["bucket", "region", "accessKeyId", "secretAccessKey"] },
  { id: "firebase", label: "Firebase Storage", desc: "Google Firebase", fields: ["storageBucket", "apiKey", "projectId"] },
  { id: "google-drive", label: "Google Drive", desc: "OAuth sign-in", fields: ["clientId", "clientSecret", "folderId"], oauth: true },
  { id: "google-photos", label: "Google Photos", desc: "OAuth sign-in", fields: ["clientId", "clientSecret", "albumId"], oauth: true },
];

export function StorageSettings() {
  const [provider, setProvider] = useState("local");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<{ connected: boolean; hasRefreshToken: boolean } | null>(null);

  const loadOAuthStatus = useCallback(() => {
    if (provider === "google-drive" || provider === "google-photos") {
      fetch("/api/oauth/google/status").then((r) => r.json()).then(setOauthStatus).catch(() => setOauthStatus(null));
    } else {
      setOauthStatus(null);
    }
  }, [provider]);

  useEffect(() => {
    api.storageConfig.get()
      .then((s) => { setProvider(s.provider); setConfig(s.config ?? {}); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(loadOAuthStatus, [loadOAuthStatus]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === "google-oauth-done") {
        loadOAuthStatus();
        api.storageConfig.get().then((s) => setConfig(s.config ?? {})).catch(() => {});
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [loadOAuthStatus]);

  const save = () => {
    setSaving(true); setError(null); setSaved(false);
    api.storageConfig.update({ provider, config })
      .then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); loadOAuthStatus(); })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  const startOAuth = () => {
    if (!config.clientId || !config.clientSecret) {
      setError("Enter your Client ID and Client Secret, then click Save before signing in.");
      return;
    }
    window.open("/api/oauth/google/start", "google-oauth", "width=500,height=600,popup=yes");
  };

  const current = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];
  const isGoogle = provider === "google-drive" || provider === "google-photos";

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6 max-w-xl">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Storage</h1>
      <p className="text-muted-foreground mt-1 text-sm">Choose where uploaded media files are stored.</p>
    </div>
    <Card>
      <CardHeader>
        <CardTitle>Storage provider</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvider(p.id)}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors",
                provider === p.id ? "border-foreground bg-muted" : "border-border hover:border-foreground/30"
              )}
            >
              <span className="font-medium block">{p.label}</span>
              <span className="text-[10px] text-muted-foreground">{p.desc}</span>
            </button>
          ))}
        </div>

        {current.fields.length > 0 && (
          <div className="space-y-3 pt-2 border-t">
            {isGoogle && (
              <p className="text-xs text-muted-foreground">
                Create an OAuth 2.0 Client in your <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a>.
                Set the redirect URI to <code className="bg-muted px-1 rounded text-[10px]">{window.location.origin.replace(/:\d+$/, ':3000')}/api/oauth/google/callback</code>
              </p>
            )}
            {current.fields.map((f) => (
              <div key={f} className="space-y-1">
                <Label className="text-xs">{f}</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  type={f.toLowerCase().includes("secret") ? "password" : "text"}
                  placeholder={f}
                  value={config[f] ?? ""}
                  onChange={(e) => setConfig({ ...config, [f]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}

        {provider === "local" && (
          <p className="text-xs text-muted-foreground border-t pt-3">Files are saved to the <code className="bg-muted px-1 rounded">uploads/</code> folder on your server. No extra configuration needed.</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : saved ? "Saved!" : "Save storage settings"}
          </Button>

          {isGoogle && (
            <Button variant="outline" onClick={startOAuth} disabled={!config.clientId || !config.clientSecret}>
              <LogIn className="size-4 mr-1.5" />
              Sign in with Google
            </Button>
          )}
        </div>

        {isGoogle && oauthStatus && (
          <div className={cn("rounded-lg border p-3 text-sm", oauthStatus.connected ? "border-green-500/40 bg-green-50 dark:bg-green-950/20" : "border-border bg-muted/30")}>
            {oauthStatus.connected ? (
              <span className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Check className="size-4" /> Google account connected
                {oauthStatus.hasRefreshToken && <span className="text-[10px] text-muted-foreground ml-auto">refresh token stored</span>}
              </span>
            ) : (
              <span className="text-muted-foreground">Not connected — save your credentials then click "Sign in with Google"</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
