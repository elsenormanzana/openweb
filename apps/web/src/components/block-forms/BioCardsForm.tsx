import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { BioCardsBlockProps, BioCardItem } from "@/lib/blocks";
import { Field, Textarea, ImagePickerField, ItemHeader } from "./shared";

export function BioCardsForm({ props, onChange }: { props: BioCardsBlockProps; onChange: (p: BioCardsBlockProps) => void }) {
  const set = <K extends keyof BioCardsBlockProps>(k: K, v: BioCardsBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof BioCardItem, v: string) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Subheading"><Input value={props.subheading} onChange={(e) => set("subheading", e.target.value)} /></Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Cards</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { name: "New Person", role: "", bio: "", avatar: "", linkedin: "", twitter: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={item.name || `Card ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Name"><Input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} /></Field>
            <Field label="Role"><Input value={item.role} onChange={(e) => updateItem(i, "role", e.target.value)} /></Field>
            <Field label="Bio"><Textarea value={item.bio} onChange={(v) => updateItem(i, "bio", v)} rows={2} /></Field>
            <ImagePickerField label="Avatar" value={item.avatar} onChange={(v) => updateItem(i, "avatar", v)} />
            <Field label="LinkedIn URL"><Input value={item.linkedin} onChange={(e) => updateItem(i, "linkedin", e.target.value)} /></Field>
            <Field label="Twitter URL"><Input value={item.twitter} onChange={(e) => updateItem(i, "twitter", e.target.value)} /></Field>
          </div>
        ))}
      </div>
    </div>
  );
}
