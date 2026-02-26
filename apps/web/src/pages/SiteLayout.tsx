import { useEffect, useState, useId, Children, cloneElement, type ReactElement, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type NavLink, type FooterColumn, type NavConfig, type NavMenuItem } from "@/lib/api";
import { Trash2, Plus, X } from "lucide-react";
import { DEFAULT_PALETTE, PALETTE_KEYS, type ColorPalette } from "@/lib/palette";
import { MediaPicker } from "@/components/MediaPicker";

type NavVariant = NonNullable<NavConfig["navVariant"]>;

function normalizeNavLinks(items: unknown): NavMenuItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (!item || typeof item !== "object") return { label: "", href: "" };
    const raw = item as Record<string, unknown>;
    const legacyHref = typeof raw.href === "string" ? raw.href : "";
    const dropdown = Array.isArray(raw.dropdown)
      ? raw.dropdown.map((group) => {
          if (!group || typeof group !== "object") return { title: "", links: [] };
          const g = group as Record<string, unknown>;
          const links = Array.isArray(g.links)
            ? g.links.map((entry) => {
                if (!entry || typeof entry !== "object") return { label: "", href: "" };
                const e = entry as Record<string, unknown>;
                const children = Array.isArray(e.children)
                  ? e.children.map((child) => {
                      if (!child || typeof child !== "object") return { label: "", href: "" };
                      const c = child as Record<string, unknown>;
                      return {
                        label: typeof c.label === "string" ? c.label : "",
                        href: typeof c.href === "string" ? c.href : "",
                      };
                    })
                  : [];
                return {
                  label: typeof e.label === "string" ? e.label : "",
                  href: typeof e.href === "string" ? e.href : "",
                  title: typeof e.title === "string" ? e.title : "",
                  children,
                };
              })
            : [];
          return {
            title: typeof g.title === "string" ? g.title : "",
            links,
          };
        })
      : [];
    return {
      label: typeof raw.label === "string" ? raw.label : "",
      href: legacyHref,
      dropdown,
    };
  });
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const single = Children.count(children) === 1;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={single ? id : undefined} className="text-xs font-medium">{label}</Label>
      {single ? cloneElement(children as ReactElement<{ id?: string }>, { id }) : children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} className="h-9 w-14 cursor-pointer rounded border border-input p-0.5" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#000000" className="flex-1" />
      </div>
    </Field>
  );
}

export function SiteLayout() {
  const [navType, setNavType] = useState("navbar");
  const [navVariant, setNavVariant] = useState<NavVariant>("minimal");
  const [logoText, setLogoText] = useState("Logo");
  const [logoImage, setLogoImage] = useState("");
  const [logoHref, setLogoHref] = useState("/");
  const [navLinks, setNavLinks] = useState<NavMenuItem[]>([]);
  const [headerStyle, setHeaderStyle] = useState<"transparent" | "solid">("solid");
  const [headerBg, setHeaderBg] = useState("#ffffff");
  const [headerTextColor, setHeaderTextColor] = useState("#000000");
  const [ctaPrimaryText, setCtaPrimaryText] = useState("");
  const [ctaPrimaryHref, setCtaPrimaryHref] = useState("");
  const [ctaSecondaryText, setCtaSecondaryText] = useState("");
  const [ctaSecondaryHref, setCtaSecondaryHref] = useState("");
  const [heroBadge, setHeroBadge] = useState("");
  const [heroHeadline, setHeroHeadline] = useState("");
  const [heroDescription, setHeroDescription] = useState("");
  const [palette, setPalette] = useState<ColorPalette>(DEFAULT_PALETTE);
  const [copyright, setCopyright] = useState("");
  const [footerLinks, setFooterLinks] = useState<NavLink[]>([]);
  const [footerColumns, setFooterColumns] = useState<FooterColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.siteSettings
      .get()
      .then((s) => {
        setNavType(s.navType ?? "navbar");
        setNavVariant((s.navConfig?.navVariant as NavVariant) ?? "minimal");
        setLogoText(s.navConfig?.logoText ?? "Logo");
        setLogoImage(s.navConfig?.logoImage ?? "");
        setLogoHref(s.navConfig?.logoHref ?? "/");
        setNavLinks(normalizeNavLinks(s.navConfig?.navLinks));
        setHeaderStyle(s.navConfig?.headerStyle ?? "solid");
        setHeaderBg(s.navConfig?.headerBg ?? "#ffffff");
        setHeaderTextColor(s.navConfig?.headerTextColor ?? "#000000");
        setCtaPrimaryText(s.navConfig?.ctaPrimaryText ?? "");
        setCtaPrimaryHref(s.navConfig?.ctaPrimaryHref ?? "");
        setCtaSecondaryText(s.navConfig?.ctaSecondaryText ?? "");
        setCtaSecondaryHref(s.navConfig?.ctaSecondaryHref ?? "");
        setHeroBadge(s.navConfig?.heroBadge ?? "");
        setHeroHeadline(s.navConfig?.heroHeadline ?? "");
        setHeroDescription(s.navConfig?.heroDescription ?? "");
        setPalette({ ...DEFAULT_PALETTE, ...(s.navConfig?.palette ?? {}) });
        setCopyright(s.footerConfig?.copyright ?? "");
        setFooterLinks(s.footerConfig?.links ?? []);
        setFooterColumns(s.footerConfig?.columns ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const save = () => {
    setSaving(true);
    setSaved(false);
    api.siteSettings
      .update({
        navType,
        navConfig: {
        logoText, logoImage, logoHref, navLinks, navVariant, headerStyle, headerBg, headerTextColor,
        ctaPrimaryText, ctaPrimaryHref, ctaSecondaryText, ctaSecondaryHref,
        heroBadge, heroHeadline, heroDescription, palette,
      },
        footerConfig: { copyright, links: footerLinks, columns: footerColumns },
      })
      .then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  // Nav links helpers
  const addNavItem = () => setNavLinks((prev) => [...prev, { label: "", href: "", dropdown: [] }]);
  const updateNavItem = (i: number, patch: Partial<NavMenuItem>) =>
    setNavLinks((prev) => prev.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  const removeNavItem = (i: number) => setNavLinks((prev) => prev.filter((_, idx) => idx !== i));
  const addDropdownGroup = (i: number) =>
    setNavLinks((prev) =>
      prev.map((item, idx) =>
        idx === i ? { ...item, dropdown: [...(item.dropdown ?? []), { title: "", links: [] }], href: "" } : item
      )
    );
  const updateDropdownGroupTitle = (i: number, gi: number, value: string) =>
    setNavLinks((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? { ...item, dropdown: (item.dropdown ?? []).map((g, j) => (j === gi ? { ...g, title: value } : g)) }
          : item
      )
    );
  const removeDropdownGroup = (i: number, gi: number) =>
    setNavLinks((prev) =>
      prev.map((item, idx) =>
        idx === i ? { ...item, dropdown: (item.dropdown ?? []).filter((_, j) => j !== gi) } : item
      )
    );
  const addDropdownLink = (i: number, gi: number) =>
    setNavLinks((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? {
              ...item,
              dropdown: (item.dropdown ?? []).map((g, j) =>
                j === gi ? { ...g, links: [...g.links, { label: "", href: "", title: "", children: [] }] } : g
              ),
            }
          : item
      )
    );
  const updateDropdownLink = (i: number, gi: number, li: number, field: "label" | "href" | "title", value: string) =>
    setNavLinks((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? {
              ...item,
              dropdown: (item.dropdown ?? []).map((g, j) =>
                j === gi
                  ? { ...g, links: g.links.map((l, k) => (k === li ? { ...l, [field]: value } : l)) }
                  : g
              ),
            }
          : item
      )
    );
  const removeDropdownLink = (i: number, gi: number, li: number) =>
    setNavLinks((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? { ...item, dropdown: (item.dropdown ?? []).map((g, j) => (j === gi ? { ...g, links: g.links.filter((_, k) => k !== li) } : g)) }
          : item
      )
    );
  const addChildLink = (i: number, gi: number, li: number) =>
    setNavLinks((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? {
              ...item,
              dropdown: (item.dropdown ?? []).map((g, j) =>
                j === gi
                  ? {
                      ...g,
                      links: g.links.map((l, k) =>
                        k === li ? { ...l, children: [...(l.children ?? []), { label: "", href: "" }] } : l
                      ),
                    }
                  : g
              ),
            }
          : item
      )
    );
  const updateChildLink = (i: number, gi: number, li: number, ci: number, field: "label" | "href", value: string) =>
    setNavLinks((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? {
              ...item,
              dropdown: (item.dropdown ?? []).map((g, j) =>
                j === gi
                  ? {
                      ...g,
                      links: g.links.map((l, k) =>
                        k === li
                          ? {
                              ...l,
                              children: (l.children ?? []).map((c, m) => (m === ci ? { ...c, [field]: value } : c)),
                            }
                          : l
                      ),
                    }
                  : g
              ),
            }
          : item
      )
    );
  const removeChildLink = (i: number, gi: number, li: number, ci: number) =>
    setNavLinks((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? {
              ...item,
              dropdown: (item.dropdown ?? []).map((g, j) =>
                j === gi
                  ? {
                      ...g,
                      links: g.links.map((l, k) =>
                        k === li ? { ...l, children: (l.children ?? []).filter((_, m) => m !== ci) } : l
                      ),
                    }
                  : g
              ),
            }
          : item
      )
    );

  // Sub-footer link helpers
  const addFooterLink = () => setFooterLinks((prev) => [...prev, { label: "", href: "" }]);
  const updateFooterLink = (i: number, field: keyof NavLink, value: string) =>
    setFooterLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  const removeFooterLink = (i: number) => setFooterLinks((prev) => prev.filter((_, idx) => idx !== i));

  // Footer columns helpers
  const addColumn = () => {
    if (footerColumns.length >= 3) return;
    setFooterColumns((prev) => [...prev, { heading: "", text: "", links: [] }]);
  };
  const updateColumn = (i: number, field: keyof FooterColumn, value: string | NavLink[]) =>
    setFooterColumns((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  const removeColumn = (i: number) => setFooterColumns((prev) => prev.filter((_, idx) => idx !== i));

  const addColumnLink = (ci: number) =>
    setFooterColumns((prev) => prev.map((c, idx) => idx === ci ? { ...c, links: [...c.links, { label: "", href: "" }] } : c));
  const updateColumnLink = (ci: number, li: number, field: keyof NavLink, value: string) =>
    setFooterColumns((prev) => prev.map((c, idx) => idx === ci ? { ...c, links: c.links.map((l, lIdx) => lIdx === li ? { ...l, [field]: value } : l) } : c));
  const removeColumnLink = (ci: number, li: number) =>
    setFooterColumns((prev) => prev.map((c, idx) => idx === ci ? { ...c, links: c.links.filter((_, lIdx) => lIdx !== li) } : c));

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Site Layout</h1>
        <p className="text-muted-foreground mt-1 text-sm">Navbar, colors, hero section, and footer.</p>
      </div>
      {/* Brand Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Brand colors</CardTitle>
          <p className="text-sm text-muted-foreground">
            These colors are injected as CSS variables and appear as swatches in every color picker throughout the editor.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Live preview strip */}
          <div className="flex rounded-lg overflow-hidden h-8 border">
            {PALETTE_KEYS.map(({ key }) => (
              <div key={key} className="flex-1" style={{ backgroundColor: palette[key] }} title={key} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PALETTE_KEYS.map(({ key, label, hint }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs font-medium">{label}</Label>
                <p className="text-[10px] text-muted-foreground leading-tight">{hint}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={palette[key] || "#000000"}
                    onChange={(e) => setPalette((p) => ({ ...p, [key]: e.target.value }))}
                    className="h-9 w-12 cursor-pointer rounded border border-input p-0.5 shrink-0"
                  />
                  <Input
                    value={palette[key]}
                    onChange={(e) => setPalette((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder="#000000"
                    className="text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => setPalette(DEFAULT_PALETTE)}
          >
            Reset to defaults
          </Button>
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardHeader><CardTitle>Navigation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Nav type">
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={navType}
              onChange={(e) => setNavType(e.target.value)}
            >
              <option value="navbar">Top navbar</option>
              <option value="sidebar">Sidebar</option>
            </select>
          </Field>
          <Field label="Navbar variant">
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={navVariant}
              onChange={(e) => setNavVariant(e.target.value as NavVariant)}
            >
              <option value="minimal">Minimal — clean top bar</option>
              <option value="elevated">Elevated — floating card</option>
              <option value="saas-cta">SaaS CTA — hero with dual buttons</option>
              <option value="saas-email">SaaS Email — hero with email capture</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Logo text"><Input value={logoText} onChange={(e) => setLogoText(e.target.value)} placeholder="Logo" /></Field>
            <Field label="Logo link"><Input value={logoHref} onChange={(e) => setLogoHref(e.target.value)} placeholder="/" /></Field>
          </div>
          <MediaPicker value={logoImage} onChange={setLogoImage} label="Logo image" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Nav items</Label>
              <Button size="sm" variant="outline" onClick={addNavItem}><Plus className="size-3 mr-1" /> Add item</Button>
            </div>
            {navLinks.map((item, i) => (
              <div key={i} className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Input placeholder="Menu label" value={item.label} onChange={(e) => updateNavItem(i, { label: e.target.value })} />
                  <Button size="icon" variant="ghost" onClick={() => removeNavItem(i)} className="shrink-0"><Trash2 className="size-4" /></Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Direct link (no dropdown)">
                    <Input placeholder="/path" value={item.href ?? ""} onChange={(e) => updateNavItem(i, { href: e.target.value })} />
                  </Field>
                  <div className="flex items-end">
                    <Button size="sm" variant="outline" onClick={() => addDropdownGroup(i)}><Plus className="size-3 mr-1" /> Add dropdown group</Button>
                  </div>
                </div>

                {(item.dropdown ?? []).map((group, gi) => (
                  <div key={gi} className="space-y-2 rounded-md border border-dashed p-2">
                    <div className="flex items-center gap-2">
                      <Input placeholder="Dropdown group title" value={group.title} onChange={(e) => updateDropdownGroupTitle(i, gi, e.target.value)} />
                      <Button size="icon" variant="ghost" onClick={() => removeDropdownGroup(i, gi)} className="shrink-0"><X className="size-4" /></Button>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => addDropdownLink(i, gi)}><Plus className="size-3 mr-1" /> Add link</Button>
                    </div>
                    {group.links.map((entry, li) => (
                      <div key={li} className="space-y-2 rounded-md border bg-muted/30 p-2">
                        <div className="grid grid-cols-3 gap-2">
                          <Input placeholder="Link label" value={entry.label} onChange={(e) => updateDropdownLink(i, gi, li, "label", e.target.value)} />
                          <Input placeholder="/path" value={entry.href} onChange={(e) => updateDropdownLink(i, gi, li, "href", e.target.value)} />
                          <div className="flex gap-2">
                            <Input placeholder="Title (optional)" value={entry.title ?? ""} onChange={(e) => updateDropdownLink(i, gi, li, "title", e.target.value)} />
                            <Button size="icon" variant="ghost" onClick={() => removeDropdownLink(i, gi, li)} className="shrink-0"><Trash2 className="size-4" /></Button>
                          </div>
                        </div>
                        <div className="space-y-2 pl-3 border-l">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Nested links</Label>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => addChildLink(i, gi, li)}><Plus className="size-3 mr-1" /> Add nested</Button>
                          </div>
                          {(entry.children ?? []).map((child, ci) => (
                            <div key={ci} className="flex gap-2">
                              <Input placeholder="Nested label" value={child.label} onChange={(e) => updateChildLink(i, gi, li, ci, "label", e.target.value)} />
                              <Input placeholder="/path" value={child.href} onChange={(e) => updateChildLink(i, gi, li, ci, "href", e.target.value)} />
                              <Button size="icon" variant="ghost" onClick={() => removeChildLink(i, gi, li, ci)} className="shrink-0"><X className="size-4" /></Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">CTA buttons</Label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary button text"><Input value={ctaPrimaryText} onChange={(e) => setCtaPrimaryText(e.target.value)} placeholder="Get started" /></Field>
              <Field label="Primary button link"><Input value={ctaPrimaryHref} onChange={(e) => setCtaPrimaryHref(e.target.value)} placeholder="/signup" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Secondary button text"><Input value={ctaSecondaryText} onChange={(e) => setCtaSecondaryText(e.target.value)} placeholder="Log in" /></Field>
              <Field label="Secondary button link"><Input value={ctaSecondaryHref} onChange={(e) => setCtaSecondaryHref(e.target.value)} placeholder="/login" /></Field>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header appearance */}
      <Card>
        <CardHeader><CardTitle>Header appearance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Header style">
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={headerStyle}
              onChange={(e) => setHeaderStyle(e.target.value as "solid" | "transparent")}
            >
              <option value="solid">Solid background</option>
              <option value="transparent">Transparent (overlay over hero)</option>
            </select>
          </Field>
          {headerStyle === "solid" && (
            <ColorField label="Background color" value={headerBg} onChange={setHeaderBg} />
          )}
          <ColorField label="Text / logo color" value={headerTextColor} onChange={setHeaderTextColor} />
        </CardContent>
      </Card>

      {/* Hero section — shown for saas variants */}
      {(navVariant === "saas-cta" || navVariant === "saas-email") && (
        <Card>
          <CardHeader><CardTitle>Hero section</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Badge text"><Input value={heroBadge} onChange={(e) => setHeroBadge(e.target.value)} placeholder="Introducing something new" /></Field>
            <Field label="Headline"><Input value={heroHeadline} onChange={(e) => setHeroHeadline(e.target.value)} placeholder="Your compelling headline" /></Field>
            <Field label="Description">
              <textarea
                rows={3}
                value={heroDescription}
                onChange={(e) => setHeroDescription(e.target.value)}
                placeholder="A short description that supports the headline…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
              />
            </Field>
          </CardContent>
        </Card>
      )}

      {/* Footer columns */}
      <Card>
        <CardHeader><CardTitle>Footer columns</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Up to 3 content columns</p>
            <Button size="sm" variant="outline" onClick={addColumn} disabled={footerColumns.length >= 3}><Plus className="size-3 mr-1" /> Add column</Button>
          </div>
          {footerColumns.map((col, ci) => (
            <div key={ci} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Column {ci + 1}</p>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeColumn(ci)}><X className="size-3" /></Button>
              </div>
              <Field label="Heading"><Input value={col.heading} onChange={(e) => updateColumn(ci, "heading", e.target.value)} /></Field>
              <Field label="Text">
                <textarea
                  rows={3}
                  value={col.text}
                  onChange={(e) => updateColumn(ci, "text", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                />
              </Field>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Links</Label>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => addColumnLink(ci)}><Plus className="size-3 mr-1" />Add</Button>
                </div>
                {col.links.map((link, li) => (
                  <div key={li} className="flex gap-2 items-center">
                    <Input placeholder="Label" value={link.label} onChange={(e) => updateColumnLink(ci, li, "label", e.target.value)} />
                    <Input placeholder="/path" value={link.href} onChange={(e) => updateColumnLink(ci, li, "href", e.target.value)} />
                    <Button size="icon" variant="ghost" className="shrink-0" onClick={() => removeColumnLink(ci, li)}><Trash2 className="size-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sub-footer */}
      <Card>
        <CardHeader><CardTitle>Sub-footer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Copyright text"><Input value={copyright} onChange={(e) => setCopyright(e.target.value)} placeholder="© 2025 My Site" /></Field>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sub-footer links</Label>
              <Button size="sm" variant="outline" onClick={addFooterLink}><Plus className="size-3 mr-1" /> Add link</Button>
            </div>
            {footerLinks.map((link, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input placeholder="Label" value={link.label} onChange={(e) => updateFooterLink(i, "label", e.target.value)} />
                <Input placeholder="/path" value={link.href} onChange={(e) => updateFooterLink(i, "href", e.target.value)} />
                <Button size="icon" variant="ghost" onClick={() => removeFooterLink(i)} className="shrink-0"><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving…" : saved ? "Saved!" : "Save layout settings"}
      </Button>
    </div>
  );
}
