import type { SpacerBlockProps } from "@/lib/blocks";
import { SelectField } from "./shared";

export function SpacerForm({ props, onChange }: { props: SpacerBlockProps; onChange: (p: SpacerBlockProps) => void }) {
  return (
    <SelectField label="Height" value={String(props.height)} onChange={(v) => onChange({ height: Number(v) as SpacerBlockProps["height"] })} options={[16, 32, 48, 64, 96, 128].map((h) => ({ value: String(h), label: `${h}px` }))} />
  );
}
