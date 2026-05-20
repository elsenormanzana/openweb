import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { AnimatedCounterBlockProps, AnimatedCounterItem } from "@/lib/blocks";
import { Field, ItemHeader } from "./shared";

export function AnimatedCounterForm({ props, onChange }: { props: AnimatedCounterBlockProps; onChange: (p: AnimatedCounterBlockProps) => void }) {
  const set = <K extends keyof AnimatedCounterBlockProps>(k: K, v: AnimatedCounterBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, patch: Partial<AnimatedCounterItem>) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  return (
    <div className="space-y-3">
      <Field label={`Duration — ${props.duration}s`}>
        <input type="range" min="0.5" max="5" step="0.5" value={props.duration} onChange={(e) => set("duration", Number(e.target.value))} className="w-full accent-blue-600" />
      </Field>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={props.triggerOnView} onChange={(e) => set("triggerOnView", e.target.checked)} className="rounded" />
        Trigger on scroll into view
      </label>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Counters</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { value: 0, label: "", prefix: "", suffix: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={item.label || `Counter ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Value"><Input type="number" value={item.value} onChange={(e) => updateItem(i, { value: Number(e.target.value) })} /></Field>
            <Field label="Label"><Input value={item.label} onChange={(e) => updateItem(i, { label: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Prefix"><Input value={item.prefix} onChange={(e) => updateItem(i, { prefix: e.target.value })} placeholder="e.g. $" /></Field>
              <Field label="Suffix"><Input value={item.suffix} onChange={(e) => updateItem(i, { suffix: e.target.value })} placeholder="e.g. +" /></Field>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
