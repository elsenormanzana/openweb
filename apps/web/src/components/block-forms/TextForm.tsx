import type { TextBlockProps } from "@/lib/blocks";
import { SelectField } from "./shared";
import { RichTextEditor } from "@/components/editor/RichTextEditor";

export function TextForm({ props, onChange }: { props: TextBlockProps; onChange: (p: TextBlockProps) => void }) {
  const set = <K extends keyof TextBlockProps>(k: K, v: TextBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <SelectField label="Alignment" value={props.align} onChange={(v) => set("align", v as "left" | "center" | "right")} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} />
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Content</p>
        <RichTextEditor content={props.content} onChange={(v) => set("content", v)} placeholder="Start typing..." />
      </div>
    </div>
  );
}
