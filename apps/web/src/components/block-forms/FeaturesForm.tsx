import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { FEATURE_ICON_MAP } from "@/lib/blocks";
import type { FeaturesBlockProps, FeatureItem } from "@/lib/blocks";
import { Field, Textarea, SelectField, ItemHeader } from "./shared";

export function FeaturesForm({ props, onChange }: { props: FeaturesBlockProps; onChange: (p: FeaturesBlockProps) => void }) {
  const set = <K extends keyof FeaturesBlockProps>(k: K, v: FeaturesBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof FeatureItem, v: string) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Subheading"><Input value={props.subheading} onChange={(e) => set("subheading", e.target.value)} /></Field>
      <SelectField label="Columns" value={String(props.columns)} onChange={(v) => set("columns", Number(v) as 2 | 3 | 4)} options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]} />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Items</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { icon: "Zap", title: "New Feature", description: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={`Item ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Icon">
              <div className="grid grid-cols-10 gap-0.5 p-1 border rounded-md bg-muted/20">
                {(Object.entries(FEATURE_ICON_MAP) as [string, React.ComponentType<{ className?: string }>][]).map(([name, Icon]) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => updateItem(i, "icon", name)}
                    className={`p-1.5 rounded flex items-center justify-center transition-colors ${item.icon === name ? "bg-blue-100 text-blue-600" : "hover:bg-accent text-muted-foreground"}`}
                  >
                    <Icon className="size-3.5" />
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Title"><Input value={item.title} onChange={(e) => updateItem(i, "title", e.target.value)} /></Field>
            <Field label="Description"><Textarea value={item.description} onChange={(v) => updateItem(i, "description", v)} rows={2} /></Field>
          </div>
        ))}
      </div>
    </div>
  );
}
