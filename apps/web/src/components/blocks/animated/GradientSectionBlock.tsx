import { useRef, useMemo } from "react";
import { motion, useInView } from "framer-motion";
import type { GradientSectionBlockProps } from "@/lib/blocks";

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function AuroraBackground({ colors }: { colors: string[] }) {
  const c1 = colors[0] || "#3b82f6";
  const c2 = colors[1] || "#8b5cf6";
  const c3 = colors[2] || "#ec4899";

  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] rounded-full opacity-30 blur-[120px]"
        style={{ background: `radial-gradient(circle, ${c1}, transparent 60%)` }}
        animate={{ x: [0, 80, -40, 0], y: [0, -60, 40, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-1/4 top-1/4 h-[150%] w-[150%] rounded-full opacity-25 blur-[100px]"
        style={{ background: `radial-gradient(circle, ${c2}, transparent 60%)` }}
        animate={{ x: [0, -60, 30, 0], y: [0, 50, -30, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-1/4 left-1/4 h-[120%] w-[120%] rounded-full opacity-20 blur-[90px]"
        style={{ background: `radial-gradient(circle, ${c3}, transparent 60%)` }}
        animate={{ x: [0, 40, -60, 0], y: [0, -40, 60, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function GradientFlowBackground({ colors }: { colors: string[] }) {
  const c1 = colors[0] || "#3b82f6";
  const c2 = colors[1] || "#8b5cf6";
  const c3 = colors[2] || "#ec4899";

  return (
    <motion.div
      className="absolute inset-0"
      animate={{
        background: [
          `linear-gradient(135deg, ${c1}, ${c2})`,
          `linear-gradient(135deg, ${c2}, ${c3})`,
          `linear-gradient(135deg, ${c3}, ${c1})`,
          `linear-gradient(135deg, ${c1}, ${c2})`,
        ],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function MeteorsBackground({ colors }: { colors: string[] }) {
  const c = colors[0] || "#3b82f6";
  const meteors = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${seededRandom(i * 3 + 1) * 100}%`,
    top: `${seededRandom(i * 3 + 2) * 100}%`,
    delay: seededRandom(i * 3 + 3) * 5,
    duration: 1.5 + seededRandom(i * 3 + 4) * 2,
    size: 1 + seededRandom(i * 3 + 5) * 2,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {meteors.map((m) => (
        <motion.div
          key={m.id}
          className="absolute rounded-full"
          style={{
            width: m.size,
            height: m.size,
            left: m.left,
            top: m.top,
            background: c,
            boxShadow: `0 0 ${m.size * 4}px ${c}`,
          }}
          animate={{
            x: [0, 200],
            y: [0, 200],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: m.duration,
            delay: m.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

export function GradientSectionBlock({ props }: { props: GradientSectionBlockProps }) {
  const { heading, description, cta, animation, colors } = props;
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section ref={ref} className="relative w-full py-16 sm:py-24 bg-gray-950 overflow-hidden">
      {animation === "aurora" && <AuroraBackground colors={colors} />}
      {animation === "gradient-flow" && <GradientFlowBackground colors={colors} />}
      {animation === "meteors" && <MeteorsBackground colors={colors} />}

      <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
        <motion.h2
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          {heading}
        </motion.h2>
        {description && (
          <motion.p
            className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            {description}
          </motion.p>
        )}
        {cta?.label && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <a
              href={cta.href || "#"}
              className="inline-flex items-center px-8 py-3 rounded-full bg-white text-gray-900 font-semibold text-lg hover:bg-gray-100 transition-colors"
            >
              {cta.label}
            </a>
          </motion.div>
        )}
      </div>
    </section>
  );
}
