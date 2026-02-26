import type { ColumnsBlockProps } from "@/lib/blocks";

const GAP: Record<string, string> = { sm: "gap-6", md: "gap-10", lg: "gap-16" };
const PADDING: Record<string, string> = { sm: "py-10", md: "py-16", lg: "py-24" };
const COLS: Record<number, string> = { 2: "grid-cols-2", 3: "grid-cols-3" };

export function ColumnsBlock({ props }: { props: ColumnsBlockProps }) {
  const { columns, gap, paddingY, bgColor } = props;
  const colCount = Math.min(Math.max(columns.length, 2), 3);

  return (
    <section
      className={`w-full px-4 ${PADDING[paddingY]}`}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      <div className={`max-w-5xl mx-auto grid ${COLS[colCount] ?? "grid-cols-2"} ${GAP[gap]}`}>
        {columns.map((col, i) => (
          <div
            key={i}
            className="prose prose-neutral max-w-none"
            dangerouslySetInnerHTML={{ __html: col.content }}
          />
        ))}
      </div>
    </section>
  );
}
