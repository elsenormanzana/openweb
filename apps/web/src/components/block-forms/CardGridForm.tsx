import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { CardGridBlockProps, CardGridItem } from "@/lib/blocks";
import { Field, SelectField, ImagePickerField, ItemHeader } from "./shared";

export function CardGridForm({ props, onChange }: { props: CardGridBlockProps; onChange: (p: CardGridBlockProps) => void }) {
  const set = <K extends keyof CardGridBlockProps>(k: K, v: CardGridBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof CardGridItem, v: string) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <SelectField label="Columns" value={String(props.columns)} onChange={(v) => set("columns", Number(v) as 2 | 3 | 4)} options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]} />
      <SelectField label="Card style" value={props.cardStyle} onChange={(v) => set("cardStyle", v as CardGridBlockProps["cardStyle"])} options={[{ value: "default", label: "Default" }, { value: "bordered", label: "Bordered" }, { value: "shadow", label: "Shadow" }]} />
      <SelectField label="Hover effect" value={props.hoverEffect} onChange={(v) => set("hoverEffect", v as CardGridBlockProps["hoverEffect"])} options={[{ value: "none", label: "None" }, { value: "lift", label: "Lift" }, { value: "glow", label: "Glow" }, { value: "border", label: "Border" }]} />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Cards</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { title: "", description: "", image: "", link: "", badge: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={item.title || `Card ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Title"><Input value={item.title} onChange={(e) => updateItem(i, "title", e.target.value)} /></Field>
            <Field label="Description"><Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} /></Field>
            <ImagePickerField label="Image" value={item.image} onChange={(v) => updateItem(i, "image", v)} />
            <Field label="Link"><Input value={item.link} onChange={(e) => updateItem(i, "link", e.target.value)} placeholder="https://..." /></Field>
            <Field label="Badge"><Input value={item.badge} onChange={(e) => updateItem(i, "badge", e.target.value)} placeholder="e.g. New" /></Field>
          </div>
        ))}
      </div>
    </div>
  );
}
