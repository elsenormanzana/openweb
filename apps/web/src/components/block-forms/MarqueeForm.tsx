import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { MarqueeBlockProps, MarqueeItem } from "@/lib/blocks";
import { Field, SelectField, ImagePickerField, ItemHeader } from "./shared";

export function MarqueeForm({ props, onChange }: { props: MarqueeBlockProps; onChange: (p: MarqueeBlockProps) => void }) {
  const set = <K extends keyof MarqueeBlockProps>(k: K, v: MarqueeBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof MarqueeItem, v: string) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <Field label={`Speed — ${props.speed}`}>
        <input type="range" min="10" max="100" value={props.speed} onChange={(e) => set("speed", Number(e.target.value))} className="w-full accent-blue-600" />
      </Field>
      <SelectField label="Direction" value={props.direction} onChange={(v) => set("direction", v as "left" | "right")} options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]} />
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={props.pauseOnHover} onChange={(e) => set("pauseOnHover", e.target.checked)} className="rounded" />
        Pause on hover
      </label>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Items</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { image: "", text: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={item.text || `Item ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <ImagePickerField label="Image" value={item.image} onChange={(v) => updateItem(i, "image", v)} />
            <Field label="Text"><Input value={item.text} onChange={(e) => updateItem(i, "text", e.target.value)} /></Field>
          </div>
        ))}
      </div>
    </div>
  );
}
