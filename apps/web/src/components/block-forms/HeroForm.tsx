import { Input } from "@/components/ui/input";
import type { HeroBlockProps } from "@/lib/blocks";
import { Field, Textarea, ColorField, ImagePickerField, SelectField, CtaButtonField } from "./shared";

export function HeroForm({ props, onChange }: { props: HeroBlockProps; onChange: (p: HeroBlockProps) => void }) {
  const set = <K extends keyof HeroBlockProps>(k: K, v: HeroBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Subheading"><Input value={props.subheading} onChange={(e) => set("subheading", e.target.value)} /></Field>
      <Field label="Description"><Textarea value={props.description} onChange={(v) => set("description", v)} /></Field>
      <Field label="Badge text"><Input value={props.badgeText} onChange={(e) => set("badgeText", e.target.value)} /></Field>
      <SelectField label="Alignment" value={props.align} onChange={(v) => set("align", v as "left" | "center")} options={[{ value: "center", label: "Center" }, { value: "left", label: "Left" }]} />
      <SelectField label="Text color" value={props.textColor} onChange={(v) => set("textColor", v as "light" | "dark")} options={[{ value: "light", label: "Light (white)" }, { value: "dark", label: "Dark" }]} />
      <SelectField label="Background" value={props.backgroundType} onChange={(v) => set("backgroundType", v as "color" | "image" | "video")} options={[{ value: "color", label: "Color" }, { value: "image", label: "Image" }, { value: "video", label: "Video" }]} />
      {props.backgroundType === "color" && (
        <ColorField label="Background color" value={props.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
      )}
      {props.backgroundType === "image" && (
        <ImagePickerField label="Background image" value={props.backgroundImage} onChange={(v) => set("backgroundImage", v)} />
      )}
      {props.backgroundType === "video" && (
        <ImagePickerField label="Background video" value={props.backgroundVideo} onChange={(v) => set("backgroundVideo", v)} />
      )}
      {(props.backgroundType === "image" || props.backgroundType === "video") && (
        <Field label={`Overlay opacity — ${props.backgroundOpacity ?? 50}%`}>
          <input
            type="range" min="0" max="100"
            value={props.backgroundOpacity ?? 50}
            onChange={(e) => set("backgroundOpacity", Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </Field>
      )}
      <CtaButtonField label="Primary CTA" value={props.primaryCta} onChange={(v) => set("primaryCta", v)} />
      <CtaButtonField label="Secondary CTA" value={props.secondaryCta} onChange={(v) => set("secondaryCta", v)} />
    </div>
  );
}
