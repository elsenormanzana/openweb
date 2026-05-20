import type { FooterSocialBlockProps, SocialConnectItem } from "@/lib/blocks";
import { Field, ColorField } from "./shared";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, PanelTop } from "lucide-react";

export function FooterSocialForm({ props, onChange }: { props: FooterSocialBlockProps; onChange: (p: FooterSocialBlockProps) => void }) {
  const set = <K extends keyof FooterSocialBlockProps>(k: K, v: FooterSocialBlockProps[K]) => onChange({ ...props, [k]: v });

  const socials = props.socials || [];

  const updateSocial = (index: number, updates: Partial<SocialConnectItem>) => {
    const next = [...socials];
    next[index] = { ...next[index], ...updates };
    set("socials", next);
  };

  const addSocial = () => {
    const next = [...socials, { id: `fs-${Date.now()}`, platform: "X", label: "X (Twitter)", href: "https://x.com", icon: "X", color: "#000000", badge: "Follow" }];
    set("socials", next);
  };

  const removeSocial = (index: number) => {
    const next = socials.filter((_, i) => i !== index);
    set("socials", next);
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Brand & Tagline */}
      <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border">
        <label className="font-semibold text-muted-foreground block">Brand Settings</label>
        <Field label="Brand Name">
          <Input value={props.brandName} onChange={(e) => set("brandName", e.target.value)} />
        </Field>
        <Field label="Tagline">
          <Input value={props.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <Field label="Copyright Text">
          <Input value={props.copyright} onChange={(e) => set("copyright", e.target.value)} />
        </Field>
        <ColorField label="Background Color" value={props.backgroundColor || ""} onChange={(v) => set("backgroundColor", v)} />
      </div>

      {/* Newsletter Settings */}
      <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border">
        <label className="font-semibold text-muted-foreground block">Newsletter Form</label>
        <Field label="Newsletter Heading">
          <Input value={props.newsletterHeading || ""} onChange={(e) => set("newsletterHeading", e.target.value)} />
        </Field>
        <Field label="Input Placeholder">
          <Input value={props.newsletterPlaceholder || ""} onChange={(e) => set("newsletterPlaceholder", e.target.value)} />
        </Field>
        <Field label="Button Text">
          <Input value={props.newsletterButtonText || ""} onChange={(e) => set("newsletterButtonText", e.target.value)} />
        </Field>
      </div>

      {/* Social Dock Links */}
      <div className="space-y-3">
        <div className="flex items-center justify-between font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5"><PanelTop className="size-4 text-blue-500" /> Social Dock Links ({socials.length})</span>
          <button type="button" onClick={addSocial} className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition shadow-sm">
            <Plus className="size-3.5" /> Add Link
          </button>
        </div>

        <div className="space-y-3 pl-1">
          {socials.map((soc, index) => (
            <div key={soc.id} className="p-3 bg-muted/20 rounded-lg border border-border space-y-2.5 relative group">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">Link {index + 1}</span>
                <button type="button" onClick={() => removeSocial(index)} className="text-muted-foreground hover:text-red-400 transition p-1 rounded hover:bg-red-500/10">
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Platform">
                  <Input value={soc.platform} onChange={(e) => updateSocial(index, { platform: e.target.value })} />
                </Field>
                <Field label="Display Label">
                  <Input value={soc.label} onChange={(e) => updateSocial(index, { label: e.target.value })} />
                </Field>
              </div>

              <Field label="Destination URL">
                <Input value={soc.href} onChange={(e) => updateSocial(index, { href: e.target.value })} />
              </Field>

              <div className="grid grid-cols-3 gap-2 items-end">
                <Field label="Icon Name">
                  <Input value={soc.icon || ""} onChange={(e) => updateSocial(index, { icon: e.target.value })} />
                </Field>
                <Field label="Badge Text">
                  <Input value={soc.badge || ""} onChange={(e) => updateSocial(index, { badge: e.target.value })} />
                </Field>
                <ColorField label="Icon Color" value={soc.color || ""} onChange={(v) => updateSocial(index, { color: v })} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
