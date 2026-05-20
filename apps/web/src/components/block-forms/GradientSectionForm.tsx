import { Input } from "@/components/ui/input";
import type { GradientSectionBlockProps } from "@/lib/blocks";
import { Field, Textarea, ColorField, SelectField, CtaButtonField } from "./shared";

export function GradientSectionForm({ props, onChange }: { props: GradientSectionBlockProps; onChange: (p: GradientSectionBlockProps) => void }) {
  const set = <K extends keyof GradientSectionBlockProps>(k: K, v: GradientSectionBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateColor = (i: number, v: string) => {
    const colors = [...props.colors];
    colors[i] = v;
    set("colors", colors);
  };
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Description"><Textarea value={props.description} onChange={(v) => set("description", v)} /></Field>
      <CtaButtonField label="CTA" value={props.cta} onChange={(v) => set("cta", v)} />
      <SelectField label="Animation" value={props.animation} onChange={(v) => set("animation", v as GradientSectionBlockProps["animation"])} options={[{ value: "aurora", label: "Aurora" }, { value: "gradient-flow", label: "Gradient Flow" }, { value: "meteors", label: "Meteors" }]} />
      <ColorField label="Color 1" value={props.colors[0] ?? ""} onChange={(v) => updateColor(0, v)} />
      <ColorField label="Color 2" value={props.colors[1] ?? ""} onChange={(v) => updateColor(1, v)} />
      <ColorField label="Color 3" value={props.colors[2] ?? ""} onChange={(v) => updateColor(2, v)} />
    </div>
  );
}
