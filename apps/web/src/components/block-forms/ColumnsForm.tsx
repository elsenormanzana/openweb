import type { ColumnsBlockProps, ColumnItem } from "@/lib/blocks";
import { Field, ColorField, SelectField } from "./shared";
import { RichTextEditor } from "@/components/editor/RichTextEditor";

const NUM = "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm";
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

export function ColumnsForm({ props, onChange }: { props: ColumnsBlockProps; onChange: (p: ColumnsBlockProps) => void }) {
  const set = <K extends keyof ColumnsBlockProps>(k: K, v: ColumnsBlockProps[K]) => onChange({ ...props, [k]: v });
  const tracks = clamp(props.gridColumns ?? props.columns.length, 1, 6);

  const setColCount = (n: number) => {
    const cols = [...props.columns];
    while (cols.length < n) cols.push({ content: "<p>Column content</p>", blocks: [], colSpan: 1, rowSpan: 1 });
    set("columns", cols.slice(0, n));
  };
  const updateCol = (i: number, patch: Partial<ColumnItem>) =>
    set("columns", props.columns.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-3">
      <SelectField
        label="Number of columns"
        value={String(props.columns.length)}
        onChange={(v) => setColCount(Number(v))}
        options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n} columns` }))}
      />
      <Field label="Grid tracks (total span width)">
        <input
          type="number" min={1} max={6} className={NUM}
          value={tracks}
          onChange={(e) => set("gridColumns", clamp(Number(e.target.value) || 1, 1, 6))}
        />
      </Field>
      <SelectField label="Gap" value={props.gap} onChange={(v) => set("gap", v as ColumnsBlockProps["gap"])} options={[
        { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" },
      ]} />
      <SelectField label="Vertical padding" value={props.paddingY} onChange={(v) => set("paddingY", v as ColumnsBlockProps["paddingY"])} options={[
        { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" },
      ]} />
      <ColorField label="Background (leave blank for none)" value={props.bgColor} onChange={(v) => set("bgColor", v)} />
      {props.columns.map((col, i) => (
        <div key={i} className="space-y-1.5 rounded-lg border border-border p-2">
          <p className="text-xs font-medium text-muted-foreground">Column {i + 1}</p>
          <div className="flex gap-2">
            <label className="flex-1 text-[11px] text-muted-foreground">
              Col span
              <input
                type="number" min={1} max={tracks} className={NUM}
                value={col.colSpan ?? 1}
                onChange={(e) => updateCol(i, { colSpan: clamp(Number(e.target.value) || 1, 1, tracks) })}
              />
            </label>
            <label className="flex-1 text-[11px] text-muted-foreground">
              Row span
              <input
                type="number" min={1} max={4} className={NUM}
                value={col.rowSpan ?? 1}
                onChange={(e) => updateCol(i, { rowSpan: clamp(Number(e.target.value) || 1, 1, 4) })}
              />
            </label>
          </div>
          <RichTextEditor content={col.content} onChange={(v) => updateCol(i, { content: v })} placeholder="Column content..." />
        </div>
      ))}
    </div>
  );
}
