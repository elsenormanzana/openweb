import type { ColumnsBlockProps } from "@/lib/blocks";
import { ContainerDropZone } from "./ContainerDropZone";

const GAP: Record<string, string> = { sm: "gap-6", md: "gap-10", lg: "gap-16" };
const PADDING: Record<string, string> = { sm: "py-10", md: "py-16", lg: "py-24" };
const COLS: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
};

export function ColumnsBlock({ props, editorProps, blockId }: { props: ColumnsBlockProps; editorProps?: any; blockId?: string }) {
  const { columns, gap, paddingY, bgColor } = props;
  const colCount = Math.min(Math.max(columns.length, 2), 3);

  return (
    <section
      className={`w-full px-4 ${PADDING[paddingY]}`}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      <div className={`max-w-5xl mx-auto grid ${COLS[colCount] ?? "grid-cols-2"} ${GAP[gap]}`}>
        {columns.map((col, i) => (
          <div key={col.id || i} className="flex flex-col">
            <ContainerDropZone
              blockId={blockId || ""}
              containerKey={`col-${i}`}
              blocks={col.blocks || []}
              editorProps={editorProps}
              label={`Column ${i + 1}`}
              fallbackContent={col.content}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
