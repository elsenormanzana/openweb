import type { SocialProofFeedBlockProps, SocialProofFeedItem } from "@/lib/blocks";
import { Field, SelectField, ImagePickerField, CtaButtonField } from "./shared";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, MessageSquare } from "lucide-react";

export function SocialProofFeedForm({ props, onChange }: { props: SocialProofFeedBlockProps; onChange: (p: SocialProofFeedBlockProps) => void }) {
  const set = <K extends keyof SocialProofFeedBlockProps>(k: K, v: SocialProofFeedBlockProps[K]) => onChange({ ...props, [k]: v });

  const feed = props.feed || [];

  const updateItem = (index: number, updates: Partial<SocialProofFeedItem>) => {
    const next = [...feed];
    next[index] = { ...next[index], ...updates };
    set("feed", next);
  };

  const addItem = () => {
    const next = [
      ...feed,
      {
        id: `spf-${Date.now()}`,
        authorName: "New Reviewer",
        authorHandle: "@handle",
        content: "Amazing experience using this platform!",
        platform: "X",
        icon: "X",
        date: "Just now",
        rating: 5,
      },
    ];
    set("feed", next);
  };

  const removeItem = (index: number) => {
    const next = feed.filter((_, i) => i !== index);
    set("feed", next);
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header Settings */}
      <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border">
        <label className="font-semibold text-muted-foreground block">Header Settings</label>
        <Field label="Heading">
          <Input value={props.heading} onChange={(e) => set("heading", e.target.value)} />
        </Field>
        <Field label="Subheading">
          <Input value={props.subheading} onChange={(e) => set("subheading", e.target.value)} />
        </Field>
        <SelectField label="Layout" value={props.layout} onChange={(v) => set("layout", v as any)} options={[
          { value: "masonry", label: "Masonry Grid" },
          { value: "grid", label: "Equal Grid" },
        ]} />
        <div className="border-t border-border pt-3 mt-2">
          <CtaButtonField label="Main Call-to-Action" value={props.mainCta || { label: "Join the Conversation", href: "https://x.com" }} onChange={(v) => set("mainCta", v)} />
        </div>
      </div>

      {/* Feed Items Management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5"><MessageSquare className="size-4 text-blue-500" /> Testimonial Feed ({feed.length})</span>
          <button type="button" onClick={addItem} className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition shadow-sm">
            <Plus className="size-3.5" /> Add Review
          </button>
        </div>

        <div className="space-y-3 pl-1">
          {feed.map((item, index) => (
            <div key={item.id} className="p-3 bg-muted/20 rounded-lg border border-border space-y-3 relative group">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="font-semibold text-muted-foreground">Review {index + 1}</span>
                <button type="button" onClick={() => removeItem(index)} className="text-muted-foreground hover:text-red-400 transition p-1 rounded hover:bg-red-500/10">
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Author Name">
                  <Input value={item.authorName} onChange={(e) => updateItem(index, { authorName: e.target.value })} />
                </Field>
                <Field label="Author Handle / Subtitle">
                  <Input value={item.authorHandle} onChange={(e) => updateItem(index, { authorHandle: e.target.value })} />
                </Field>
              </div>

              <ImagePickerField label="Author Avatar" value={item.authorAvatar || ""} onChange={(v) => updateItem(index, { authorAvatar: v })} />

              <Field label="Review Content">
                <textarea
                  value={item.content}
                  onChange={(e) => updateItem(index, { content: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </Field>

              <div className="grid grid-cols-4 gap-2 items-end">
                <Field label="Platform">
                  <Input value={item.platform} onChange={(e) => updateItem(index, { platform: e.target.value })} placeholder="e.g. X" />
                </Field>
                <Field label="Icon Name">
                  <Input value={item.icon || ""} onChange={(e) => updateItem(index, { icon: e.target.value })} placeholder="e.g. X" />
                </Field>
                <Field label="Date String">
                  <Input value={item.date || ""} onChange={(e) => updateItem(index, { date: e.target.value })} placeholder="2h ago" />
                </Field>
                <Field label="Rating (1-5)">
                  <Input type="number" min="1" max="5" value={item.rating || 5} onChange={(e) => updateItem(index, { rating: Number(e.target.value) })} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
