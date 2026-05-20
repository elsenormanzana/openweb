import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { LogoMarqueeBlockProps, LogoItem } from "@/lib/blocks";
import { Field, SelectField, ImagePickerField, ItemHeader } from "./shared";

export function LogoMarqueeForm({ props, onChange }: { props: LogoMarqueeBlockProps; onChange: (p: LogoMarqueeBlockProps) => void }) {
  const set = <K extends keyof LogoMarqueeBlockProps>(k: K, v: LogoMarqueeBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateLogo = (i: number, field: keyof LogoItem, v: string) =>
    set("logos", props.logos.map((l, idx) => idx === i ? { ...l, [field]: v } : l));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label={`Speed — ${props.speed}`}>
        <input type="range" min="10" max="100" value={props.speed} onChange={(e) => set("speed", Number(e.target.value))} className="w-full accent-blue-600" />
      </Field>
      <SelectField label="Rows" value={String(props.rows)} onChange={(v) => set("rows", Number(v) as 1 | 2)} options={[{ value: "1", label: "1" }, { value: "2", label: "2" }]} />
      <SelectField label="Direction" value={props.direction} onChange={(v) => set("direction", v as "left" | "right")} options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]} />
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={props.grayscale} onChange={(e) => set("grayscale", e.target.checked)} className="rounded" />
        Grayscale logos
      </label>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Logos</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("logos", [...props.logos, { name: "", url: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.logos.map((logo, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={logo.name || `Logo ${i + 1}`} onRemove={() => set("logos", props.logos.filter((_, idx) => idx !== i))} />
            <Field label="Name"><Input value={logo.name} onChange={(e) => updateLogo(i, "name", e.target.value)} placeholder="Company name" /></Field>
            <ImagePickerField label="Logo image" value={logo.url} onChange={(v) => updateLogo(i, "url", v)} />
          </div>
        ))}
      </div>
    </div>
  );
}
