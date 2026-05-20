import type { DividerBlockProps } from "@/lib/blocks";
import { ColorField, SelectField } from "./shared";

export function DividerForm({ props, onChange }: { props: DividerBlockProps; onChange: (p: DividerBlockProps) => void }) {
  const set = <K extends keyof DividerBlockProps>(k: K, v: DividerBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <SelectField label="Style" value={props.style} onChange={(v) => set("style", v as DividerBlockProps["style"])} options={[
        { value: "solid", label: "Solid" },
        { value: "dashed", label: "Dashed" },
        { value: "dotted", label: "Dotted" },
        { value: "none", label: "None (space only)" },
      ]} />
      {props.style !== "none" && (
        <ColorField label="Color" value={props.color} onChange={(v) => set("color", v)} />
      )}
      <SelectField label="Padding" value={String(props.paddingY)} onChange={(v) => set("paddingY", Number(v) as DividerBlockProps["paddingY"])} options={[
        { value: "8", label: "Small (8px)" },
        { value: "16", label: "Medium (16px)" },
        { value: "32", label: "Large (32px)" },
        { value: "48", label: "X-Large (48px)" },
      ]} />
    </div>
  );
}
