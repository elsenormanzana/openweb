import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { BentoGridBlockProps, BentoGridItem } from "@/lib/blocks";
import { Field, Textarea, SelectField, ImagePickerField, ItemHeader } from "./shared";

export function BentoGridForm({ props, onChange }: { props: BentoGridBlockProps; onChange: (p: BentoGridBlockProps) => void }) {
  const set = <K extends keyof BentoGridBlockProps>(k: K, v: BentoGridBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, patch: Partial<BentoGridItem>) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  return (
    <div className="space-y-3">
      <SelectField label="Grid columns" value={String(props.gridCols)} onChange={(v) => set("gridCols", Number(v) as 3 | 4)} options={[{ value: "3", label: "3" }, { value: "4", label: "4" }]} />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Items</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { colSpan: 1, rowSpan: 1, title: "", description: "", icon: "", image: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={`Item ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <div className="grid grid-cols-2 gap-2">
              <SelectField label="Col span" value={String(item.colSpan)} onChange={(v) => updateItem(i, { colSpan: Number(v) as 1 | 2 })} options={[{ value: "1", label: "1" }, { value: "2", label: "2" }]} />
              <SelectField label="Row span" value={String(item.rowSpan)} onChange={(v) => updateItem(i, { rowSpan: Number(v) as 1 | 2 })} options={[{ value: "1", label: "1" }, { value: "2", label: "2" }]} />
            </div>
            <Field label="Title"><Input value={item.title} onChange={(e) => updateItem(i, { title: e.target.value })} /></Field>
            <Field label="Description"><Textarea value={item.description} onChange={(v) => updateItem(i, { description: v })} rows={2} /></Field>
            <Field label="Icon"><Input value={item.icon} onChange={(e) => updateItem(i, { icon: e.target.value })} placeholder="Icon name" /></Field>
            <ImagePickerField label="Image" value={item.image} onChange={(v) => updateItem(i, { image: v })} />
          </div>
        ))}
      </div>
    </div>
  );
}
