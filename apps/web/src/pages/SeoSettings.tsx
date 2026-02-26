import { useEffect, useState } from "react";
import { api, type SeoConfig, type MediaItem, type SocialProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Globe, Building2, Map, Plus, Trash2, ExternalLink, Image, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Shared helpers ────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function GalleryPickerField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);

  const openGallery = () => {
    api.media.list().then(setMedia).catch(() => {});
    setOpen(true);
  };

  return (
    <>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "https://..."} className="flex-1" />
        <Button type="button" variant="outline" size="sm" onClick={openGallery} className="shrink-0 gap-1.5">
          <Image className="size-3.5" /> Gallery
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} className="shrink-0 px-2">
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      {value && (
        <div className="mt-1.5 rounded border overflow-hidden w-32 h-20 bg-muted">
          <img src={value} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <DialogTitle>Pick from gallery</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {media.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No media uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {media.map((item) => (
                  <button
                    key={item.id}
                    className="group relative rounded overflow-hidden border bg-muted aspect-square hover:border-primary transition-colors"
                    onClick={() => { onChange(item.url); setOpen(false); }}
                  >
                    {item.mimeType.startsWith("image/") ? (
                      <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-2 text-center">{item.filename}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── SeoSettings ───────────────────────────────────────────────────────────────

const BUSINESS_TYPES = ["WebSite", "Organization", "LocalBusiness", "Person"] as const;
const SOCIAL_PLATFORMS = ["Twitter/X", "Facebook", "LinkedIn", "Instagram", "YouTube", "GitHub", "TikTok", "Pinterest", "Other"];

const DEFAULT_ROBOTS = `User-agent: *\nAllow: /\nDisallow: /admin\n`;

export function SeoSettings() {
  const [cfg, setCfg] = useState<SeoConfig>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.siteSettings.get().then((s) => {
      if (s.seoConfig) setCfg(s.seoConfig);
    }).catch(() => {});
  }, []);

  const set = (patch: Partial<SeoConfig>) => setCfg((c) => ({ ...c, ...patch }));

  const save = () => {
    setSaving(true);
    api.siteSettings.update({ seoConfig: cfg })
      .then(() => { setSaved(true); setTimeout(() => setSaved(false), 2500); })
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  const addSocial = () => set({ socialProfiles: [...(cfg.socialProfiles ?? []), { platform: "Twitter/X", url: "" }] });
  const updateSocial = (i: number, patch: Partial<SocialProfile>) => {
    const profiles = [...(cfg.socialProfiles ?? [])];
    profiles[i] = { ...profiles[i], ...patch };
    set({ socialProfiles: profiles });
  };
  const removeSocial = (i: number) => set({ socialProfiles: (cfg.socialProfiles ?? []).filter((_, idx) => idx !== i) });

  const sitemapUrl = `${cfg.siteUrl?.replace(/\/$/, "") || window.location.origin}/sitemap.xml`;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SEO</h1>
          <p className="text-sm text-muted-foreground mt-1">Control how your site appears in search results and social media.</p>
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="w-full">
          <TabsTrigger value="general" className="flex-1 gap-1.5"><Globe className="size-3.5" /> General</TabsTrigger>
          <TabsTrigger value="engines" className="flex-1 gap-1.5"><Search className="size-3.5" /> Search Engines</TabsTrigger>
          <TabsTrigger value="business" className="flex-1 gap-1.5"><Building2 className="size-3.5" /> Business</TabsTrigger>
          <TabsTrigger value="sitemap" className="flex-1 gap-1.5"><Map className="size-3.5" /> Sitemap</TabsTrigger>
        </TabsList>

        {/* ── General ── */}
        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Site Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Sub-site Name" hint="Used in titles for this site: {PageName} - {SubSiteName} - {SiteTagline} - {GlobalSiteName}">
                <Input value={cfg.siteName ?? ""} onChange={(e) => set({ siteName: e.target.value })} placeholder="My Business" />
              </Field>
              <Field label="Global Site Name" hint="Shared brand name used across all sub-sites">
                <Input value={cfg.globalSiteName ?? ""} onChange={(e) => set({ globalSiteName: e.target.value })} placeholder="OpenWeb Network" />
              </Field>
              <Field label="Site Tagline" hint="For homepage: {SubSiteName} - {SiteTagline} - {GlobalSiteName} or {GlobalSiteName} - {SiteTagline}">
                <Input value={cfg.siteSubtitle ?? ""} onChange={(e) => set({ siteSubtitle: e.target.value })} placeholder="We help businesses grow" />
              </Field>
              <Field label="Site URL" hint="Your public domain, e.g. https://example.com — used in sitemap and canonical links">
                <Input value={cfg.siteUrl ?? ""} onChange={(e) => set({ siteUrl: e.target.value })} placeholder="https://example.com" />
              </Field>
              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-xs">Defaults (fallback for pages without custom SEO)</p>
                <Field label="Default Meta Description" hint="160 characters recommended">
                  <textarea
                    value={cfg.defaultDescription ?? ""}
                    onChange={(e) => set({ defaultDescription: e.target.value })}
                    placeholder="A brief description of your website…"
                    rows={3}
                    className={cn(
                      "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none",
                      (cfg.defaultDescription?.length ?? 0) > 160 && "border-destructive"
                    )}
                  />
                  <p className={cn("text-xs mt-0.5", (cfg.defaultDescription?.length ?? 0) > 160 ? "text-destructive" : "text-muted-foreground")}>
                    {cfg.defaultDescription?.length ?? 0}/160
                  </p>
                </Field>
                <Field label="Default OG Image" hint="Social share image. Recommended: 1200×630px">
                  <GalleryPickerField value={cfg.defaultOgImage ?? ""} onChange={(v) => set({ defaultOgImage: v })} placeholder="https://example.com/social.jpg" />
                </Field>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Search Engines ── */}
        <TabsContent value="engines" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search Engine Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                label="Google Search Console"
                hint='Paste only the "content" value from the <meta name="google-site-verification" …> tag'
              >
                <Input
                  value={cfg.googleVerification ?? ""}
                  onChange={(e) => set({ googleVerification: e.target.value })}
                  placeholder="abc123xyz…"
                />
              </Field>
              <Field
                label="Bing Webmaster Tools"
                hint='Paste only the "content" value from the <meta name="msvalidate.01" …> tag'
              >
                <Input
                  value={cfg.bingVerification ?? ""}
                  onChange={(e) => set({ bingVerification: e.target.value })}
                  placeholder="abc123xyz…"
                />
              </Field>
              <Field
                label="Yandex Webmaster"
                hint='Paste only the "content" value from the <meta name="yandex-verification" …> tag'
              >
                <Input
                  value={cfg.yandexVerification ?? ""}
                  onChange={(e) => set({ yandexVerification: e.target.value })}
                  placeholder="abc123xyz…"
                />
              </Field>
              <div className="border-t pt-4">
                <Field
                  label="Google Analytics 4 Measurement ID"
                  hint='Format: G-XXXXXXXXXX — injected automatically on all public pages'
                >
                  <Input
                    value={cfg.googleAnalyticsId ?? ""}
                    onChange={(e) => set({ googleAnalyticsId: e.target.value })}
                    placeholder="G-XXXXXXXXXX"
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Business ── */}
        <TabsContent value="business" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Structured Data (JSON-LD)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Structured data helps search engines understand your business and can enable rich results (star ratings, address cards, etc.).
              </p>
              <Field label="Organization Type">
                <select
                  value={cfg.businessType ?? "WebSite"}
                  onChange={(e) => set({ businessType: e.target.value as SeoConfig["businessType"] })}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Business Name">
                <Input value={cfg.businessName ?? ""} onChange={(e) => set({ businessName: e.target.value })} placeholder="Acme Inc." />
              </Field>
              <Field label="Description">
                <textarea
                  value={cfg.businessDescription ?? ""}
                  onChange={(e) => set({ businessDescription: e.target.value })}
                  placeholder="A short description of your business…"
                  rows={2}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </Field>
              <Field label="Logo URL">
                <GalleryPickerField value={cfg.businessLogo ?? ""} onChange={(v) => set({ businessLogo: v })} placeholder="https://example.com/logo.png" />
              </Field>
            </CardContent>
          </Card>

          {(cfg.businessType === "LocalBusiness" || cfg.businessType === "Organization") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact &amp; Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone">
                    <Input value={cfg.businessPhone ?? ""} onChange={(e) => set({ businessPhone: e.target.value })} placeholder="+1 555 000 0000" />
                  </Field>
                  <Field label="Email">
                    <Input value={cfg.businessEmail ?? ""} onChange={(e) => set({ businessEmail: e.target.value })} placeholder="hello@example.com" />
                  </Field>
                </div>
                <Field label="Street Address">
                  <Input value={cfg.businessStreet ?? ""} onChange={(e) => set({ businessStreet: e.target.value })} placeholder="123 Main St" />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Field label="City">
                      <Input value={cfg.businessCity ?? ""} onChange={(e) => set({ businessCity: e.target.value })} placeholder="San Francisco" />
                    </Field>
                  </div>
                  <Field label="ZIP">
                    <Input value={cfg.businessZip ?? ""} onChange={(e) => set({ businessZip: e.target.value })} placeholder="94105" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="State / Province">
                    <Input value={cfg.businessState ?? ""} onChange={(e) => set({ businessState: e.target.value })} placeholder="CA" />
                  </Field>
                  <Field label="Country">
                    <Input value={cfg.businessCountry ?? ""} onChange={(e) => set({ businessCountry: e.target.value })} placeholder="US" />
                  </Field>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Social Profiles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Helps Google associate your social accounts with your business for the Knowledge Panel.
              </p>
              {(cfg.socialProfiles ?? []).map((profile, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={profile.platform}
                    onChange={(e) => updateSocial(i, { platform: e.target.value })}
                    className="rounded-md border border-input bg-transparent px-2 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-36 shrink-0"
                  >
                    {SOCIAL_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <Input
                    value={profile.url}
                    onChange={(e) => updateSocial(i, { url: e.target.value })}
                    placeholder="https://twitter.com/yourhandle"
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="sm" className="px-2 shrink-0" onClick={() => removeSocial(i)}>
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addSocial} className="gap-1.5">
                <Plus className="size-3.5" /> Add social profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Sitemap & Robots ── */}
        <TabsContent value="sitemap" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sitemap</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enable-sitemap"
                  checked={cfg.enableSitemap !== false}
                  onChange={(e) => set({ enableSitemap: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="enable-sitemap">Enable sitemap.xml</Label>
              </div>
              <div className="rounded-lg bg-muted/50 border p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Sitemap URL</p>
                  <p className="text-sm font-mono truncate">{sitemapUrl}</p>
                </div>
                <a href={sitemapUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="gap-1.5 shrink-0">
                    <ExternalLink className="size-3.5" /> View
                  </Button>
                </a>
              </div>
              <div className="flex gap-2 flex-wrap">
                <a
                  href={`https://search.google.com/search-console`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="size-3.5" /> Submit to Google
                  </Button>
                </a>
                <a
                  href="https://www.bing.com/webmasters"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="size-3.5" /> Submit to Bing
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Robots.txt</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => set({ robotsTxt: "" })}
                >
                  Use default
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Leave blank to use the auto-generated default. Custom rules override it completely.
              </p>
              <textarea
                value={cfg.robotsTxt ?? ""}
                onChange={(e) => set({ robotsTxt: e.target.value })}
                placeholder={DEFAULT_ROBOTS}
                rows={8}
                spellCheck={false}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              />
              <div className="flex justify-end">
                <a href="/robots.txt" target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                    <ExternalLink className="size-3.5" /> View robots.txt
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
