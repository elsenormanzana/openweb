import { Input } from "@/components/ui/input";
import type { AnimatedHeroBlockProps } from "@/lib/blocks";
import { Field, ColorField, SelectField, CtaButtonField } from "./shared";

export function AnimatedHeroForm({ props, onChange }: { props: AnimatedHeroBlockProps; onChange: (p: AnimatedHeroBlockProps) => void }) {
  const set = <K extends keyof AnimatedHeroBlockProps>(k: K, v: AnimatedHeroBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateGradient = (i: number, v: string) => {
    const colors = [...props.gradientColors];
    colors[i] = v;
    set("gradientColors", colors);
  };
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Subheading"><Input value={props.subheading} onChange={(e) => set("subheading", e.target.value)} /></Field>
      <ColorField label="Spotlight color" value={props.spotlightColor} onChange={(v) => set("spotlightColor", v)} />
      <SelectField label="Animation type" value={props.animationType} onChange={(v) => set("animationType", v as "spotlight" | "lamp" | "aurora")} options={[{ value: "spotlight", label: "Spotlight" }, { value: "lamp", label: "Lamp" }, { value: "aurora", label: "Aurora" }]} />
      <ColorField label="Gradient color 1" value={props.gradientColors[0] ?? ""} onChange={(v) => updateGradient(0, v)} />
      <ColorField label="Gradient color 2" value={props.gradientColors[1] ?? ""} onChange={(v) => updateGradient(1, v)} />
      <ColorField label="Gradient color 3" value={props.gradientColors[2] ?? ""} onChange={(v) => updateGradient(2, v)} />
      <CtaButtonField label="Primary CTA" value={props.primaryCta} onChange={(v) => set("primaryCta", v)} />
      <CtaButtonField label="Secondary CTA" value={props.secondaryCta} onChange={(v) => set("secondaryCta", v)} />
    </div>
  );
}
