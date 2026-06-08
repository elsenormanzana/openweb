import type { FeaturesBlockProps } from "@/lib/blocks";
import { FEATURE_ICON_MAP } from "@/lib/featureIcons";

export function FeaturesBlock({ props }: { props: FeaturesBlockProps }) {
  const { heading, subheading, columns, items } = props;
  const colClass = columns === 2 ? "sm:grid-cols-2" : columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="w-full ow-section px-4 bg-ow-bg">
      <div className="max-w-5xl mx-auto">
        {(heading || subheading) && (
          <div className="text-center mb-12">
            {heading && <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-ow-text">{heading}</h2>}
            {subheading && <p className="mt-3 text-lg text-ow-text-muted">{subheading}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 ${colClass} gap-6`}>
          {items.map((item, i) => {
            const Icon = item.icon ? FEATURE_ICON_MAP[item.icon as keyof typeof FEATURE_ICON_MAP] : null;
            return (
              <div
                key={i}
                className="hover-lift flex flex-col gap-3 p-6 rounded-ow-lg border border-ow-border bg-ow-surface shadow-ow-sm hover:shadow-ow-md transition-shadow"
              >
                {(Icon || item.icon) && (
                  <span className="inline-flex size-11 items-center justify-center rounded-ow bg-ow-primary-soft text-ow-primary mb-1">
                    {Icon
                      ? <Icon className="size-6" />
                      : <span className="text-2xl leading-none">{item.icon}</span>}
                  </span>
                )}
                <h3 className="text-lg font-semibold text-ow-text">{item.title}</h3>
                <p className="text-ow-text-muted text-sm leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
