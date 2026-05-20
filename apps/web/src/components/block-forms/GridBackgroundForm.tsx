import { Input } from "@/components/ui/input";
import type { GridBackgroundBlockProps } from "@/lib/blocks";
import { Field, Textarea, ColorField, SelectField, CtaButtonField } from "./shared";

export function GridBackgroundForm({ props, onChange }: { props: GridBackgroundBlockProps; onChange: (p: GridBackgroundBlockProps) => void }) {
  const set = <K extends keyof GridBackgroundBlockProps>(k: K, v: GridBackgroundBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Description"><Textarea value={props.description} onChange={(v) => set("description", v)} /></Field>
      <CtaButtonField label="CTA" value={props.cta} onChange={(v) => set("cta", v)} />
      <SelectField label="Pattern" value={props.pattern} onChange={(v) => set("pattern", v as GridBackgroundBlockProps["pattern"])} options={[{ value: "grid", label: "Grid" }, { value: "dots", label: "Dots" }, { value: "lines", label: "Lines" }]} />
      <ColorField label="Pattern color" value={props.patternColor} onChange={(v) => set("patternColor", v)} />
      <Field label={`Opacity — ${props.opacity}%`}>
        <input type="range" min="0" max="100" value={props.opacity} onChange={(e) => set("opacity", Number(e.target.value))} className="w-full accent-blue-600" />
      </Field>
    </div>
  );
}
