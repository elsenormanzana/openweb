import type { RowBlockProps, ColumnConfig } from "@/lib/blocks";
import { ColorField, SelectField } from "./shared";
import { Plus, Trash2, Columns, LayoutGrid } from "lucide-react";

export function RowForm({ props, onChange }: { props: RowBlockProps; onChange: (p: RowBlockProps) => void }) {
  const set = <K extends keyof RowBlockProps>(k: K, v: RowBlockProps[K]) => onChange({ ...props, [k]: v });

  const columns = props.columns || [
    { id: "col-1", width: "1/2", mobileWidth: "full", padding: "sm", bgColor: "", borderRadius: "none", blocks: [] },
    { id: "col-2", width: "1/2", mobileWidth: "full", padding: "sm", bgColor: "", borderRadius: "none", blocks: [] },
  ];

  const updateColumn = (index: number, updates: Partial<ColumnConfig>) => {
    const next = [...columns];
    next[index] = { ...next[index], ...updates };
    set("columns", next);
  };

  const addColumn = () => {
    const next = [...columns, { id: `col-${Date.now()}`, width: "1/3", mobileWidth: "full", padding: "sm", bgColor: "", borderRadius: "none", blocks: [] }];
    set("columns", next);
  };

  const removeColumn = (index: number) => {
    if (columns.length <= 1) return;
    const next = columns.filter((_, i) => i !== index);
    set("columns", next);
  };

  const applyPreset = (preset: { width: string; mobileWidth: string }[]) => {
    const next = preset.map((p, i) => ({
      id: columns[i]?.id || `col-${Date.now()}-${i}`,
      width: p.width,
      mobileWidth: p.mobileWidth,
      padding: columns[i]?.padding || "sm",
      bgColor: columns[i]?.bgColor || "",
      borderRadius: columns[i]?.borderRadius || "none",
      blocks: columns[i]?.blocks || [],
    }));
    set("columns", next);
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Column Presets */}
      <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-border">
        <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
          <LayoutGrid className="size-4 text-blue-500" /> Column Layout Presets
        </label>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button type="button" onClick={() => applyPreset([{ width: "full", mobileWidth: "full" }])} className="p-2 bg-background hover:bg-muted rounded border border-border text-center font-medium transition text-foreground">1 Col (100%)</button>
          <button type="button" onClick={() => applyPreset([{ width: "1/2", mobileWidth: "full" }, { width: "1/2", mobileWidth: "full" }])} className="p-2 bg-background hover:bg-muted rounded border border-border text-center font-medium transition text-foreground">2 Cols (50/50)</button>
          <button type="button" onClick={() => applyPreset([{ width: "1/3", mobileWidth: "full" }, { width: "2/3", mobileWidth: "full" }])} className="p-2 bg-background hover:bg-muted rounded border border-border text-center font-medium transition text-foreground">2 Cols (33/67)</button>
          <button type="button" onClick={() => applyPreset([{ width: "1/3", mobileWidth: "full" }, { width: "1/3", mobileWidth: "full" }, { width: "1/3", mobileWidth: "full" }])} className="p-2 bg-background hover:bg-muted rounded border border-border text-center font-medium transition text-foreground">3 Cols (33×3)</button>
          <button type="button" onClick={() => applyPreset([{ width: "1/4", mobileWidth: "1/2" }, { width: "1/2", mobileWidth: "full" }, { width: "1/4", mobileWidth: "1/2" }])} className="p-2 bg-background hover:bg-muted rounded border border-border text-center font-medium transition text-foreground">3 Cols (25/50/25)</button>
          <button type="button" onClick={() => applyPreset([{ width: "1/4", mobileWidth: "1/2" }, { width: "1/4", mobileWidth: "1/2" }, { width: "1/4", mobileWidth: "1/2" }, { width: "1/4", mobileWidth: "1/2" }])} className="p-2 bg-background hover:bg-muted rounded border border-border text-center font-medium transition text-foreground">4 Cols (25×4)</button>
        </div>
      </div>

      {/* Columns Management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5"><Columns className="size-4 text-blue-500" /> Individual Columns ({columns.length})</span>
          <button type="button" onClick={addColumn} className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition shadow-sm">
            <Plus className="size-3.5" /> Add Column
          </button>
        </div>
        <div className="space-y-3 pl-1">
          {columns.map((col, index) => (
            <div key={col.id} className="p-3 bg-muted/20 rounded-lg border border-border space-y-2.5 relative group">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">Column {index + 1}</span>
                {columns.length > 1 && (
                  <button type="button" onClick={() => removeColumn(index)} className="text-muted-foreground hover:text-red-400 transition p-1 rounded hover:bg-red-500/10">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <SelectField label="Desktop Width" value={col.width} onChange={(v) => updateColumn(index, { width: v })} options={[
                { value: "auto", label: "Auto Fit" },
                { value: "full", label: "100% (Full)" },
                { value: "1/2", label: "50% (1/2)" },
                { value: "1/3", label: "33% (1/3)" },
                { value: "2/3", label: "67% (2/3)" },
                { value: "1/4", label: "25% (1/4)" },
                { value: "3/4", label: "75% (3/4)" },
                { value: "1/5", label: "20% (1/5)" },
                { value: "2/5", label: "40% (2/5)" },
                { value: "3/5", label: "60% (3/5)" },
                { value: "4/5", label: "80% (4/5)" },
                { value: "1/6", label: "16.6% (1/6)" },
                { value: "5/6", label: "83.3% (5/6)" },
              ]} />
              <div className="grid grid-cols-2 gap-2">
                <SelectField label="Padding" value={col.padding || "sm"} onChange={(v) => updateColumn(index, { padding: v })} options={[
                  { value: "none", label: "None" },
                  { value: "sm", label: "Small" },
                  { value: "md", label: "Medium" },
                  { value: "lg", label: "Large" },
                ]} />
                <SelectField label="Radius" value={col.borderRadius || "none"} onChange={(v) => updateColumn(index, { borderRadius: v })} options={[
                  { value: "none", label: "None" },
                  { value: "sm", label: "Small" },
                  { value: "md", label: "Medium" },
                  { value: "lg", label: "Large" },
                ]} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SelectField label="Content Align (Vertical)" value={col.verticalAlign || "start"} onChange={(v) => updateColumn(index, { verticalAlign: v as any })} options={[
                  { value: "start", label: "Top (Start)" },
                  { value: "center", label: "Middle (Center)" },
                  { value: "end", label: "Bottom (End)" },
                  { value: "between", label: "Space Between" },
                ]} />
                <SelectField label="Column Box Align" value={col.alignSelf || "auto"} onChange={(v) => updateColumn(index, { alignSelf: v as any })} options={[
                  { value: "auto", label: "Auto (Row Default)" },
                  { value: "start", label: "Top (Start)" },
                  { value: "center", label: "Middle (Center)" },
                  { value: "end", label: "Bottom (End)" },
                  { value: "stretch", label: "Stretch" },
                ]} />
              </div>
              <ColorField label="Background Color" value={col.bgColor || ""} onChange={(v) => updateColumn(index, { bgColor: v })} />
            </div>
          ))}
        </div>
      </div>

      <hr className="border-border" />

      {/* Row Styling & Flex Settings */}
      <div className="space-y-3">
        <label className="font-semibold text-muted-foreground block">Row Container Styling</label>
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Gap" value={props.gap || "md"} onChange={(v) => set("gap", v as RowBlockProps["gap"])} options={[{ value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "Extra Large" }]} />
          <SelectField label="Max Width" value={props.maxWidth || "full"} onChange={(v) => set("maxWidth", v as RowBlockProps["maxWidth"])} options={[{ value: "full", label: "Full Width (100%)" }, { value: "2xl", label: "Container 2XL" }, { value: "xl", label: "Container XL" }, { value: "lg", label: "Container LG" }, { value: "md", label: "Container MD" }]} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Align Items" value={props.alignItems || "start"} onChange={(v) => set("alignItems", v as RowBlockProps["alignItems"])} options={[{ value: "start", label: "Top (Start)" }, { value: "center", label: "Middle (Center)" }, { value: "end", label: "Bottom (End)" }, { value: "stretch", label: "Stretch" }]} />
          <SelectField label="Justify" value={props.justifyContent || "start"} onChange={(v) => set("justifyContent", v as RowBlockProps["justifyContent"])} options={[{ value: "start", label: "Start" }, { value: "center", label: "Center" }, { value: "between", label: "Space Between" }, { value: "around", label: "Space Around" }, { value: "evenly", label: "Space Evenly" }]} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Padding Y" value={props.paddingY || "md"} onChange={(v) => set("paddingY", v as RowBlockProps["paddingY"])} options={[{ value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "Extra Large" }]} />
          <SelectField label="Padding X" value={props.paddingX || "md"} onChange={(v) => set("paddingX", v as RowBlockProps["paddingX"])} options={[{ value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "Extra Large" }]} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Border Radius" value={props.borderRadius || "none"} onChange={(v) => set("borderRadius", v as RowBlockProps["borderRadius"])} options={[{ value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "Extra Large" }, { value: "2xl", label: "2XL" }]} />
          <SelectField label="Shadow" value={props.shadow || "none"} onChange={(v) => set("shadow", v as RowBlockProps["shadow"])} options={[{ value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "Extra Large" }]} />
        </div>
        <ColorField label="Background Color" value={props.backgroundColor || ""} onChange={(v) => set("backgroundColor", v)} />
      </div>
    </div>
  );
}
