import type { CardBlockProps } from "@/lib/blocks";
import { Field, ColorField, SelectField, ImagePickerField } from "./shared";
import { Input } from "@/components/ui/input";

export function CardForm({ props, onChange }: { props: CardBlockProps; onChange: (p: CardBlockProps) => void }) {
  const set = <K extends keyof CardBlockProps>(k: K, v: CardBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Card Title">
        <Input value={props.title} onChange={(e) => set("title", e.target.value)} placeholder="Title..." />
      </Field>
      <Field label="Card Subtitle">
        <Input value={props.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="Subtitle..." />
      </Field>
      <ImagePickerField label="Card Image (optional)" value={props.image} onChange={(v) => set("image", v)} />
      <SelectField label="Padding" value={props.padding} onChange={(v) => set("padding", v as CardBlockProps["padding"])} options={[{ value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]} />
      <SelectField label="Border Radius" value={props.borderRadius} onChange={(v) => set("borderRadius", v as CardBlockProps["borderRadius"])} options={[{ value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]} />
      <SelectField label="Shadow" value={props.shadow} onChange={(v) => set("shadow", v as CardBlockProps["shadow"])} options={[{ value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]} />
      <ColorField label="Background Color" value={props.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
      <ColorField label="Border Color" value={props.borderColor} onChange={(v) => set("borderColor", v)} />
    </div>
  );
}
