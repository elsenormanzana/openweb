import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { AccordionBlockProps, AccordionItem } from "@/lib/blocks";
import { Field, Textarea, SelectField, ItemHeader } from "./shared";

export function AccordionForm({ props, onChange }: { props: AccordionBlockProps; onChange: (p: AccordionBlockProps) => void }) {
  const set = <K extends keyof AccordionBlockProps>(k: K, v: AccordionBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, patch: Partial<AccordionItem>) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={props.allowMultiple} onChange={(e) => set("allowMultiple", e.target.checked)} className="rounded" />
        Allow multiple open
      </label>
      <SelectField label="Icon style" value={props.iconStyle} onChange={(v) => set("iconStyle", v as AccordionBlockProps["iconStyle"])} options={[{ value: "chevron", label: "Chevron" }, { value: "plus", label: "Plus" }, { value: "arrow", label: "Arrow" }]} />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Items</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { question: "", answer: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={item.question || `Item ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Question"><Input value={item.question} onChange={(e) => updateItem(i, { question: e.target.value })} /></Field>
            <Field label="Answer"><Textarea value={item.answer} onChange={(v) => updateItem(i, { answer: v })} /></Field>
          </div>
        ))}
      </div>
    </div>
  );
}
