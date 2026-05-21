import type { CtaBlockProps } from "@/lib/blocks";
import { CtaButtonRenderer } from "@/components/shared/CtaButtonRenderer";

export function CtaBlock({ props }: { props: CtaBlockProps }) {
  const { heading, description, primaryCta, secondaryCta, backgroundColor, textColor } = props;
  const isLight = textColor === "light";
  const textClass = isLight ? "text-white" : "text-gray-900";
  const subTextClass = isLight ? "text-white/80" : "text-gray-600";

  return (
    <section style={{ backgroundColor }} className="w-full ow-section px-4">
      <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
        <h2 className={`text-3xl md:text-4xl font-bold ${textClass}`}>{heading}</h2>
        {description && <p className={`text-lg ${subTextClass}`}>{description}</p>}
        <div className="flex gap-4 flex-wrap justify-center">
          {primaryCta.label && (
            <CtaButtonRenderer cta={primaryCta} variant="shimmer" className="px-6 py-3 text-sm" />
          )}
          {secondaryCta.label && (
            <CtaButtonRenderer cta={secondaryCta} variant="outline" className={`px-6 py-3 text-sm ${isLight ? "border-white/50 text-white" : "border-gray-400 text-gray-700"}`} />
          )}
        </div>
      </div>
    </section>
  );
}
