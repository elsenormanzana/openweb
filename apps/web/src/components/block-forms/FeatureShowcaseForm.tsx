import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { FeatureShowcaseBlockProps, FeatureShowcaseItem } from "@/lib/blocks";
import { Field, Textarea, SelectField, ImagePickerField, ItemHeader } from "./shared";

export function FeatureShowcaseForm({ props, onChange }: { props: FeatureShowcaseBlockProps; onChange: (p: FeatureShowcaseBlockProps) => void }) {
  const set = <K extends keyof FeatureShowcaseBlockProps>(k: K, v: FeatureShowcaseBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, patch: Partial<FeatureShowcaseItem>) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  return (
    <div className="space-y-3">
      <SelectField label="Sticky position" value={props.stickyPosition} onChange={(v) => set("stickyPosition", v as "left" | "right")} options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]} />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Features</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { title: "", description: "", image: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={item.title || `Feature ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Title"><Input value={item.title} onChange={(e) => updateItem(i, { title: e.target.value })} /></Field>
            <Field label="Description"><Textarea value={item.description} onChange={(v) => updateItem(i, { description: v })} rows={2} /></Field>
            <ImagePickerField label="Image" value={item.image} onChange={(v) => updateItem(i, { image: v })} />
          </div>
        ))}
      </div>
    </div>
  );
}
