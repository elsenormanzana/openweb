import type { SocialConnectBlockProps, SocialConnectItem } from "@/lib/blocks";
import { Field, SelectField, ColorField } from "./shared";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Share2 } from "lucide-react";

const PLATFORMS = [
  { value: "Google", label: "Google", defaultIcon: "Google", defaultColor: "#4285F4" },
  { value: "Facebook", label: "Facebook", defaultIcon: "Facebook", defaultColor: "#1877F2" },
  { value: "Instagram", label: "Instagram", defaultIcon: "Instagram", defaultColor: "#E4405F" },
  { value: "X", label: "X (Twitter)", defaultIcon: "X", defaultColor: "#000000" },
  { value: "GitHub", label: "GitHub", defaultIcon: "GitHub", defaultColor: "#333333" },
  { value: "LinkedIn", label: "LinkedIn", defaultIcon: "Linkedin", defaultColor: "#0A66C2" },
  { value: "YouTube", label: "YouTube", defaultIcon: "Youtube", defaultColor: "#FF0000" },
  { value: "Discord", label: "Discord", defaultIcon: "Discord", defaultColor: "#5865F2" },
  { value: "TikTok", label: "TikTok", defaultIcon: "TikTok", defaultColor: "#000000" },
  { value: "WhatsApp", label: "WhatsApp", defaultIcon: "WhatsApp", defaultColor: "#25D366" },
  { value: "Reddit", label: "Reddit", defaultIcon: "Globe", defaultColor: "#FF4500" },
  { value: "Pinterest", label: "Pinterest", defaultIcon: "Globe", defaultColor: "#E60023" },
  { value: "Custom", label: "Custom", defaultIcon: "Globe", defaultColor: "#6366F1" },
];

export function SocialConnectForm({ props, onChange }: { props: SocialConnectBlockProps; onChange: (p: SocialConnectBlockProps) => void }) {
  const set = <K extends keyof SocialConnectBlockProps>(k: K, v: SocialConnectBlockProps[K]) => onChange({ ...props, [k]: v });

  const items = props.items || [];

  const updateItem = (index: number, updates: Partial<SocialConnectItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...updates };

    // Auto-update icon and color if platform changes
    if (updates.platform) {
      const found = PLATFORMS.find((p) => p.value === updates.platform);
      if (found) {
        next[index].icon = found.defaultIcon;
        next[index].color = found.defaultColor;
        if (!next[index].label || next[index].label === "New Social") {
          next[index].label = found.label;
        }
      }
    }

    set("items", next);
  };

  const addItem = () => {
    const next = [...items, { id: `soc-${Date.now()}`, platform: "Google", label: "Google", href: "https://google.com", icon: "Google", color: "#4285F4" }];
    set("items", next);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    set("items", next);
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header Settings */}
      <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border">
        <label className="font-semibold text-muted-foreground block">Header Content</label>
        <Field label="Heading">
          <Input value={props.heading} onChange={(e) => set("heading", e.target.value)} />
        </Field>
        <Field label="Subheading">
          <Input value={props.subheading} onChange={(e) => set("subheading", e.target.value)} />
        </Field>
      </div>

      {/* Layout & Style Settings */}
      <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border">
        <label className="font-semibold text-muted-foreground block">Display & Layout</label>
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Layout" value={props.layout} onChange={(v) => set("layout", v as any)} options={[
            { value: "grid", label: "Compact Grid" },
            { value: "row", label: "Flexible Row" },
            { value: "cards", label: "Large Cards" },
          ]} />
          <SelectField label="Button Style" value={props.buttonStyle} onChange={(v) => set("buttonStyle", v as any)} options={[
            { value: "glass", label: "Glassmorphic" },
            { value: "solid", label: "Solid Brand Color" },
            { value: "outline", label: "Outline" },
            { value: "shimmer", label: "Shimmer Gradient" },
          ]} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Alignment" value={props.align} onChange={(v) => set("align", v as any)} options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]} />
          <ColorField label="Section Background" value={props.backgroundColor || ""} onChange={(v) => set("backgroundColor", v)} />
        </div>
      </div>

      {/* Social Items Management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5"><Share2 className="size-4 text-blue-500" /> Social Channels ({items.length})</span>
          <button type="button" onClick={addItem} className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition shadow-sm">
            <Plus className="size-3.5" /> Add Channel
          </button>
        </div>

        <div className="space-y-3 pl-1">
          {items.map((item, index) => (
            <div key={item.id} className="p-3 bg-muted/20 rounded-lg border border-border space-y-2.5 relative group">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">Channel {index + 1}</span>
                <button type="button" onClick={() => removeItem(index)} className="text-muted-foreground hover:text-red-400 transition p-1 rounded hover:bg-red-500/10">
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <SelectField label="Platform" value={item.platform} onChange={(v) => updateItem(index, { platform: v })} options={PLATFORMS.map((p) => ({ value: p.value, label: p.label }))} />
                <Field label="Display Label">
                  <Input value={item.label} onChange={(e) => updateItem(index, { label: e.target.value })} />
                </Field>
              </div>

              <Field label="Destination URL">
                <Input value={item.href} onChange={(e) => updateItem(index, { href: e.target.value })} />
              </Field>

              <div className="grid grid-cols-3 gap-2">
                <Field label="Icon Name">
                  <Input value={item.icon || ""} onChange={(e) => updateItem(index, { icon: e.target.value })} />
                </Field>
                <Field label="Emoji">
                  <Input value={item.emoji || ""} onChange={(e) => updateItem(index, { emoji: e.target.value })} />
                </Field>
                <Field label="Badge Text">
                  <Input value={item.badge || ""} onChange={(e) => updateItem(index, { badge: e.target.value })} />
                </Field>
              </div>

              <ColorField label="Custom Color" value={item.color || ""} onChange={(v) => updateItem(index, { color: v })} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
