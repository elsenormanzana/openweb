import { useContext } from "react";
import type { ButtonBlockProps } from "@/lib/blocks";
import { CtaButtonRenderer } from "@/components/shared/CtaButtonRenderer";
import { NestedBlockContext } from "@/components/BlockRenderer";

export function ButtonBlock({ props }: { props: ButtonBlockProps }) {
  const { align, label, href, variant, size, color, textColor, borderRadius, icon, emoji, iconPosition } = props;
  const isNested = useContext(NestedBlockContext);

  const buttonCta = {
    label,
    href,
    variant,
    size,
    color,
    textColor,
    borderRadius,
    icon,
    emoji,
    iconPosition,
  };

  const alignClass =
    align === "center" ? "justify-center text-center" :
    align === "right" ? "justify-end text-right" :
    align === "full" ? "justify-stretch text-center" :
    "justify-start text-left";

  const btnWidthClass = align === "full" ? "w-full" : "";

  const element = (
    <div className={`flex ${alignClass}`}>
      <CtaButtonRenderer
        cta={buttonCta}
        className={btnWidthClass}
      />
    </div>
  );

  if (isNested) {
    return element;
  }

  return (
    <div className="w-full py-4 px-4">
      <div className="max-w-5xl mx-auto">
        {element}
      </div>
    </div>
  );
}
