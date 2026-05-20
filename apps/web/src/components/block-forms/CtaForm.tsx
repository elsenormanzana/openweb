import { Input } from "@/components/ui/input";
import type { CtaBlockProps } from "@/lib/blocks";
import { Field, Textarea, ColorField, SelectField, CtaButtonField } from "./shared";

export function CtaForm({ props, onChange }: { props: CtaBlockProps; onChange: (p: CtaBlockProps) => void }) {
  const set = <K extends keyof CtaBlockProps>(k: K, v: CtaBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Description"><Textarea value={props.description} onChange={(v) => set("description", v)} /></Field>
      <ColorField label="Background color" value={props.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
      <SelectField label="Text color" value={props.textColor} onChange={(v) => set("textColor", v as "light" | "dark")} options={[{ value: "light", label: "Light (white)" }, { value: "dark", label: "Dark" }]} />
      <CtaButtonField label="Primary CTA" value={props.primaryCta} onChange={(v) => set("primaryCta", v)} />
      <CtaButtonField label="Secondary CTA" value={props.secondaryCta} onChange={(v) => set("secondaryCta", v)} />
    </div>
  );
}
