import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import type { TimelineBlockProps } from "@/lib/blocks";

function TimelineItem({
  date,
  title,
  description,
  image,
  index,
  lineColor,
}: {
  date: string;
  title: string;
  description: string;
  image: string;
  index: number;
  lineColor: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const isEven = index % 2 === 0;

  return (
    <div ref={ref} className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-8">
      {/* Left content (even items) / empty (odd items) on desktop */}
      <div className={`hidden md:flex items-start ${isEven ? "justify-end" : ""}`}>
        {isEven ? (
          <motion.div
            className="max-w-sm text-right"
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: lineColor }}>
              {date}
            </span>
            <h3 className="text-xl font-bold text-gray-900 mt-1 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
            {image && (
              <img src={image} alt={title} className="mt-4 rounded-xl w-full max-w-xs ml-auto object-cover aspect-video" />
            )}
          </motion.div>
        ) : (
          <div />
        )}
      </div>

      {/* Center line + dot */}
      <div className="hidden md:flex flex-col items-center">
        <motion.div
          className="size-4 rounded-full border-4 shrink-0"
          style={{ borderColor: lineColor, backgroundColor: "white" }}
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ duration: 0.3, delay: 0.05 }}
        />
        <div className="w-0.5 flex-1" style={{ backgroundColor: lineColor, opacity: 0.3 }} />
      </div>

      {/* Right content (odd items) / empty (even items) on desktop */}
      <div className={`hidden md:flex items-start ${!isEven ? "" : ""}`}>
        {!isEven ? (
          <motion.div
            className="max-w-sm"
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: lineColor }}>
              {date}
            </span>
            <h3 className="text-xl font-bold text-gray-900 mt-1 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
            {image && (
              <img src={image} alt={title} className="mt-4 rounded-xl w-full max-w-xs object-cover aspect-video" />
            )}
          </motion.div>
        ) : (
          <div />
        )}
      </div>

      {/* Mobile layout (stacked) */}
      <div className="flex md:hidden gap-4">
        <div className="flex flex-col items-center">
          <motion.div
            className="size-4 rounded-full border-4 shrink-0"
            style={{ borderColor: lineColor, backgroundColor: "white" }}
            initial={{ scale: 0 }}
            animate={isInView ? { scale: 1 } : {}}
            transition={{ duration: 0.3, delay: 0.05 }}
          />
          <div className="w-0.5 flex-1" style={{ backgroundColor: lineColor, opacity: 0.3 }} />
        </div>
        <motion.div
          className="pb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: lineColor }}>
            {date}
          </span>
          <h3 className="text-xl font-bold text-gray-900 mt-1 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
          {image && (
            <img src={image} alt={title} className="mt-4 rounded-xl w-full max-w-xs object-cover aspect-video" />
          )}
        </motion.div>
      </div>
    </div>
  );
}

export function TimelineBlock({ props }: { props: TimelineBlockProps }) {
  const { heading, items, lineColor } = props;
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const color = lineColor || "#3b82f6";

  return (
    <section className="w-full py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {heading && (
          <motion.h2
            ref={ref}
            className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            {heading}
          </motion.h2>
        )}
        <div className="space-y-0">
          {items.map((item, i) => (
            <TimelineItem
              key={i}
              date={item.date}
              title={item.title}
              description={item.description}
              image={item.image}
              index={i}
              lineColor={color}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
