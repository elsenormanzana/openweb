import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import type { AnimatedCounterBlockProps } from "@/lib/blocks";

function CounterCard({
  item,
  duration,
  triggerOnView,
  index,
}: {
  item: { value: number; label: string; prefix: string; suffix: string };
  duration: number;
  triggerOnView: boolean;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState("0");

  const shouldAnimate = triggerOnView ? isInView : true;
  const targetValue = item.value ?? 0;
  const dur = (duration || 2) * 1000;

  useEffect(() => {
    if (!shouldAnimate) return;

    const startTime = performance.now();
    const isFloat = targetValue % 1 !== 0;
    const decimals = isFloat ? (String(targetValue).split(".")[1]?.length || 1) : 0;

    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / dur, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * targetValue;

      if (isFloat) {
        setDisplay(current.toFixed(decimals));
      } else {
        setDisplay(Math.round(current).toLocaleString());
      }

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [shouldAnimate, targetValue, dur]);

  return (
    <motion.div
      ref={ref}
      className="flex flex-col items-center gap-2 p-8 rounded-2xl border border-gray-200 bg-white"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
    >
      <span className="text-4xl sm:text-5xl font-bold text-gray-900 tabular-nums">
        {item.prefix}
        {display}
        {item.suffix}
      </span>
      <span className="text-sm font-medium text-gray-500">{item.label}</span>
    </motion.div>
  );
}

export function AnimatedCounterBlock({ props }: { props: AnimatedCounterBlockProps }) {
  const { items, duration, triggerOnView } = props;

  if (!items || items.length === 0) return null;

  const colClass =
    items.length === 1
      ? "max-w-xs mx-auto"
      : items.length === 2
      ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
      : items.length === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <section className="w-full py-16 sm:py-24 px-4">
      <div className={`max-w-7xl mx-auto grid ${colClass} gap-6`}>
        {items.map((item, i) => (
          <CounterCard
            key={i}
            item={item}
            duration={duration}
            triggerOnView={triggerOnView}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}
