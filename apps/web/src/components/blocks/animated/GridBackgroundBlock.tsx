import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import type { GridBackgroundBlockProps } from "@/lib/blocks";

function GridPattern({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={color} strokeWidth="1" opacity={opacity / 100} />
        </pattern>
        <radialGradient id="grid-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="grid-mask">
          <rect width="100%" height="100%" fill="url(#grid-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" mask="url(#grid-mask)" />
    </svg>
  );
}

function DotsPattern({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="dots-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="1.5" fill={color} opacity={opacity / 100} />
        </pattern>
        <radialGradient id="dots-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="dots-mask">
          <rect width="100%" height="100%" fill="url(#dots-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots-pattern)" mask="url(#dots-mask)" />
    </svg>
  );
}

function LinesPattern({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="lines-pattern" width="100%" height="20" patternUnits="userSpaceOnUse">
          <line x1="0" y1="20" x2="100%" y2="20" stroke={color} strokeWidth="1" opacity={opacity / 100} />
        </pattern>
        <radialGradient id="lines-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="lines-mask">
          <rect width="100%" height="100%" fill="url(#lines-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#lines-pattern)" mask="url(#lines-mask)" />
    </svg>
  );
}

export function GridBackgroundBlock({ props }: { props: GridBackgroundBlockProps }) {
  const { heading, description, cta, pattern, patternColor, opacity } = props;
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const color = patternColor || "#e5e7eb";
  const op = opacity ?? 40;

  return (
    <section ref={ref} className="relative w-full py-16 sm:py-24 bg-white overflow-hidden">
      {pattern === "grid" && <GridPattern color={color} opacity={op} />}
      {pattern === "dots" && <DotsPattern color={color} opacity={op} />}
      {pattern === "lines" && <LinesPattern color={color} opacity={op} />}

      <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
        <motion.h2
          className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {heading}
        </motion.h2>
        {description && (
          <motion.p
            className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {description}
          </motion.p>
        )}
        {cta?.label && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <a
              href={cta.href || "#"}
              className="inline-flex items-center px-8 py-3 rounded-full bg-gray-900 text-white font-semibold text-lg hover:bg-gray-800 transition-colors"
            >
              {cta.label}
            </a>
          </motion.div>
        )}
      </div>
    </section>
  );
}
