import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { StatsBlockProps, StatItem } from "@/lib/blocks";
import { Field, ItemHeader } from "./shared";

export function StatsForm({ props, onChange }: { props: StatsBlockProps; onChange: (p: StatsBlockProps) => void }) {
  const set = <K extends keyof StatsBlockProps>(k: K, v: StatsBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof StatItem, v: string) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Stats</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { value: "0", label: "", description: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={`Stat ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Value"><Input value={item.value} onChange={(e) => updateItem(i, "value", e.target.value)} /></Field>
              <Field label="Label"><Input value={item.label} onChange={(e) => updateItem(i, "label", e.target.value)} /></Field>
            </div>
            <Field label="Description"><Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} /></Field>
          </div>
        ))}
      </div>
    </div>
  );
}
