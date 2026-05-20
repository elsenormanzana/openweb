import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import type { ParallaxScrollBlockProps } from "@/lib/blocks";

function ParallaxItem({
  image,
  title,
  description,
  index,
  intensity,
}: {
  image: string;
  title: string;
  description: string;
  index: number;
  intensity: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const offset = (intensity / 100) * 100;
  const imageY = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  const isEven = index % 2 === 0;

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
      <motion.div
        className={`relative overflow-hidden rounded-2xl aspect-[4/3] bg-gray-100 ${isEven ? "" : "md:order-2"}`}
        style={{ y: imageY }}
      >
        {image ? (
          <img
            src={image}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            No image
          </div>
        )}
      </motion.div>

      <motion.div
        className={isEven ? "" : "md:order-1"}
        initial={{ opacity: 0, x: isEven ? 40 : -40 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.1 }}
      >
        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          {title}
        </h3>
        <p className="text-lg text-gray-600 leading-relaxed">
          {description}
        </p>
      </motion.div>
    </div>
  );
}

export function ParallaxScrollBlock({ props }: { props: ParallaxScrollBlockProps }) {
  const { items, intensity } = props;

  return (
    <section className="w-full py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 space-y-24 md:space-y-32">
        {items.map((item, i) => (
          <ParallaxItem
            key={i}
            image={item.image}
            title={item.title}
            description={item.description}
            index={i}
            intensity={intensity ?? 50}
          />
        ))}
      </div>
    </section>
  );
}
