import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { NavbarBlockProps, NavbarLink } from "@/lib/blocks";
import { Field, SelectField } from "./shared";

export function NavbarForm({ props, onChange }: { props: NavbarBlockProps; onChange: (p: NavbarBlockProps) => void }) {
  const set = <K extends keyof NavbarBlockProps>(k: K, v: NavbarBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateLink = (i: number, field: keyof NavbarLink, v: string) =>
    set("links", props.links.map((l, idx) => idx === i ? { ...l, [field]: v } : l));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Logo text"><Input value={props.logoText} onChange={(e) => set("logoText", e.target.value)} /></Field>
        <Field label="Logo link"><Input value={props.logoHref} onChange={(e) => set("logoHref", e.target.value)} /></Field>
      </div>
      <SelectField label="Style" value={props.style} onChange={(v) => set("style", v as NavbarBlockProps["style"])} options={[
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
        { value: "transparent", label: "Transparent" },
      ]} />
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={props.sticky} onChange={(e) => set("sticky", e.target.checked)} className="rounded" />
        Sticky (fixed to top on scroll)
      </label>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Nav links</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("links", [...props.links, { label: "", href: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.links.map((link, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <Input placeholder="Label" value={link.label} onChange={(e) => updateLink(i, "label", e.target.value)} />
            <Input placeholder="/path" value={link.href} onChange={(e) => updateLink(i, "href", e.target.value)} />
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => set("links", props.links.filter((_, idx) => idx !== i))}><X className="size-3" /></Button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="CTA label"><Input value={props.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} /></Field>
        <Field label="CTA href"><Input value={props.ctaHref} onChange={(e) => set("ctaHref", e.target.value)} /></Field>
      </div>
    </div>
  );
}
