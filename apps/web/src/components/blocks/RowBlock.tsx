import { useRef } from "react";
import type { RowBlockProps } from "@/lib/blocks";
import { ContainerDropZone } from "./ContainerDropZone";

const GAP: Record<string, string> = { none: "gap-0", sm: "gap-3", md: "gap-6", lg: "gap-10", xl: "gap-16" };
const PADDING_Y: Record<string, string> = { none: "py-0", sm: "py-4", md: "py-8", lg: "py-16", xl: "py-24" };
const PADDING_X: Record<string, string> = { none: "px-0", sm: "px-4", md: "px-8", lg: "px-16", xl: "px-24" };
const RADIUS: Record<string, string> = { none: "rounded-none", sm: "rounded-sm", md: "rounded-md", lg: "rounded-lg", xl: "rounded-xl", "2xl": "rounded-2xl" };
const SHADOW: Record<string, string> = { none: "shadow-none", sm: "shadow-sm", md: "shadow-md", lg: "shadow-lg", xl: "shadow-xl" };
const MAX_WIDTH: Record<string, string> = { full: "max-w-full", "2xl": "max-w-7xl mx-auto", xl: "max-w-6xl mx-auto", lg: "max-w-5xl mx-auto", md: "max-w-4xl mx-auto" };

const DESKTOP_WIDTH: Record<string, string> = {
  auto: "md:flex-1 md:w-auto md:min-w-[200px]",
  full: "md:w-full md:flex-none",
  "1/2": "md:w-[calc(50%-1rem)] md:flex-none",
  "1/3": "md:w-[calc(33.333%-1rem)] md:flex-none",
  "2/3": "md:w-[calc(66.667%-1rem)] md:flex-none",
  "1/4": "md:w-[calc(25%-1rem)] md:flex-none",
  "3/4": "md:w-[calc(75%-1rem)] md:flex-none",
  "1/5": "md:w-[calc(20%-1rem)] md:flex-none",
  "2/5": "md:w-[calc(40%-1rem)] md:flex-none",
  "3/5": "md:w-[calc(60%-1rem)] md:flex-none",
  "4/5": "md:w-[calc(80%-1rem)] md:flex-none",
  "1/6": "md:w-[calc(16.666%-1rem)] md:flex-none",
  "5/6": "md:w-[calc(83.333%-1rem)] md:flex-none",
};



const COL_PADDING: Record<string, string> = { none: "p-0", sm: "p-3", md: "p-6", lg: "p-10" };

export function RowBlock({ props, editorProps, blockId }: { props: RowBlockProps; editorProps?: any; blockId?: string }) {
  const {
    columns,
    gap = "md",
    alignItems = "start",
    justifyContent = "start",
    paddingY = "md",
    paddingX = "md",
    backgroundColor,
    borderRadius = "none",
    border,
    borderColor,
    shadow = "none",
    maxWidth = "full",
    flexDirection = "row",
    blocks, // legacy
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);

  const directionClass = flexDirection === "col" ? "flex-col" : "flex-col md:flex-row md:flex-wrap";
  const alignClass = { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" }[alignItems] || "items-start";
  const justifyClass = { start: "justify-start", center: "justify-center", between: "justify-between", around: "justify-around", evenly: "justify-evenly" }[justifyContent] || "justify-start";

  const hasColumns = columns && columns.length > 0;

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    if (!editorProps?.onColumnUpdate || !blockId || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    const colElements = Array.from(container.children) as HTMLElement[];
    const el1 = colElements[index];
    const el2 = colElements[index + 1];
    if (!el1 || !el2) return;

    const startX = e.clientX;
    const w1 = el1.getBoundingClientRect().width;
    const w2 = el2.getBoundingClientRect().width;
    const totalW = w1 + w2;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let newW1 = w1 + deltaX;
      let newW2 = w2 - deltaX;

      const minW = totalW * 0.15;
      if (newW1 < minW) {
        newW1 = minW;
        newW2 = totalW - minW;
      } else if (newW2 < minW) {
        newW2 = minW;
        newW1 = totalW - minW;
      }

      const containerWidth = container.getBoundingClientRect().width;
      const pct1 = Math.round((newW1 / containerWidth) * 100);
      const pct2 = Math.round((newW2 / containerWidth) * 100);

      editorProps.onColumnUpdate(blockId, index, pct1, index + 1, pct2);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      className={`w-full ${PADDING_Y[paddingY]} ${PADDING_X[paddingX]} ${RADIUS[borderRadius]} ${SHADOW[shadow]} ${border ? "border" : ""}`}
      style={{
        backgroundColor: backgroundColor || undefined,
        borderColor: border ? (borderColor || "#e5e7eb") : undefined,
      }}
    >
      <div ref={containerRef} className={`w-full ${MAX_WIDTH[maxWidth]} flex ${directionClass} ${alignClass} ${justifyClass} ${GAP[gap]}`}>
        {hasColumns ? (
          columns.map((col, index) => {
            const dWidth = DESKTOP_WIDTH[col.width || "1/2"] || DESKTOP_WIDTH["1/2"];
            const cPad = COL_PADDING[col.padding || "sm"] || COL_PADDING.sm;
            const cRad = RADIUS[col.borderRadius || "none"] || RADIUS.none;

            const vAlignClass = { start: "justify-start", center: "justify-center", end: "justify-end", between: "justify-between" }[col.verticalAlign || "start"] || "justify-start";
            const selfAlignClass = { auto: "self-auto", start: "self-start", center: "self-center", end: "self-end", stretch: "self-stretch" }[col.alignSelf || "auto"] || "self-auto";

            const customStyle: React.CSSProperties = {
              "--col-custom-width": col.customWidth ? `calc(${col.customWidth}% - 1rem)` : undefined,
              backgroundColor: col.bgColor || undefined,
            } as React.CSSProperties;

            return (
              <div
                key={col.id || index}
                className={`w-full ${col.customWidth ? "md:w-[var(--col-custom-width)] md:flex-none" : dWidth} ${cPad} ${cRad} flex flex-col ${vAlignClass} ${selfAlignClass} transition-all duration-150 relative group/col`}
                style={customStyle}
              >
                {editorProps?.onColumnUpdate && index < columns.length - 1 && (
                  <div
                    className="absolute top-0 right-0 w-2.5 h-full cursor-col-resize z-40 bg-blue-500/0 hover:bg-blue-500/60 active:bg-blue-600 transition-colors group-hover/col:bg-blue-500/30"
                    title="Drag to resize columns"
                    onMouseDown={(e) => handleMouseDown(index, e)}
                  />
                )}

                <ContainerDropZone
                  blockId={blockId || ""}
                  containerKey={`col-${index}`}
                  blocks={col.blocks || []}
                  editorProps={editorProps}
                  label={`Column ${index + 1}`}
                />
              </div>
            );
          })
        ) : (
          /* Legacy fallback */
          <div className="flex-1 w-full">
            <ContainerDropZone
              blockId={blockId || ""}
              containerKey="row"
              blocks={blocks || []}
              editorProps={editorProps}
              label="Row Container"
            />
          </div>
        )}
      </div>
    </div>
  );
}
