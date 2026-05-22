import { useRef, type CSSProperties, type MouseEvent as ReactMouseEvent, useContext } from "react";
import type { ColumnsBlockProps } from "@/lib/blocks";
import { ContainerDropZone } from "./ContainerDropZone";
import { NestedBlockContext } from "@/components/BlockRenderer";

const GAP: Record<string, string> = { sm: "gap-6", md: "gap-10", lg: "gap-16" };
const PADDING: Record<string, string> = { sm: "py-10", md: "py-16", lg: "py-24" };
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
const MAX_TRACKS = 6;
const MAX_ROW_SPAN = 4;

export function ColumnsBlock({ props, editorProps, blockId }: { props: ColumnsBlockProps; editorProps?: any; blockId?: string }) {
  const { columns, gap, paddingY, bgColor } = props;
  const tracks = clamp(props.gridColumns ?? columns.length, 1, MAX_TRACKS);
  const gridRef = useRef<HTMLDivElement>(null);
  const canResize = !!editorProps?.isEditMode && !!editorProps?.onColumnSpanUpdate;
  const isNested = useContext(NestedBlockContext);

  // Drag a cell edge to change its grid span; snaps to whole tracks/rows.
  function startResize(index: number, axis: "colSpan" | "rowSpan", e: ReactMouseEvent) {
    if (!editorProps?.onColumnSpanUpdate || !blockId || !gridRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const grid = gridRef.current;
    const startX = e.clientX;
    const startY = e.clientY;
    const limit = axis === "colSpan" ? tracks : MAX_ROW_SPAN;
    const startSpan = clamp((axis === "colSpan" ? columns[index].colSpan : columns[index].rowSpan) ?? 1, 1, limit);
    const trackW = grid.getBoundingClientRect().width / tracks;
    const cell = grid.children[index] as HTMLElement | undefined;
    const rowH = cell ? cell.getBoundingClientRect().height / startSpan : 100;

    const onMove = (ev: MouseEvent) => {
      const next = axis === "colSpan"
        ? clamp(startSpan + Math.round((ev.clientX - startX) / trackW), 1, tracks)
        : clamp(startSpan + Math.round((ev.clientY - startY) / Math.max(rowH, 40)), 1, MAX_ROW_SPAN);
      editorProps.onColumnSpanUpdate(blockId, index, axis, next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const gridEl = (
    <div
      ref={gridRef}
      className={`grid grid-cols-1 sm:grid-cols-[var(--ow-cols)] ${GAP[gap]}`}
      style={{ "--ow-cols": `repeat(${tracks}, minmax(0,1fr))`, gridAutoRows: "minmax(80px,auto)" } as CSSProperties}
    >
      {columns.map((col, i) => {
        const colSpan = clamp(col.colSpan ?? 1, 1, tracks);
        const rowSpan = clamp(col.rowSpan ?? 1, 1, MAX_ROW_SPAN);
        return (
          <div
            key={col.id || i}
            className="relative flex flex-col group/cell"
            style={{ gridColumn: `span ${colSpan}`, gridRow: `span ${rowSpan}` }}
          >
            <ContainerDropZone
              blockId={blockId || ""}
              containerKey={`col-${i}`}
              blocks={col.blocks || []}
              editorProps={editorProps}
              label={`Column ${i + 1}`}
              fallbackContent={col.content}
            />
            {canResize && (
              <>
                <div
                  onMouseDown={(e) => startResize(i, "colSpan", e)}
                  title={`Drag to change column span (${colSpan})`}
                  className="hidden sm:block absolute top-0 -right-1.5 w-3 h-full cursor-col-resize z-30 rounded bg-blue-500/0 group-hover/cell:bg-blue-500/20 hover:bg-blue-500/50 transition-colors"
                />
                <div
                  onMouseDown={(e) => startResize(i, "rowSpan", e)}
                  title={`Drag to change row span (${rowSpan})`}
                  className="hidden sm:block absolute -bottom-1.5 left-0 h-3 w-full cursor-row-resize z-30 rounded bg-blue-500/0 group-hover/cell:bg-blue-500/20 hover:bg-blue-500/50 transition-colors"
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  if (isNested) {
    return gridEl;
  }

  return (
    <section
      className={`w-full px-4 ${PADDING[paddingY]}`}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      <div className="max-w-5xl mx-auto">
        {gridEl}
      </div>
    </section>
  );
}
