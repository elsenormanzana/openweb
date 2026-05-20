import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FeatureShowcaseBlockProps } from "@/lib/blocks";

export function FeatureShowcaseBlock({ props }: { props: FeatureShowcaseBlockProps }) {
  const { items, stickyPosition } = props;
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = itemRefs.current.indexOf(entry.target as HTMLDivElement);
            if (index !== -1) setActiveIndex(index);
          }
        }
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );

    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items.length]);

  const isLeft = stickyPosition === "left";
  const activeImage = items[activeIndex]?.image;

  return (
    <section className="w-full py-16 sm:py-24 bg-white">
      <div ref={containerRef} className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Sticky image side */}
          <div className={`${isLeft ? "lg:order-1" : "lg:order-2"} relative`}>
            <div className="lg:sticky lg:top-24">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIndex}
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {activeImage ? (
                      <img
                        src={activeImage}
                        alt={items[activeIndex]?.title || ""}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">
                        No image
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Scrolling text side */}
          <div className={`${isLeft ? "lg:order-2" : "lg:order-1"} space-y-24 lg:space-y-48`}>
            {items.map((item, i) => (
              <div
                key={i}
                ref={(el) => { itemRefs.current[i] = el; }}
                className="min-h-[50vh] flex items-center"
              >
                <motion.div
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: activeIndex === i ? 1 : 0.4 }}
                  transition={{ duration: 0.4 }}
                >
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                    {item.title}
                  </h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
