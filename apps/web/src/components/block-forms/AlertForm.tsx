import type { AlertBlockProps } from "@/lib/blocks";
import { Field, SelectField } from "./shared";
import { Input } from "@/components/ui/input";

export function AlertForm({ props, onChange }: { props: AlertBlockProps; onChange: (p: AlertBlockProps) => void }) {
  const set = <K extends keyof AlertBlockProps>(k: K, v: AlertBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <SelectField label="Alert Type" value={props.type} onChange={(v) => set("type", v as AlertBlockProps["type"])} options={[{ value: "info", label: "Info (Blue)" }, { value: "warning", label: "Warning (Yellow)" }, { value: "success", label: "Success (Green)" }, { value: "error", label: "Error (Red)" }]} />
      <Field label="Alert Title">
        <Input value={props.title} onChange={(e) => set("title", e.target.value)} placeholder="Title..." />
      </Field>
      <SelectField label="Variant Style" value={props.variant} onChange={(v) => set("variant", v as AlertBlockProps["variant"])} options={[{ value: "solid", label: "Solid Background" }, { value: "subtle", label: "Subtle Background" }, { value: "left-accent", label: "Left Accent Bar" }]} />
      <div className="flex items-center gap-2 pt-1">
        <input type="checkbox" id="alert-icon" checked={props.icon} onChange={(e) => set("icon", e.target.checked)} className="rounded" />
        <label htmlFor="alert-icon" className="text-sm font-medium">Show Icon</label>
      </div>
    </div>
  );
}
