import type { ColumnsBlockProps } from "@/lib/blocks";
import { ColorField, SelectField } from "./shared";
import { RichTextEditor } from "@/components/editor/RichTextEditor";

export function ColumnsForm({ props, onChange }: { props: ColumnsBlockProps; onChange: (p: ColumnsBlockProps) => void }) {
  const set = <K extends keyof ColumnsBlockProps>(k: K, v: ColumnsBlockProps[K]) => onChange({ ...props, [k]: v });
  const setColCount = (n: number) => {
    const cols = [...props.columns];
    while (cols.length < n) cols.push({ content: "<p>Column content</p>" });
    set("columns", cols.slice(0, n));
  };
  const updateCol = (i: number, v: string) =>
    set("columns", props.columns.map((c, idx) => idx === i ? { ...c, content: v } : c));
  return (
    <div className="space-y-3">
      <SelectField label="Number of columns" value={String(props.columns.length)} onChange={(v) => setColCount(Number(v))} options={[{ value: "2", label: "2 columns" }, { value: "3", label: "3 columns" }]} />
      <SelectField label="Gap" value={props.gap} onChange={(v) => set("gap", v as ColumnsBlockProps["gap"])} options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]} />
      <SelectField label="Vertical padding" value={props.paddingY} onChange={(v) => set("paddingY", v as ColumnsBlockProps["paddingY"])} options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]} />
      <ColorField label="Background (leave blank for none)" value={props.bgColor} onChange={(v) => set("bgColor", v)} />
      {props.columns.map((col, i) => (
        <div key={i} className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Column {i + 1}</p>
          <RichTextEditor content={col.content} onChange={(v) => updateCol(i, v)} placeholder="Column content..." />
        </div>
      ))}
    </div>
  );
}
