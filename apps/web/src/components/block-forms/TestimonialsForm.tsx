import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { TestimonialsBlockProps, TestimonialItem } from "@/lib/blocks";
import { Field, Textarea, ImagePickerField, ItemHeader } from "./shared";

export function TestimonialsForm({ props, onChange }: { props: TestimonialsBlockProps; onChange: (p: TestimonialsBlockProps) => void }) {
  const set = <K extends keyof TestimonialsBlockProps>(k: K, v: TestimonialsBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof TestimonialItem, v: string) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Testimonials</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { quote: "", name: "", role: "", company: "", avatar: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={item.name || `Testimonial ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Quote"><Textarea value={item.quote} onChange={(v) => updateItem(i, "quote", v)} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Name"><Input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} /></Field>
              <Field label="Role"><Input value={item.role} onChange={(e) => updateItem(i, "role", e.target.value)} /></Field>
            </div>
            <Field label="Company"><Input value={item.company} onChange={(e) => updateItem(i, "company", e.target.value)} /></Field>
            <ImagePickerField label="Avatar" value={item.avatar} onChange={(v) => updateItem(i, "avatar", v)} />
          </div>
        ))}
      </div>
    </div>
  );
}
