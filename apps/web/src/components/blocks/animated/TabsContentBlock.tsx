import { useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import type { TabsContentBlockProps } from "@/lib/blocks";

export function TabsContentBlock({ props }: { props: TabsContentBlockProps }) {
  const { items, tabStyle } = props;
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  if (!items?.length) return null;

  const activeItem = items[active];

  return (
    <section ref={ref} className="w-full py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Tab bar */}
        <motion.div
          className={`flex flex-wrap gap-1 mb-10 ${
            tabStyle === "underline" ? "border-b border-gray-200" : ""
          } ${tabStyle === "bordered" ? "border-b border-gray-200" : ""}`}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          {items.map((item, i) => {
            const isActive = active === i;

            if (tabStyle === "underline") {
              return (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                    isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {item.tabLabel}
                  {isActive && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"
                      layoutId="tab-underline"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            }

            if (tabStyle === "pill") {
              return (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`relative px-5 py-2.5 text-sm font-medium rounded-full transition-colors ${
                    isActive ? "text-white" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-gray-900 rounded-full"
                      layoutId="tab-pill"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{item.tabLabel}</span>
                </button>
              );
            }

            // bordered
            return (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`relative px-5 py-3 text-sm font-medium border transition-colors ${
                  isActive
                    ? "border-gray-200 border-b-white text-gray-900 bg-white -mb-px rounded-t-lg"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {item.tabLabel}
              </button>
            );
          })}
        </motion.div>

        {/* Content area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center"
          >
            <div>
              {activeItem.content && (
                <div
                  className="prose prose-gray max-w-none"
                  dangerouslySetInnerHTML={{ __html: activeItem.content }}
                />
              )}
            </div>
            {activeItem.image && (
              <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-[4/3]">
                <img
                  src={activeItem.image}
                  alt={activeItem.tabLabel}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
