import { useEffect, useMemo, useState } from "react";
import { api, type NginxSslServerConfig, type SslAutoRenewStatus, type SslCertificate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, ShieldCheck, Trash2 } from "lucide-react";

export function SslCertificatesAdmin() {
  const [items, setItems] = useState<SslCertificate[]>([]);
  const [domain, setDomain] = useState("");
  const [provider, setProvider] = useState<"letsencrypt" | "cloudflared">("letsencrypt");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [organizationUnit, setOrganizationUnit] = useState("");
  const [webrootPath, setWebrootPath] = useState("/var/www/certbot");
  const [certificatePem, setCertificatePem] = useState("");
  const [privateKeyPem, setPrivateKeyPem] = useState("");
  const [staging, setStaging] = useState(false);
  const [mode, setMode] = useState<"webroot" | "standalone">("webroot");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastOutput, setLastOutput] = useState<{ stdout: string; stderr: string } | null>(null);
  const [autoRenew, setAutoRenew] = useState<SslAutoRenewStatus | null>(null);
  const [renewBusy, setRenewBusy] = useState(false);
  const [nginxServers, setNginxServers] = useState<NginxSslServerConfig[]>([]);
  const [nginxManagedPath, setNginxManagedPath] = useState("");
  const [nginxBaseDomain, setNginxBaseDomain] = useState<string | null>(null);
  const [nginxBusy, setNginxBusy] = useState(false);
  const [applyResult, setApplyResult] = useState<{ path: string; hosts: string[]; reloadCommand: string; configPreview: string } | null>(null);
  const [nginxDraftHosts, setNginxDraftHosts] = useState<Record<number, string>>({});
  const [nginxSavingSiteId, setNginxSavingSiteId] = useState<number | null>(null);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);

  const sorted = useMemo(() => [...items].sort((a, b) => (a.domain < b.domain ? -1 : 1)), [items]);
  const certificateHosts = useMemo(() => {
    const all = items.flatMap((c) => (c.domains?.length ? c.domains : [c.domain]));
    return new Set(all.map((h) => h.toLowerCase()));
  }, [items]);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.ssl.list(),
      api.ssl.autoRenew.status(),
      api.nginx.sslServers.list(),
    ])
      .then(([certs, renew, nginx]) => {
        setItems(certs);
        setAutoRenew(renew);
        setNginxServers(nginx.items);
        setNginxDraftHosts(Object.fromEntries(nginx.items.map((item) => [item.siteId, item.host])));
        setNginxManagedPath(nginx.managedConfigPath);
        setNginxBaseDomain(nginx.baseDomain);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const createCertificate = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.ssl.create({
        domain: domain.trim(),
        provider,
        email: provider === "letsencrypt" ? email.trim() : undefined,
        organization: organization.trim() || undefined,
        organizationUnit: organizationUnit.trim() || undefined,
        staging,
        mode: provider === "letsencrypt" ? mode : undefined,
        webrootPath: provider === "letsencrypt" && mode === "webroot" ? webrootPath.trim() : undefined,
        certificatePem: provider === "cloudflared" ? certificatePem : undefined,
        privateKeyPem: provider === "cloudflared" ? privateKeyPem : undefined,
      });
      setSuccess(`Certificate created for ${res.certificate.domain} (${res.certificate.provider}).`);
      setLastOutput(res.output);
      setDomain("");
      if (provider === "cloudflared") {
        setCertificatePem("");
        setPrivateKeyPem("");
      }
      setItems((prev) => {
        const rest = prev.filter((item) => item.domain !== res.certificate.domain);
        return [res.certificate, ...rest];
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const deleteCertificate = async (cert: SslCertificate) => {
    if (!confirm(`Delete SSL certificate for ${cert.domain}?`)) return;
    setDeletingDomain(cert.domain);
    setError(null);
    setSuccess(null);
    try {
      await api.ssl.delete(cert.domain);
      setItems((prev) => prev.filter((x) => x.domain !== cert.domain));
      setSuccess(`Deleted certificate for ${cert.domain}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingDomain(null);
    }
  };

  const downloadCertFile = async (cert: SslCertificate, file: "fullchain.pem" | "privkey.pem" | "openweb-meta.json") => {
    setError(null);
    try {
      const blob = await api.ssl.downloadFile(cert.domain, file);
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${cert.domain}-${file}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      setSuccess(`Download started: ${cert.domain}-${file}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const runRenewNow = async (dryRun = false) => {
    setRenewBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.ssl.autoRenew.runNow({ dryRun });
      const status = await api.ssl.autoRenew.status();
      setAutoRenew(status);
      if (res.output) setLastOutput(res.output);
      setSuccess(res.skipped ? (res.reason ?? "Renew skipped.") : (dryRun ? "Dry run completed." : "Renew completed."));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRenewBusy(false);
    }
  };

  const updateNginxServer = async (siteId: number, patch: { host?: string; enabled?: boolean }) => {
    setNginxBusy(true);
    setNginxSavingSiteId(siteId);
    setError(null);
    try {
      const updated = await api.nginx.sslServers.update(siteId, patch);
      setNginxServers((prev) => prev.map((item) => (item.siteId === updated.siteId ? updated : item)));
      setNginxDraftHosts((prev) => ({ ...prev, [siteId]: updated.host }));
      setSuccess(`Saved SSL server settings for ${updated.siteName}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setNginxBusy(false);
      setNginxSavingSiteId(null);
    }
  };

  const applyNginxConfig = async () => {
    setNginxBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.nginx.sslServers.apply();
      setApplyResult(res);
      setSuccess("Managed NGINX SSL config generated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setNginxBusy(false);
    }
  };

  const suggestHost = (server: NginxSslServerConfig) => {
    if (server.domain?.trim()) return server.domain.trim().toLowerCase();
    if (server.subDomain?.trim() && nginxBaseDomain?.trim()) return `${server.subDomain.trim().toLowerCase()}.${nginxBaseDomain.trim().toLowerCase()}`;
    return "";
  };

  const getDraftHost = (server: NginxSslServerConfig) => (nginxDraftHosts[server.siteId] ?? server.host ?? "").trim();

  const enabledServers = nginxServers.filter((s) => s.enabled);
  const enabledWithoutCert = enabledServers.filter((s) => {
    const host = (nginxDraftHosts[s.siteId] ?? s.host ?? "").trim().toLowerCase();
    return host.length > 0 && !certificateHosts.has(host);
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SSL Certificates</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Generate and view Let&apos;s Encrypt certificates. This section is available to global admins only.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create certificate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sslProvider">Provider</Label>
              <select
                id="sslProvider"
                value={provider}
                onChange={(e) => setProvider(e.target.value === "cloudflared" ? "cloudflared" : "letsencrypt")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={busy}
              >
                <option value="letsencrypt">Let&apos;s Encrypt</option>
                <option value="cloudflared">Cloudflared / Cloudflare Origin</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sslDomain">Domain</Label>
              <Input
                id="sslDomain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com, www.example.com"
                disabled={busy}
              />
            </div>
            {provider === "letsencrypt" && (
              <div className="space-y-1.5">
              <Label htmlFor="sslEmail">Email</Label>
              <Input
                id="sslEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={busy}
              />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="sslOrg">Organization (optional)</Label>
              <Input
                id="sslOrg"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Acme Inc"
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sslOrgUnit">Organization Unit (optional)</Label>
              <Input
                id="sslOrgUnit"
                value={organizationUnit}
                onChange={(e) => setOrganizationUnit(e.target.value)}
                placeholder="Platform Team"
                disabled={busy}
              />
            </div>
          </div>

          {provider === "letsencrypt" && (
            <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sslMode">Validation mode</Label>
              <select
                id="sslMode"
                value={mode}
                onChange={(e) => setMode(e.target.value === "standalone" ? "standalone" : "webroot")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={busy}
              >
                <option value="webroot">Webroot</option>
                <option value="standalone">Standalone</option>
              </select>
            </div>
            {mode === "webroot" && (
              <div className="space-y-1.5">
                <Label htmlFor="sslWebroot">Webroot path</Label>
                <Input
                  id="sslWebroot"
                  value={webrootPath}
                  onChange={(e) => setWebrootPath(e.target.value)}
                  placeholder="/var/www/certbot"
                  disabled={busy}
                />
              </div>
            )}
            </div>
          )}

          {provider === "cloudflared" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sslCertPem">Certificate PEM</Label>
                <textarea
                  id="sslCertPem"
                  value={certificatePem}
                  onChange={(e) => setCertificatePem(e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE-----"
                  className="w-full min-h-28 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
                  disabled={busy}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sslKeyPem">Private Key PEM</Label>
                <textarea
                  id="sslKeyPem"
                  value={privateKeyPem}
                  onChange={(e) => setPrivateKeyPem(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----"
                  className="w-full min-h-28 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
                  disabled={busy}
                />
              </div>
            </div>
          )}

          {provider === "letsencrypt" && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={staging}
                onChange={(e) => setStaging(e.target.checked)}
                disabled={busy}
              />
              Use Let&apos;s Encrypt staging environment (recommended for first test)
            </label>
          )}

          <div className="flex gap-2">
            <Button
              onClick={createCertificate}
              disabled={
                busy
                || !domain.trim()
                || (provider === "letsencrypt" && !email.trim())
                || (provider === "cloudflared" && (!certificatePem.trim() || !privateKeyPem.trim()))
              }
            >
              <ShieldCheck className="size-4 mr-1.5" />
              {busy ? "Creating..." : "Create certificate"}
            </Button>
            <Button variant="outline" onClick={load} disabled={busy || loading}>
              <RefreshCw className="size-4 mr-1.5" />
              Refresh
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}
          {lastOutput && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium">Last command output</p>
              {lastOutput.stderr && <pre className="text-xs whitespace-pre-wrap text-destructive">{lastOutput.stderr}</pre>}
              {lastOutput.stdout && <pre className="text-xs whitespace-pre-wrap">{lastOutput.stdout}</pre>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Installed certificates</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading certificates...</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No certificates found.</p>
          ) : (
            <div className="space-y-2">
              {sorted.map((cert) => (
                <div key={cert.domain} className="rounded-lg border border-border/60 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{cert.domain}</p>
                    <button
                      className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      onClick={() => deleteCertificate(cert)}
                      disabled={deletingDomain === cert.domain}
                    >
                      <Trash2 className="size-3.5" />
                      {deletingDomain === cert.domain ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Provider: {cert.provider}{cert.organization ? ` · Org: ${cert.organization}` : ""}{cert.organizationUnit ? ` · OU: ${cert.organizationUnit}` : ""}
                  </p>
                  {cert.domains?.length > 1 && (
                    <p className="text-xs text-muted-foreground">Covers: {cert.domains.join(", ")}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Expires: {cert.expiresAt ? new Date(cert.expiresAt).toLocaleString() : "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono break-all">fullchain: {cert.fullchainPath}</p>
                  <p className="text-xs text-muted-foreground font-mono break-all">privkey: {cert.privkeyPath}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                      onClick={() => downloadCertFile(cert, "fullchain.pem")}
                    >
                      Download fullchain.pem
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                      onClick={() => downloadCertFile(cert, "privkey.pem")}
                    >
                      Download privkey.pem
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                      onClick={() => downloadCertFile(cert, "openweb-meta.json")}
                    >
                      Download metadata
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SSL Auto Renew</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {autoRenew ? (
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                Auto renew: <span className="font-medium text-foreground">{autoRenew.enabled ? "Enabled" : "Disabled"}</span>
                {" "}every {autoRenew.intervalHours}h
              </p>
              <p className="text-muted-foreground">Last run: {autoRenew.state.lastRunAt ? new Date(autoRenew.state.lastRunAt).toLocaleString() : "Never"}</p>
              <p className="text-muted-foreground">Last success: {autoRenew.state.lastSuccessAt ? new Date(autoRenew.state.lastSuccessAt).toLocaleString() : "Never"}</p>
              {autoRenew.state.lastError && <p className="text-destructive">Last error: {autoRenew.state.lastError}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading renew status...</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => runRenewNow(true)} disabled={renewBusy}>
              {renewBusy ? "Running..." : "Run dry-renew now"}
            </Button>
            <Button onClick={() => runRenewNow(false)} disabled={renewBusy}>
              {renewBusy ? "Running..." : "Run renew now"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>NGINX SSL Servers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enable HTTPS server blocks per site domain/subdomain. Base domain: {nginxBaseDomain || "not set"}.
          </p>
          <p className="text-xs text-muted-foreground font-mono break-all">Managed config path: {nginxManagedPath || "n/a"}</p>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{enabledServers.length}</span> enabled
            {" · "}
            <span className={enabledWithoutCert.length > 0 ? "text-destructive font-medium" : ""}>
              {enabledWithoutCert.length}
            </span> enabled without local certificate
          </div>

          <div className="space-y-2">
            {nginxServers.map((server) => (
              <div key={server.siteId} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm font-medium">{server.siteName}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] rounded-full px-2 py-0.5 border ${server.enabled ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-border text-muted-foreground"}`}>
                      {server.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <span className={`text-[11px] rounded-full px-2 py-0.5 border ${certificateHosts.has(getDraftHost(server).toLowerCase()) ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-amber-300 text-amber-700 bg-amber-50"}`}>
                      {certificateHosts.has(getDraftHost(server).toLowerCase()) ? "Cert Found" : "No Cert"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Domain: {server.domain ?? "none"} · Subdomain: {server.subDomain ?? "none"}
                  </p>
                  <label className="text-xs flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={server.enabled}
                      disabled={nginxBusy}
                      onChange={(e) => updateNginxServer(server.siteId, { enabled: e.target.checked })}
                    />
                    Enabled
                  </label>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={nginxDraftHosts[server.siteId] ?? server.host}
                    disabled={nginxBusy}
                    onChange={(e) => setNginxDraftHosts((prev) => ({ ...prev, [server.siteId]: e.target.value }))}
                    placeholder="example.com"
                  />
                  <Button
                    variant="outline"
                    disabled={nginxBusy || !suggestHost(server)}
                    onClick={() => setNginxDraftHosts((prev) => ({ ...prev, [server.siteId]: suggestHost(server) }))}
                  >
                    Use Suggested
                  </Button>
                  <Button
                    disabled={nginxBusy || (getDraftHost(server) === (server.host ?? "").trim())}
                    onClick={() => updateNginxServer(server.siteId, { host: getDraftHost(server) })}
                  >
                    {nginxSavingSiteId === server.siteId ? "Saving..." : "Save Host"}
                  </Button>
                </div>
                {suggestHost(server) && getDraftHost(server) !== suggestHost(server) && (
                  <p className="text-[11px] text-muted-foreground">Suggested host: {suggestHost(server)}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={nginxBusy || loading}>
              <RefreshCw className="size-4 mr-1.5" />
              Refresh
            </Button>
            <Button onClick={applyNginxConfig} disabled={nginxBusy || enabledWithoutCert.length > 0}>
              {nginxBusy ? "Applying..." : "Apply managed NGINX SSL config"}
            </Button>
          </div>
          {enabledWithoutCert.length > 0 && (
            <p className="text-xs text-destructive">
              Cannot apply while enabled hosts are missing certificates: {enabledWithoutCert.map((s) => getDraftHost(s) || s.siteName).join(", ")}
            </p>
          )}

          {applyResult && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium">Applied</p>
              <p className="text-xs text-muted-foreground font-mono break-all">Path: {applyResult.path}</p>
              <p className="text-xs text-muted-foreground">Hosts: {applyResult.hosts.length ? applyResult.hosts.join(", ") : "none enabled"}</p>
              <p className="text-xs text-muted-foreground">{applyResult.reloadCommand}</p>
              <pre className="text-xs whitespace-pre-wrap">{applyResult.configPreview}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
