import type { SectionBlockProps } from "@/lib/blocks";
import { ContainerDropZone } from "./ContainerDropZone";

const PADDING_Y: Record<SectionBlockProps["paddingY"], string> = {
  none: "py-0", sm: "py-6", md: "py-10 sm:py-14", lg: "ow-section", xl: "py-16 sm:py-24 lg:py-28",
};
const PADDING_X: Record<SectionBlockProps["paddingX"], string> = {
  none: "px-0", sm: "px-3", md: "px-4 sm:px-6", lg: "px-6 sm:px-8", xl: "px-8 sm:px-12",
};
const MAX_WIDTH: Record<SectionBlockProps["maxWidth"], string> = {
  sm: "max-w-2xl", md: "max-w-4xl", lg: "max-w-5xl", xl: "max-w-6xl", "2xl": "max-w-7xl", full: "max-w-full",
};
const ALIGN: Record<SectionBlockProps["align"], string> = {
  left: "text-left", center: "text-center", right: "text-right",
};

/** Full-width container — the backbone of editable pre-made block compositions. */
export function SectionBlock({
  props, editorProps, blockId,
}: { props: SectionBlockProps; editorProps?: any; blockId?: string }) {
  const { backgroundColor, backgroundImage, backgroundOpacity, paddingY, paddingX, maxWidth, align, textColor, blocks } = props;
  const hasImage = !!backgroundImage;
  const textClass = textColor === "light" ? "text-white" : textColor === "dark" ? "text-gray-900" : "";

  return (
    <section
      className={`relative w-full ${PADDING_Y[paddingY]} ${PADDING_X[paddingX]} ${textClass}`}
      style={backgroundColor && !hasImage ? { backgroundColor } : undefined}
    >
      {hasImage && (
        <>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${backgroundImage})` }} />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: backgroundColor || "#000000", opacity: 1 - (backgroundOpacity ?? 100) / 100 }}
          />
        </>
      )}
      <div className={`relative ${MAX_WIDTH[maxWidth]} mx-auto ${ALIGN[align]}`}>
        <ContainerDropZone
          blockId={blockId || ""}
          containerKey="section"
          blocks={blocks || []}
          editorProps={editorProps}
          label="Section"
        />
      </div>
    </section>
  );
}
