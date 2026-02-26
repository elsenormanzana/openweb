import type { CtaBlockProps } from "@/lib/blocks";

export function CtaBlock({ props }: { props: CtaBlockProps }) {
  const { heading, description, primaryCta, secondaryCta, backgroundColor, textColor } = props;
  const isLight = textColor === "light";
  const textClass = isLight ? "text-white" : "text-gray-900";
  const subTextClass = isLight ? "text-white/80" : "text-gray-600";

  return (
    <section style={{ backgroundColor }} className="w-full py-20 px-4">
      <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
        <h2 className={`text-3xl md:text-4xl font-bold ${textClass}`}>{heading}</h2>
        {description && <p className={`text-lg ${subTextClass}`}>{description}</p>}
        <div className="flex gap-4 flex-wrap justify-center">
          {primaryCta.label && (
            <a
              href={primaryCta.href || "#"}
              className="inline-flex items-center justify-center rounded-md bg-white text-gray-900 px-6 py-3 text-sm font-semibold shadow hover:bg-gray-100 transition-colors"
            >
              {primaryCta.label}
            </a>
          )}
          {secondaryCta.label && (
            <a
              href={secondaryCta.href || "#"}
              className={`inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-semibold border transition-colors ${isLight ? "border-white/50 text-white hover:bg-white/10" : "border-gray-400 text-gray-700 hover:bg-gray-100"}`}
            >
              {secondaryCta.label}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
