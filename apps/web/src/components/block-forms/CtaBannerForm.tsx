import { Input } from "@/components/ui/input";
import type { CtaBannerBlockProps } from "@/lib/blocks";
import { Field, Textarea, SelectField } from "./shared";

export function CtaBannerForm({ props, onChange }: { props: CtaBannerBlockProps; onChange: (p: CtaBannerBlockProps) => void }) {
  const set = <K extends keyof CtaBannerBlockProps>(k: K, v: CtaBannerBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Description"><Textarea value={props.description} onChange={(v) => set("description", v)} /></Field>
      <Field label="Button text"><Input value={props.buttonText} onChange={(e) => set("buttonText", e.target.value)} /></Field>
      <Field label="Button URL"><Input value={props.buttonHref} onChange={(e) => set("buttonHref", e.target.value)} placeholder="https://..." /></Field>
      <SelectField label="Button style" value={props.buttonStyle} onChange={(v) => set("buttonStyle", v as CtaBannerBlockProps["buttonStyle"])} options={[{ value: "shimmer", label: "Shimmer" }, { value: "moving-border", label: "Moving Border" }, { value: "pulse-glow", label: "Pulse Glow" }]} />
    </div>
  );
}
