import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { TimelineBlockProps, TimelineItem } from "@/lib/blocks";
import { Field, Textarea, ColorField, ImagePickerField, ItemHeader } from "./shared";

export function TimelineForm({ props, onChange }: { props: TimelineBlockProps; onChange: (p: TimelineBlockProps) => void }) {
  const set = <K extends keyof TimelineBlockProps>(k: K, v: TimelineBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, patch: Partial<TimelineItem>) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <ColorField label="Line color" value={props.lineColor} onChange={(v) => set("lineColor", v)} />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Events</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { date: "", title: "", description: "", image: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={item.title || `Event ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Date"><Input value={item.date} onChange={(e) => updateItem(i, { date: e.target.value })} placeholder="e.g. 2024 Q1" /></Field>
            <Field label="Title"><Input value={item.title} onChange={(e) => updateItem(i, { title: e.target.value })} /></Field>
            <Field label="Description"><Textarea value={item.description} onChange={(v) => updateItem(i, { description: v })} rows={2} /></Field>
            <ImagePickerField label="Image" value={item.image} onChange={(v) => updateItem(i, { image: v })} />
          </div>
        ))}
      </div>
    </div>
  );
}
