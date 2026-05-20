import type { AnimatedTextBlockProps } from "@/lib/blocks";
import { Field, Textarea, ColorField, SelectField } from "./shared";

export function AnimatedTextForm({ props, onChange }: { props: AnimatedTextBlockProps; onChange: (p: AnimatedTextBlockProps) => void }) {
  const set = <K extends keyof AnimatedTextBlockProps>(k: K, v: AnimatedTextBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateGradient = (i: number, v: string) => {
    const colors = [...props.gradientColors];
    colors[i] = v;
    set("gradientColors", colors);
  };
  return (
    <div className="space-y-3">
      <Field label="Text"><Textarea value={props.text} onChange={(v) => set("text", v)} /></Field>
      <SelectField label="Animation" value={props.animation} onChange={(v) => set("animation", v as AnimatedTextBlockProps["animation"])} options={[{ value: "typewriter", label: "Typewriter" }, { value: "generate", label: "Generate" }, { value: "gradient", label: "Gradient" }, { value: "blur-in", label: "Blur In" }, { value: "fade-up", label: "Fade Up" }]} />
      <Field label={`Speed — ${props.speed}`}>
        <input type="range" min="10" max="200" value={props.speed} onChange={(e) => set("speed", Number(e.target.value))} className="w-full accent-blue-600" />
      </Field>
      <ColorField label="Gradient color 1" value={props.gradientColors[0] ?? ""} onChange={(v) => updateGradient(0, v)} />
      <ColorField label="Gradient color 2" value={props.gradientColors[1] ?? ""} onChange={(v) => updateGradient(1, v)} />
      <SelectField label="Alignment" value={props.align} onChange={(v) => set("align", v as "left" | "center" | "right")} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} />
    </div>
  );
}
