import type { IconBlockProps } from "@/lib/blocks";
import { Field, ColorField, SelectField } from "./shared";

export function IconForm({ props, onChange }: { props: IconBlockProps; onChange: (p: IconBlockProps) => void }) {
  const set = <K extends keyof IconBlockProps>(k: K, v: IconBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Icon name">
        <input
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={props.icon}
          onChange={(e) => set("icon", e.target.value)}
          placeholder="rocket, star, zap, shield, check…"
        />
      </Field>
      <SelectField label="Size" value={props.size} onChange={(v) => set("size", v as IconBlockProps["size"])} options={[
        { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "Extra large" },
      ]} />
      <ColorField label="Color" value={props.color} onChange={(v) => set("color", v)} />
      <SelectField label="Align" value={props.align} onChange={(v) => set("align", v as IconBlockProps["align"])} options={[
        { value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" },
      ]} />
    </div>
  );
}
