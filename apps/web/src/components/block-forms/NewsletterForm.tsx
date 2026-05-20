import { Input } from "@/components/ui/input";
import type { NewsletterBlockProps } from "@/lib/blocks";
import { Field, Textarea, ColorField, SelectField } from "./shared";

export function NewsletterForm({ props, onChange }: { props: NewsletterBlockProps; onChange: (p: NewsletterBlockProps) => void }) {
  const set = <K extends keyof NewsletterBlockProps>(k: K, v: NewsletterBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Description"><Textarea value={props.description} onChange={(v) => set("description", v)} rows={2} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Input placeholder"><Input value={props.placeholder} onChange={(e) => set("placeholder", e.target.value)} /></Field>
        <Field label="Button label"><Input value={props.buttonLabel} onChange={(e) => set("buttonLabel", e.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={props.collectName} onChange={(e) => set("collectName", e.target.checked)} className="rounded" />
        Collect name field
      </label>
      <ColorField label="Background color" value={props.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
      <SelectField label="Text color" value={props.textColor} onChange={(v) => set("textColor", v as "light" | "dark")} options={[{ value: "light", label: "Light (white)" }, { value: "dark", label: "Dark" }]} />
      <SelectField label="Alignment" value={props.align} onChange={(v) => set("align", v as "left" | "center")} options={[{ value: "center", label: "Center" }, { value: "left", label: "Left" }]} />
    </div>
  );
}
