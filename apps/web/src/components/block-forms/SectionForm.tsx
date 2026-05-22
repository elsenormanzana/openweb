import type { SectionBlockProps } from "@/lib/blocks";
import { Field, ColorField, ImagePickerField, SelectField } from "./shared";

const PAD = [
  { value: "none", label: "None" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra large" },
];

export function SectionForm({ props, onChange }: { props: SectionBlockProps; onChange: (p: SectionBlockProps) => void }) {
  const set = <K extends keyof SectionBlockProps>(k: K, v: SectionBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <ColorField label="Background color" value={props.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
      <ImagePickerField label="Background image" value={props.backgroundImage} onChange={(v) => set("backgroundImage", v)} />
      {props.backgroundImage && (
        <Field label="Background image opacity (%)">
          <input
            type="number" min={0} max={100}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={props.backgroundOpacity}
            onChange={(e) => set("backgroundOpacity", Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
          />
        </Field>
      )}
      <SelectField label="Vertical padding" value={props.paddingY} onChange={(v) => set("paddingY", v as SectionBlockProps["paddingY"])} options={PAD} />
      <SelectField label="Horizontal padding" value={props.paddingX} onChange={(v) => set("paddingX", v as SectionBlockProps["paddingX"])} options={PAD} />
      <SelectField label="Content width" value={props.maxWidth} onChange={(v) => set("maxWidth", v as SectionBlockProps["maxWidth"])} options={[
        { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" },
        { value: "xl", label: "Extra large" }, { value: "2xl", label: "Wide" }, { value: "full", label: "Full width" },
      ]} />
      <SelectField label="Content align" value={props.align} onChange={(v) => set("align", v as SectionBlockProps["align"])} options={[
        { value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" },
      ]} />
      <SelectField label="Text color" value={props.textColor} onChange={(v) => set("textColor", v as SectionBlockProps["textColor"])} options={[
        { value: "auto", label: "Auto" }, { value: "dark", label: "Dark" }, { value: "light", label: "Light" },
      ]} />
    </div>
  );
}
