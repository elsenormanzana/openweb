import type { CardBlockProps } from "@/lib/blocks";
import { ContainerDropZone } from "./ContainerDropZone";

const PADDING: Record<string, string> = { none: "p-0", sm: "p-4", md: "p-6", lg: "p-10" };
const RADIUS: Record<string, string> = { none: "rounded-none", sm: "rounded-sm", md: "rounded-xl", lg: "rounded-2xl" };
const SHADOW: Record<string, string> = { none: "shadow-none", sm: "shadow-sm", md: "shadow-lg", lg: "shadow-2xl" };

export function CardBlock({ props, editorProps, blockId }: { props: CardBlockProps; editorProps?: any; blockId?: string }) {
  const { title, subtitle, image, backgroundColor, borderColor, borderRadius, padding, shadow, blocks } = props;

  return (
    <div
      className={`w-full max-w-4xl mx-auto border overflow-hidden transition-all ${RADIUS[borderRadius]} ${SHADOW[shadow]}`}
      style={{
        backgroundColor: backgroundColor || "#ffffff",
        borderColor: borderColor || "#e5e7eb",
      }}
    >
      {image && (
        <div className="w-full h-56 md:h-72 overflow-hidden bg-muted">
          <img src={image} alt={title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className={`${PADDING[padding]}`}>
        {(title || subtitle) && (
          <div className="mb-4 border-b pb-3">
            {title && <h3 className="text-2xl font-bold tracking-tight text-foreground">{title}</h3>}
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
        )}
        <ContainerDropZone
          blockId={blockId || ""}
          containerKey="card"
          blocks={blocks || []}
          editorProps={editorProps}
          label="Card Body"
        />
      </div>
    </div>
  );
}
