import type { ListBlockProps } from "@/lib/blocks";
import { Field, Textarea, ColorField, SelectField } from "./shared";

export function ListForm({ props, onChange }: { props: ListBlockProps; onChange: (p: ListBlockProps) => void }) {
  const set = <K extends keyof ListBlockProps>(k: K, v: ListBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Items (one per line)">
        <Textarea
          value={props.items.join("\n")}
          onChange={(v) => set("items", v.split("\n").map((s) => s.trim()).filter(Boolean))}
          rows={5}
          placeholder={"First item\nSecond item"}
        />
      </Field>
      <SelectField label="Marker" value={props.marker} onChange={(v) => set("marker", v as ListBlockProps["marker"])} options={[
        { value: "check", label: "Checkmark" }, { value: "dot", label: "Dot" },
        { value: "dash", label: "Dash" }, { value: "number", label: "Numbered" },
      ]} />
      {(props.marker === "check" || props.marker === "dot") && (
        <ColorField label="Marker color" value={props.iconColor} onChange={(v) => set("iconColor", v)} />
      )}
      <SelectField label="Align" value={props.align} onChange={(v) => set("align", v as ListBlockProps["align"])} options={[
        { value: "left", label: "Left" }, { value: "center", label: "Center" },
      ]} />
    </div>
  );
}
