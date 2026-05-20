import { Input } from "@/components/ui/input";
import type { HeadingBlockProps } from "@/lib/blocks";
import { Field, ColorField, SelectField } from "./shared";

export function HeadingForm({ props, onChange }: { props: HeadingBlockProps; onChange: (p: HeadingBlockProps) => void }) {
  const set = <K extends keyof HeadingBlockProps>(k: K, v: HeadingBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Text"><Input value={props.text} onChange={(e) => set("text", e.target.value)} /></Field>
      <SelectField label="Heading level" value={props.level} onChange={(v) => set("level", v as HeadingBlockProps["level"])} options={[
        { value: "h1", label: "H1 — Largest" },
        { value: "h2", label: "H2" },
        { value: "h3", label: "H3" },
        { value: "h4", label: "H4" },
        { value: "h5", label: "H5" },
        { value: "h6", label: "H6 — Smallest" },
      ]} />
      <SelectField label="Alignment" value={props.align} onChange={(v) => set("align", v as "left" | "center" | "right")} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} />
      <ColorField label="Color (leave blank for default)" value={props.color} onChange={(v) => set("color", v)} />
    </div>
  );
}
