import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import type { BentoGridBlockProps } from "@/lib/blocks";
import { FEATURE_ICON_MAP } from "@/lib/featureIcons";

export function BentoGridBlock({ props }: { props: BentoGridBlockProps }) {
  const { items, gridCols } = props;
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const gridColsClass = gridCols === 4 ? "md:grid-cols-4" : "md:grid-cols-3";

  return (
    <section className="w-full py-16 sm:py-24 px-4">
      <div ref={ref} className={`max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 ${gridColsClass} gap-4`}>
        {items.map((item, i) => {
          const Icon = item.icon
            ? FEATURE_ICON_MAP[item.icon as keyof typeof FEATURE_ICON_MAP]
            : null;

          const colSpanClass = item.colSpan === 2 ? "sm:col-span-2" : "";
          const rowSpanClass = item.rowSpan === 2 ? "sm:row-span-2" : "";

          return (
            <motion.div
              key={i}
              className={`group relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-6 flex flex-col justify-end transition-colors hover:border-gray-300 hover:bg-gray-100 ${colSpanClass} ${rowSpanClass} ${item.rowSpan === 2 ? "min-h-[320px]" : "min-h-[180px]"}`}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
            >
              {item.image && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity"
                  style={{ backgroundImage: `url(${item.image})` }}
                />
              )}

              <div className="relative z-10">
                {Icon && (
                  <div className="mb-3 inline-flex items-center justify-center size-10 rounded-xl bg-white shadow-sm">
                    <Icon className="size-5 text-gray-700" />
                  </div>
                )}
                {!Icon && item.icon && (
                  <span className="mb-3 inline-block text-2xl">{item.icon}</span>
                )}
                {item.title && (
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                )}
                {item.description && (
                  <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
