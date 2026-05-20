import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { SlideshowBlockProps, SlideshowItem, CtaButton } from "@/lib/blocks";
import { Field, Textarea, ImagePickerField, CtaButtonField, ItemHeader } from "./shared";

export function SlideshowForm({ props, onChange }: { props: SlideshowBlockProps; onChange: (p: SlideshowBlockProps) => void }) {
  const set = <K extends keyof SlideshowBlockProps>(k: K, v: SlideshowBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof SlideshowItem, v: string | CtaButton) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Subheading"><Input value={props.subheading} onChange={(e) => set("subheading", e.target.value)} /></Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Slides</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { title: "New Slide", description: "", image: "", badge: "", cta: { label: "", href: "" } }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={`Slide ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Title"><Input value={item.title} onChange={(e) => updateItem(i, "title", e.target.value)} /></Field>
            <Field label="Description"><Textarea value={item.description} onChange={(v) => updateItem(i, "description", v)} rows={2} /></Field>
            <ImagePickerField label="Image" value={item.image} onChange={(v) => updateItem(i, "image", v)} />
            <Field label="Badge"><Input value={item.badge} onChange={(e) => updateItem(i, "badge", e.target.value)} /></Field>
            <CtaButtonField label="CTA" value={item.cta} onChange={(v) => updateItem(i, "cta", v)} />
          </div>
        ))}
      </div>
    </div>
  );
}
