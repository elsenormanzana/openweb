import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { AnimatedCardsBlockProps, AnimatedCardItem } from "@/lib/blocks";
import { Field, SelectField, ImagePickerField, ItemHeader } from "./shared";

export function AnimatedCardsForm({ props, onChange }: { props: AnimatedCardsBlockProps; onChange: (p: AnimatedCardsBlockProps) => void }) {
  const set = <K extends keyof AnimatedCardsBlockProps>(k: K, v: AnimatedCardsBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof AnimatedCardItem, v: string) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <SelectField label="Card style" value={props.cardStyle} onChange={(v) => set("cardStyle", v as AnimatedCardsBlockProps["cardStyle"])} options={[{ value: "3d-tilt", label: "3D Tilt" }, { value: "hover-glow", label: "Hover Glow" }, { value: "spotlight", label: "Spotlight" }]} />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Cards</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { title: "", description: "", image: "", link: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={item.title || `Card ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Title"><Input value={item.title} onChange={(e) => updateItem(i, "title", e.target.value)} /></Field>
            <Field label="Description"><Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} /></Field>
            <ImagePickerField label="Image" value={item.image} onChange={(v) => updateItem(i, "image", v)} />
            <Field label="Link"><Input value={item.link} onChange={(e) => updateItem(i, "link", e.target.value)} placeholder="https://..." /></Field>
          </div>
        ))}
      </div>
    </div>
  );
}
