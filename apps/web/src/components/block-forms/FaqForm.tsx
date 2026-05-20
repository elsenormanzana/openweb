import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { FaqBlockProps, FaqItem } from "@/lib/blocks";
import { Field, Textarea, ItemHeader } from "./shared";

export function FaqForm({ props, onChange }: { props: FaqBlockProps; onChange: (p: FaqBlockProps) => void }) {
  const set = <K extends keyof FaqBlockProps>(k: K, v: FaqBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof FaqItem, v: string) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Questions</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { question: "", answer: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={`Q${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Question"><Input value={item.question} onChange={(e) => updateItem(i, "question", e.target.value)} /></Field>
            <Field label="Answer"><Textarea value={item.answer} onChange={(v) => updateItem(i, "answer", v)} /></Field>
          </div>
        ))}
      </div>
    </div>
  );
}
