import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { ParallaxScrollBlockProps, ParallaxScrollItem } from "@/lib/blocks";
import { Field, Textarea, ImagePickerField, ItemHeader } from "./shared";

export function ParallaxScrollForm({ props, onChange }: { props: ParallaxScrollBlockProps; onChange: (p: ParallaxScrollBlockProps) => void }) {
  const set = <K extends keyof ParallaxScrollBlockProps>(k: K, v: ParallaxScrollBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, patch: Partial<ParallaxScrollItem>) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  return (
    <div className="space-y-3">
      <Field label={`Intensity — ${props.intensity}%`}>
        <input type="range" min="0" max="100" value={props.intensity} onChange={(e) => set("intensity", Number(e.target.value))} className="w-full accent-blue-600" />
      </Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Items</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { image: "", title: "", description: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={item.title || `Item ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <ImagePickerField label="Image" value={item.image} onChange={(v) => updateItem(i, { image: v })} />
            <Field label="Title"><Input value={item.title} onChange={(e) => updateItem(i, { title: e.target.value })} /></Field>
            <Field label="Description"><Textarea value={item.description} onChange={(v) => updateItem(i, { description: v })} rows={2} /></Field>
          </div>
        ))}
      </div>
    </div>
  );
}
