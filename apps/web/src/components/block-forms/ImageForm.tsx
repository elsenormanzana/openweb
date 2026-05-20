import { Input } from "@/components/ui/input";
import type { ImageBlockProps } from "@/lib/blocks";
import { Field, ImagePickerField, SelectField } from "./shared";

export function ImageForm({ props, onChange }: { props: ImageBlockProps; onChange: (p: ImageBlockProps) => void }) {
  const set = <K extends keyof ImageBlockProps>(k: K, v: ImageBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <ImagePickerField label="Image" value={props.src} onChange={(v) => set("src", v)} />
      <Field label="Alt text"><Input value={props.alt} onChange={(e) => set("alt", e.target.value)} /></Field>
      <SelectField label="Width" value={props.width} onChange={(v) => set("width", v as "full" | "contained")} options={[{ value: "contained", label: "Contained" }, { value: "full", label: "Full width" }]} />
      <Field label="Caption"><Input value={props.caption} onChange={(e) => set("caption", e.target.value)} /></Field>
    </div>
  );
}
