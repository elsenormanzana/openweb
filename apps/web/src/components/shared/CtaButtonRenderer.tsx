import type { CtaButton } from "@/lib/blocks";
import { IconRenderer } from "./IconRenderer";

export function CtaButtonRenderer({
  cta,
  className = "",
  variant = "solid",
}: {
  cta: CtaButton;
  className?: string;
  variant?: "solid" | "outline" | "glass" | "shimmer" | string;
}) {
  if (!cta || !cta.label) return null;

  const isLeft = cta.iconPosition === "left" || !cta.iconPosition; // default left
  const isRight = cta.iconPosition === "right";

  const activeVariant = cta.variant || variant || "solid";
  const activeSize = cta.size;
  const activeRadius = cta.borderRadius || "md";

  let baseClass = "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 shadow-sm ";

  // Radius classes
  if (activeRadius === "none") baseClass += "rounded-none ";
  else if (activeRadius === "sm") baseClass += "rounded-sm ";
  else if (activeRadius === "lg") baseClass += "rounded-lg ";
  else if (activeRadius === "full") baseClass += "rounded-full ";
  else baseClass += "rounded-md ";

  // Size classes (apply if cta.size is explicitly set, otherwise rely on className or default)
  if (activeSize === "sm") baseClass += "px-3 py-1.5 text-xs ";
  else if (activeSize === "md") baseClass += "px-5 py-2.5 text-sm ";
  else if (activeSize === "lg") baseClass += "px-8 py-3.5 text-lg ";

  // Variant & Color logic
  let customStyle: React.CSSProperties = {};

  if (activeVariant === "outline") {
    baseClass += "border border-current bg-transparent hover:bg-black/5 dark:hover:bg-white/10 ";
    if (cta.color) customStyle.borderColor = cta.color;
    if (cta.textColor || cta.color) customStyle.color = cta.textColor || cta.color;
    // Surface-aware default — dark on light surfaces, light on dark ones.
    else baseClass += "text-neutral-800 dark:text-neutral-100 ";
  } else if (activeVariant === "glass") {
    baseClass += "backdrop-blur-md border hover:shadow-lg bg-black/5 border-black/10 text-neutral-800 hover:bg-black/10 dark:bg-white/10 dark:border-white/20 dark:text-white dark:hover:bg-white/20 ";
    if (cta.textColor) customStyle.color = cta.textColor;
  } else if (activeVariant === "shimmer") {
    baseClass += "relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white hover:shadow-lg hover:scale-[1.02] ";
    if (cta.textColor) customStyle.color = cta.textColor;
  } else {
    // solid
    baseClass += "hover:shadow hover:opacity-90 ";
    if (cta.color) {
      customStyle.backgroundColor = cta.color;
    } else if (!className.includes("bg-")) {
      baseClass += "bg-blue-600 text-white ";
    }

    if (cta.textColor) customStyle.color = cta.textColor;
  }

  return (
    <a href={cta.href || "#"} className={`${className} ${baseClass}`} style={customStyle}>
      {isLeft && (
        <>
          {cta.emoji && <span className="text-base">{cta.emoji}</span>}
          {cta.icon && !cta.emoji && <IconRenderer icon={cta.icon} className="size-4.5" />}
        </>
      )}

      <span>{cta.label}</span>

      {isRight && (
        <>
          {cta.emoji && <span className="text-base">{cta.emoji}</span>}
          {cta.icon && !cta.emoji && <IconRenderer icon={cta.icon} className="size-4.5" />}
        </>
      )}
    </a>
  );
}
