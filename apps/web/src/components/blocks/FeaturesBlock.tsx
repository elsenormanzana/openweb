import type { FeaturesBlockProps } from "@/lib/blocks";
import { FEATURE_ICON_MAP } from "@/lib/blocks";

export function FeaturesBlock({ props }: { props: FeaturesBlockProps }) {
  const { heading, subheading, columns, items } = props;
  const colClass = columns === 2 ? "sm:grid-cols-2" : columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="w-full py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        {(heading || subheading) && (
          <div className="text-center mb-12">
            {heading && <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{heading}</h2>}
            {subheading && <p className="mt-3 text-lg text-gray-500">{subheading}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 ${colClass} gap-8`}>
          {items.map((item, i) => {
            const Icon = item.icon ? FEATURE_ICON_MAP[item.icon as keyof typeof FEATURE_ICON_MAP] : null;
            return (
              <div key={i} className="flex flex-col gap-3 p-6 rounded-xl border border-gray-100 bg-gray-50">
                {Icon
                  ? <Icon className="size-8 text-blue-600" />
                  : item.icon
                    ? <span className="text-3xl">{item.icon}</span>
                    : null
                }
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
