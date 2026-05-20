import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import type { CardGridBlockProps } from "@/lib/blocks";

export function CardGridBlock({ props }: { props: CardGridBlockProps }) {
  const { items, columns, cardStyle, hoverEffect } = props;
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  if (!items || items.length === 0) return null;

  const colClass =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : "sm:grid-cols-2 lg:grid-cols-3";

  const cardBaseClass = "rounded-2xl overflow-hidden bg-white transition-all duration-300";

  const cardStyleClass =
    cardStyle === "bordered"
      ? "border-2 border-gray-200"
      : cardStyle === "shadow"
      ? "shadow-lg"
      : "border border-gray-100";

  const getHoverClass = () => {
    switch (hoverEffect) {
      case "lift":
        return "hover:-translate-y-2 hover:shadow-xl";
      case "glow":
        return "hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]";
      case "border":
        return "hover:border-blue-500";
      default:
        return "";
    }
  };

  return (
    <section className="w-full py-16 sm:py-24 px-4">
      <div ref={ref} className={`max-w-7xl mx-auto grid grid-cols-1 ${colClass} gap-6`}>
        {items.map((item, i) => (
          <motion.div
            key={i}
            className={`group ${cardBaseClass} ${cardStyleClass} ${getHoverClass()}`}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
          >
            {item.image && (
              <div className="aspect-video overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            )}
            <div className="p-6">
              {item.badge && (
                <span className="inline-block mb-3 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  {item.badge}
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
              {item.description && (
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{item.description}</p>
              )}
              {item.link && (
                <a
                  href={item.link}
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Learn more
                  <svg className="ml-1 size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
