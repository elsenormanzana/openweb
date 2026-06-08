import { Check } from "lucide-react";
import type { PricingBlockProps } from "@/lib/blocks";
import { CtaButtonRenderer } from "@/components/shared/CtaButtonRenderer";

export function PricingBlock({ props }: { props: PricingBlockProps }) {
  const { heading, subheading, tiers } = props;

  return (
    <section className="w-full ow-section px-4 bg-ow-surface">
      <div className="max-w-5xl mx-auto">
        {(heading || subheading) && (
          <div className="text-center mb-12">
            {heading && <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-ow-text">{heading}</h2>}
            {subheading && <p className="mt-3 text-lg text-ow-text-muted">{subheading}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className={`hover-lift flex flex-col gap-6 rounded-ow-xl p-8 border transition-shadow ${
                tier.highlighted
                  ? "bg-ow-secondary border-transparent text-ow-secondary-foreground shadow-ow-xl scale-[1.015]"
                  : "bg-ow-bg border-ow-border shadow-ow-sm hover:shadow-ow-md"
              }`}
            >
              <div>
                <p className={`text-sm font-semibold uppercase tracking-wide ${tier.highlighted ? "text-ow-secondary-foreground/80" : "text-ow-primary"}`}>{tier.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className={`text-4xl font-bold tracking-tight ${tier.highlighted ? "text-ow-secondary-foreground" : "text-ow-text"}`}>{tier.price}</span>
                  {tier.period && <span className={`text-sm ${tier.highlighted ? "text-ow-secondary-foreground/70" : "text-ow-text-muted"}`}>{tier.period}</span>}
                </div>
                {tier.description && <p className={`mt-2 text-sm ${tier.highlighted ? "text-ow-secondary-foreground/70" : "text-ow-text-muted"}`}>{tier.description}</p>}
              </div>
              {tier.features.length > 0 && (
                <ul className="flex flex-col gap-2.5 flex-1">
                  {tier.features.map((f, fi) => (
                    <li key={fi} className={`flex items-center gap-2 text-sm ${tier.highlighted ? "text-ow-secondary-foreground/90" : "text-ow-text-muted"}`}>
                      <Check className={`size-4 shrink-0 ${tier.highlighted ? "text-ow-secondary-foreground/90" : "text-ow-primary"}`} /> {f}
                    </li>
                  ))}
                </ul>
              )}
              {tier.cta.label && (
                <CtaButtonRenderer
                  cta={tier.cta}
                  variant={tier.highlighted ? "shimmer" : "solid"}
                  className="mt-auto px-6 py-3 text-sm"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
