import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { TabsContentBlockProps, TabsContentItem } from "@/lib/blocks";
import { Field, Textarea, SelectField, ImagePickerField, ItemHeader } from "./shared";

export function TabsContentForm({ props, onChange }: { props: TabsContentBlockProps; onChange: (p: TabsContentBlockProps) => void }) {
  const set = <K extends keyof TabsContentBlockProps>(k: K, v: TabsContentBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, patch: Partial<TabsContentItem>) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  return (
    <div className="space-y-3">
      <SelectField label="Tab style" value={props.tabStyle} onChange={(v) => set("tabStyle", v as TabsContentBlockProps["tabStyle"])} options={[{ value: "underline", label: "Underline" }, { value: "pill", label: "Pill" }, { value: "bordered", label: "Bordered" }]} />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Tabs</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { tabLabel: "", content: "", image: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={item.tabLabel || `Tab ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Tab label"><Input value={item.tabLabel} onChange={(e) => updateItem(i, { tabLabel: e.target.value })} /></Field>
            <Field label="Content"><Textarea value={item.content} onChange={(v) => updateItem(i, { content: v })} /></Field>
            <ImagePickerField label="Image" value={item.image} onChange={(v) => updateItem(i, { image: v })} />
          </div>
        ))}
      </div>
    </div>
  );
}
