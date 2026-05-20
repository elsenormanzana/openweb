import { Input } from "@/components/ui/input";
import type { ImageComparisonBlockProps } from "@/lib/blocks";
import { Field, SelectField, ImagePickerField } from "./shared";

export function ImageComparisonForm({ props, onChange }: { props: ImageComparisonBlockProps; onChange: (p: ImageComparisonBlockProps) => void }) {
  const set = <K extends keyof ImageComparisonBlockProps>(k: K, v: ImageComparisonBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <ImagePickerField label="Before image" value={props.beforeImage} onChange={(v) => set("beforeImage", v)} />
      <ImagePickerField label="After image" value={props.afterImage} onChange={(v) => set("afterImage", v)} />
      <Field label="Before label"><Input value={props.beforeLabel} onChange={(e) => set("beforeLabel", e.target.value)} /></Field>
      <Field label="After label"><Input value={props.afterLabel} onChange={(e) => set("afterLabel", e.target.value)} /></Field>
      <SelectField label="Orientation" value={props.orientation} onChange={(v) => set("orientation", v as "horizontal" | "vertical")} options={[{ value: "horizontal", label: "Horizontal" }, { value: "vertical", label: "Vertical" }]} />
    </div>
  );
}
