import type { SocialButtonsBlockProps, SocialConnectItem } from "@/lib/blocks";
import { Field, SelectField, ColorField } from "./shared";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Share2, ArrowUp, ArrowDown } from "lucide-react";

const PLATFORMS = [
  { value: "Google", label: "Google", defaultIcon: "Google", defaultColor: "#4285F4" },
  { value: "Facebook", label: "Facebook", defaultIcon: "Facebook", defaultColor: "#1877F2" },
  { value: "Instagram", label: "Instagram", defaultIcon: "Instagram", defaultColor: "#E4405F" },
  { value: "X", label: "X (Twitter)", defaultIcon: "X", defaultColor: "#000000" },
  { value: "GitHub", label: "GitHub", defaultIcon: "GitHub", defaultColor: "#333333" },
  { value: "LinkedIn", label: "LinkedIn", defaultIcon: "Linkedin", defaultColor: "#0A66C2" },
  { value: "YouTube", label: "YouTube", defaultIcon: "YouTube", defaultColor: "#FF0000" },
  { value: "Discord", label: "Discord", defaultIcon: "Discord", defaultColor: "#5865F2" },
  { value: "TikTok", label: "TikTok", defaultIcon: "TikTok", defaultColor: "#000000" },
  { value: "WhatsApp", label: "WhatsApp", defaultIcon: "WhatsApp", defaultColor: "#25D366" },
  { value: "Reddit", label: "Reddit", defaultIcon: "Reddit", defaultColor: "#FF4500" },
  { value: "Pinterest", label: "Pinterest", defaultIcon: "Pinterest", defaultColor: "#E60023" },
  { value: "Custom", label: "Custom", defaultIcon: "Globe", defaultColor: "#6366F1" },
];

export function SocialButtonsForm({ props, onChange }: { props: SocialButtonsBlockProps; onChange: (p: SocialButtonsBlockProps) => void }) {
  const set = <K extends keyof SocialButtonsBlockProps>(k: K, v: SocialButtonsBlockProps[K]) => onChange({ ...props, [k]: v });

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

  const handleAddClick = () => {
    const platformInput = window.prompt(
      "Which social media platform would you like to add?\n\n" +
      "Options:\n" +
      "Google, Facebook, Instagram, X, GitHub, LinkedIn, YouTube, Discord, TikTok, WhatsApp, Reddit, Pinterest, or Custom"
    );
    if (platformInput === null) return;
    
    const inputClean = platformInput.trim();
    if (!inputClean) return;

    // Resolve matching platform option
    const found = PLATFORMS.find(
      (p) => p.value.toLowerCase() === inputClean.toLowerCase() || 
             p.label.toLowerCase() === inputClean.toLowerCase()
    );
    const platform = found ? found.value : "Custom";
    const defaultColor = found ? found.defaultColor : "#6366F1";
    const defaultIcon = found ? found.defaultIcon : "Globe";
    const label = found ? found.label : inputClean;

    const usernameInput = window.prompt(`Enter your username/handle or full link for ${label}:`);
    if (usernameInput === null) return;
    
    const u = usernameInput.trim();
    let url = "";
    if (u.startsWith("http://") || u.startsWith("https://")) {
      url = u;
    } else {
      switch (platform) {
        case "Google": url = u ? `https://google.com/search?q=${encodeURIComponent(u)}` : "https://google.com"; break;
        case "Facebook": url = u ? `https://facebook.com/${encodeURIComponent(u)}` : "https://facebook.com"; break;
        case "Instagram": url = u ? `https://instagram.com/${encodeURIComponent(u)}` : "https://instagram.com"; break;
        case "X": url = u ? `https://x.com/${encodeURIComponent(u)}` : "https://x.com"; break;
        case "GitHub": url = u ? `https://github.com/${encodeURIComponent(u)}` : "https://github.com"; break;
        case "LinkedIn": url = u ? `https://linkedin.com/in/${encodeURIComponent(u)}` : "https://linkedin.com"; break;
        case "YouTube": url = u ? `https://youtube.com/@${encodeURIComponent(u)}` : "https://youtube.com"; break;
        case "Discord": url = u ? `https://discord.gg/${encodeURIComponent(u)}` : "https://discord.com"; break;
        case "TikTok": url = u ? `https://tiktok.com/@${encodeURIComponent(u)}` : "https://tiktok.com"; break;
        case "WhatsApp": url = u ? `https://wa.me/${encodeURIComponent(u)}` : "https://whatsapp.com"; break;
        case "Reddit": url = u ? `https://reddit.com/user/${encodeURIComponent(u)}` : "https://reddit.com"; break;
        case "Pinterest": url = u ? `https://pinterest.com/${encodeURIComponent(u)}` : "https://pinterest.com"; break;
        default: url = u ? `https://${encodeURIComponent(u)}` : "https://example.com"; break;
      }
    }

    const next = [...items, {
      id: `soc-btn-${Date.now()}`,
      platform,
      label,
      href: url,
      icon: defaultIcon,
      color: defaultColor,
    }];
    set("items", next);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    set("items", next);
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const next = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    set("items", next);
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Layout & Style Settings */}
      <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border">
        <label className="font-semibold text-muted-foreground block">Display & Layout</label>
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Layout" value={props.layout} onChange={(v) => set("layout", v as any)} options={[
            { value: "row", label: "Flexible Row" },
            { value: "grid", label: "Compact Grid" },
            { value: "floating", label: "Floating Dock" },
          ]} />
          <SelectField label="Button Style" value={props.buttonStyle} onChange={(v) => set("buttonStyle", v as any)} options={[
            { value: "solid", label: "Solid Brand Color" },
            { value: "glass", label: "Glassmorphic" },
            { value: "outline", label: "Outline" },
            { value: "shimmer", label: "Shimmer Gradient" },
          ]} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Alignment" value={props.align} onChange={(v) => set("align", v as any)} options={[
            { value: "center", label: "Center" },
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
          ]} />
          <SelectField label="Size" value={props.size} onChange={(v) => set("size", v as any)} options={[
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
            { value: "lg", label: "Large" },
          ]} />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border mt-2">
          <SelectField label="Display Mode" value={props.showOnlyLogos ? "true" : "false"} onChange={(v) => set("showOnlyLogos", v === "true")} options={[
            { value: "false", label: "Show Logos + Text" },
            { value: "true", label: "Logos Only (No Text)" },
          ]} />
        </div>
      </div>

      {/* Social Items Management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5"><Share2 className="size-4 text-blue-500" /> Social Buttons ({items.length})</span>
          <button type="button" onClick={handleAddClick} className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition shadow-sm">
            <Plus className="size-3.5" /> Add Button
          </button>
        </div>

        <div className="space-y-3 pl-1">
          {items.map((item, index) => (
            <div key={item.id} className="p-3 bg-muted/20 rounded-lg border border-border space-y-2.5 relative group">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">Button {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveItem(index, "up")} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition p-1 rounded hover:bg-muted">
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => moveItem(index, "down")} disabled={index === items.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition p-1 rounded hover:bg-muted">
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => removeItem(index)} className="text-muted-foreground hover:text-red-400 transition p-1 rounded hover:bg-red-500/10">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
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
