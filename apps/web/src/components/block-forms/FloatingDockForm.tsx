import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { FloatingDockBlockProps, FloatingDockItem } from "@/lib/blocks";
import { Field, SelectField, ItemHeader } from "./shared";

export function FloatingDockForm({ props, onChange }: { props: FloatingDockBlockProps; onChange: (p: FloatingDockBlockProps) => void }) {
  const set = <K extends keyof FloatingDockBlockProps>(k: K, v: FloatingDockBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof FloatingDockItem, v: string) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <SelectField label="Position" value={props.position} onChange={(v) => set("position", v as "bottom" | "top")} options={[{ value: "bottom", label: "Bottom" }, { value: "top", label: "Top" }]} />
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={props.magnification} onChange={(e) => set("magnification", e.target.checked)} className="rounded" />
        Magnification on hover
      </label>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Dock items</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { icon: "", label: "", href: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={item.label || `Item ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Icon"><Input value={item.icon} onChange={(e) => updateItem(i, "icon", e.target.value)} placeholder="e.g. Home, Search, Mail" /></Field>
            <Field label="Label"><Input value={item.label} onChange={(e) => updateItem(i, "label", e.target.value)} /></Field>
            <Field label="URL"><Input value={item.href} onChange={(e) => updateItem(i, "href", e.target.value)} placeholder="https://..." /></Field>
          </div>
        ))}
      </div>
    </div>
  );
}
