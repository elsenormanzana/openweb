import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { LogoCloudBlockProps, LogoItem } from "@/lib/blocks";
import { Field, ImagePickerField } from "./shared";

export function LogoCloudForm({ props, onChange }: { props: LogoCloudBlockProps; onChange: (p: LogoCloudBlockProps) => void }) {
  const set = <K extends keyof LogoCloudBlockProps>(k: K, v: LogoCloudBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateLogo = (i: number, field: keyof LogoItem, v: string) =>
    set("logos", props.logos.map((l, idx) => idx === i ? { ...l, [field]: v } : l));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Subheading"><Input value={props.subheading} onChange={(e) => set("subheading", e.target.value)} /></Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Logos</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("logos", [...props.logos, { name: "", url: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.logos.map((logo, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{logo.name || `Logo ${i + 1}`}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => set("logos", props.logos.filter((_, idx) => idx !== i))}><X className="size-3" /></Button>
            </div>
            <Field label="Name"><Input placeholder="Company name" value={logo.name} onChange={(e) => updateLogo(i, "name", e.target.value)} /></Field>
            <ImagePickerField label="Logo image" value={logo.url} onChange={(v) => updateLogo(i, "url", v)} />
          </div>
        ))}
      </div>
    </div>
  );
}
