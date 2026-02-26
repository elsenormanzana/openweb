import { Check } from "lucide-react";
import type { PricingBlockProps } from "@/lib/blocks";

export function PricingBlock({ props }: { props: PricingBlockProps }) {
  const { heading, subheading, tiers } = props;

  return (
    <section className="w-full py-20 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        {(heading || subheading) && (
          <div className="text-center mb-12">
            {heading && <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{heading}</h2>}
            {subheading && <p className="mt-3 text-lg text-gray-500">{subheading}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className={`flex flex-col gap-6 rounded-2xl p-8 border ${tier.highlighted ? "bg-gray-900 border-gray-900 text-white shadow-xl" : "bg-white border-gray-200"}`}
            >
              <div>
                <p className={`text-sm font-semibold uppercase tracking-wide ${tier.highlighted ? "text-blue-400" : "text-blue-600"}`}>{tier.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${tier.highlighted ? "text-white" : "text-gray-900"}`}>{tier.price}</span>
                  {tier.period && <span className={`text-sm ${tier.highlighted ? "text-gray-300" : "text-gray-500"}`}>{tier.period}</span>}
                </div>
                {tier.description && <p className={`mt-2 text-sm ${tier.highlighted ? "text-gray-300" : "text-gray-500"}`}>{tier.description}</p>}
              </div>
              {tier.features.length > 0 && (
                <ul className="flex flex-col gap-2 flex-1">
                  {tier.features.map((f, fi) => (
                    <li key={fi} className={`flex items-center gap-2 text-sm ${tier.highlighted ? "text-gray-200" : "text-gray-600"}`}>
                      <Check className="size-4 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              )}
              {tier.cta.label && (
                <a
                  href={tier.cta.href || "#"}
                  className={`mt-auto inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-semibold transition-colors ${tier.highlighted ? "bg-white text-gray-900 hover:bg-gray-100" : "bg-gray-900 text-white hover:bg-gray-700"}`}
                >
                  {tier.cta.label}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
