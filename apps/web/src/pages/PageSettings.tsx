import { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, type MediaItem } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { Search, Image, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildHomepageTitle, buildPageTitle } from "@/lib/seoTitle";

// ── Google Snippet Preview ─────────────────────────────────────────────────────

function SnippetPreview({ title, description, url }: { title: string; description: string; url: string }) {
  const t = title.length > 60 ? title.slice(0, 57) + "…" : title;
  const d = description.length > 160 ? description.slice(0, 157) + "…" : description;
  return (
    <div className="rounded-lg border bg-white p-4 font-sans text-sm shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className="size-5 rounded-full bg-muted flex-shrink-0" />
        <div>
          <p className="text-xs leading-tight text-[#202124] font-medium">{url || "example.com"}</p>
        </div>
      </div>
      <p className="text-[#1a0dab] text-lg leading-snug hover:underline cursor-pointer">{t || "Page Title"}</p>
      <p className="text-[#4d5156] text-sm mt-1 leading-relaxed">{d || "No description. Add a meta description to improve click-through rates from search results."}</p>
    </div>
  );
}

// ── Gallery image picker ───────────────────────────────────────────────────────

function OgImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);

  const openGallery = () => {
    api.media.list().then(setMedia).catch(() => {});
    setOpen(true);
  };

  return (
    <>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or pick from gallery" className="flex-1" />
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

// ── PageSettings ───────────────────────────────────────────────────────────────

export function PageSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pageId = Number(id);
  const idValid = !Number.isNaN(pageId);

  // Page settings
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [isHomepage, setIsHomepage] = useState(false);
  const [ignoreGlobalLayout, setIgnoreGlobalLayout] = useState(false);

  // SEO fields
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [noIndex, setNoIndex] = useState(false);
  const [canonicalUrl, setCanonicalUrl] = useState("");

  // Site info for snippet preview
  const [siteName, setSiteName] = useState("");
  const [siteSubtitle, setSiteSubtitle] = useState("");
  const [globalSiteName, setGlobalSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [defaultDescription, setDefaultDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleChangedByUser = useRef(false);

  useEffect(() => {
    if (!idValid) { setLoading(false); return; }
    Promise.all([api.pages.get(pageId), api.siteSettings.get()])
      .then(([data, settings]) => {
        setTitle(data.title);
        setSlug(data.slug);
        setIsHomepage(data.isHomepage);
        setIgnoreGlobalLayout(data.ignoreGlobalLayout ?? false);
        setSeoTitle(data.seoTitle ?? "");
        setSeoDescription(data.seoDescription ?? "");
        setSeoKeywords(data.seoKeywords ?? "");
        setOgImage(data.ogImage ?? "");
        setNoIndex(data.noIndex ?? false);
        setCanonicalUrl(data.canonicalUrl ?? "");
        setSiteName(settings.seoConfig?.siteName ?? "");
        setSiteSubtitle(settings.seoConfig?.siteSubtitle ?? "");
        setGlobalSiteName(settings.seoConfig?.globalSiteName ?? "");
        setSiteUrl(settings.seoConfig?.siteUrl ?? "");
        setDefaultDescription(settings.seoConfig?.defaultDescription ?? "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [pageId, idValid]);

  useEffect(() => {
    if (titleChangedByUser.current && !slugTouched && title) setSlug(slugify(title));
  }, [title, slugTouched]);

  const computedTitle = (() => {
    const seo = { siteName, siteSubtitle, globalSiteName };
    const previewPage = {
      seoTitle: seoTitle || null,
      title,
    };
    if (isHomepage) return buildHomepageTitle(previewPage, seo);
    return buildPageTitle(previewPage, seo);
  })();

  const computedUrl = `${siteUrl.replace(/\/$/, "") || window.location.origin}/${isHomepage ? "" : slug}`;
  const computedDescription = seoDescription || defaultDescription;

  const save = () => {
    if (!idValid) return;
    setSaving(true);
    setError(null);
    api.pages
      .update(pageId, {
        title, slug, isHomepage, ignoreGlobalLayout,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        seoKeywords: seoKeywords || null,
        ogImage: ogImage || null,
        noIndex,
        canonicalUrl: canonicalUrl || null,
      })
      .then(() => {
        setSaving(false);
        navigate("/admin/pages", { replace: true });
      })
      .catch((e) => {
        setError(e.message);
        setSaving(false);
      });
  };

  if (!idValid) return <p className="text-destructive">Invalid page ID.</p>;
  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div className="max-w-xl space-y-5">
      {/* Page settings */}
      <Card>
        <CardHeader>
          <CardTitle>Page settings</CardTitle>
          <p className="text-sm text-muted-foreground">Title, slug, and layout options.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                titleChangedByUser.current = true;
                setTitle(e.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL path)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder={slugify(title) || "about"}
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is-homepage" checked={isHomepage} onChange={(e) => setIsHomepage(e.target.checked)} />
            <Label htmlFor="is-homepage">Set as homepage</Label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ignore-global-layout" checked={ignoreGlobalLayout} onChange={(e) => setIgnoreGlobalLayout(e.target.checked)} />
            <Label htmlFor="ignore-global-layout">Ignore global layout</Label>
          </div>
          <p className="text-xs text-muted-foreground">When checked, this page does not use the site's global navigation or footer.</p>
          <Button asChild variant="outline" size="sm">
            <Link to={`/admin/pages/${pageId}/editor`}>Open web editor</Link>
          </Button>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-4" /> SEO
          </CardTitle>
          <p className="text-sm text-muted-foreground">Control how this page appears in search results and social sharing.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Snippet preview */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Google Preview</Label>
            <SnippetPreview title={computedTitle} description={computedDescription} url={computedUrl} />
          </div>

          {/* SEO Title */}
          <div className="space-y-1.5">
            <Label htmlFor="seo-title">SEO Title</Label>
            <Input
              id="seo-title"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder={isHomepage
                ? `${siteName || globalSiteName}${siteSubtitle ? ` - ${siteSubtitle}` : ""}${globalSiteName && siteName ? ` - ${globalSiteName}` : ""}`
                : `${title}${siteName ? ` - ${siteName}` : ""}${siteSubtitle ? ` - ${siteSubtitle}` : ""}${globalSiteName ? ` - ${globalSiteName}` : ""}`
              }
            />
            <p className={cn("text-xs", seoTitle.length > 60 ? "text-destructive" : "text-muted-foreground")}>
              {seoTitle.length}/60 — leave blank to use the auto-formatted title
            </p>
          </div>

          {/* Meta description */}
          <div className="space-y-1.5">
            <Label htmlFor="seo-desc">Meta Description</Label>
            <textarea
              id="seo-desc"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder={defaultDescription || "A brief description of this page for search results…"}
              rows={3}
              className={cn(
                "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none",
                seoDescription.length > 160 && "border-destructive"
              )}
            />
            <p className={cn("text-xs", seoDescription.length > 160 ? "text-destructive" : "text-muted-foreground")}>
              {seoDescription.length}/160
            </p>
          </div>

          {/* Keywords */}
          <div className="space-y-1.5">
            <Label htmlFor="seo-keywords">Keywords</Label>
            <Input
              id="seo-keywords"
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
              placeholder="business, services, location…"
            />
            <p className="text-xs text-muted-foreground">Comma-separated. Optional — Bing and some engines still use these.</p>
          </div>

          {/* OG Image */}
          <div className="space-y-1.5">
            <Label>Social Share Image (OG Image)</Label>
            <OgImageField value={ogImage} onChange={setOgImage} />
            <p className="text-xs text-muted-foreground">Recommended: 1200×630px. Shown when sharing on social media.</p>
          </div>

          {/* Canonical URL */}
          <div className="space-y-1.5">
            <Label htmlFor="canonical">Canonical URL</Label>
            <Input
              id="canonical"
              value={canonicalUrl}
              onChange={(e) => setCanonicalUrl(e.target.value)}
              placeholder={computedUrl}
            />
            <p className="text-xs text-muted-foreground">Leave blank to use the default page URL. Only set if this page has a canonical version elsewhere.</p>
          </div>

          {/* noIndex */}
          <div className="rounded-lg border p-3 flex items-start gap-3">
            <input
              type="checkbox"
              id="no-index"
              checked={noIndex}
              onChange={(e) => setNoIndex(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="no-index" className="font-medium">Hide from search engines (noindex)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">When enabled, this page won't appear in Google, Bing, or other search results. Also excludes it from the sitemap.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
        <Button asChild variant="ghost">
          <Link to="/admin/pages">Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
