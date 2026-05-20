import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { AnimatedHeroBlockProps } from "@/lib/blocks";
import { CtaButtonRenderer } from "@/components/shared/CtaButtonRenderer";

function SpotlightBg({ color }: { color: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 transition-all duration-300 ease-out"
        style={{
          background: `radial-gradient(600px circle at ${pos.x}% ${pos.y}%, ${color}33, transparent 60%)`,
        }}
      />
    </div>
  );
}

function LampBg({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[60%]"
        initial={{ opacity: 0, scaleY: 0.5 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${color}40, ${color}15 40%, transparent 70%)`,
        }}
      />
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[40%]"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${color}55, transparent 70%)`,
        }}
      />
    </div>
  );
}

function AuroraBg({ colors }: { colors: string[] }) {
  const c1 = colors[0] || "#3b82f6";
  const c2 = colors[1] || "#8b5cf6";
  const c3 = colors[2] || "#ec4899";

  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%]"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        style={{
          background: `conic-gradient(from 0deg, ${c1}20, ${c2}20, ${c3}20, ${c1}20)`,
          filter: "blur(80px)",
        }}
      />
      <motion.div
        className="absolute top-1/4 left-1/4 w-[60%] h-[60%] rounded-full"
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: `radial-gradient(circle, ${c1}30, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />
      <motion.div
        className="absolute top-1/3 right-1/4 w-[50%] h-[50%] rounded-full"
        animate={{
          x: [0, -60, 40, 0],
          y: [0, 30, -50, 0],
          scale: [1, 0.8, 1.1, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: `radial-gradient(circle, ${c2}30, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />
    </div>
  );
}

export function AnimatedHeroBlock({ props }: { props: AnimatedHeroBlockProps }) {
  const {
    heading,
    subheading,
    spotlightColor,
    animationType,
    gradientColors,
    primaryCta,
    secondaryCta,
  } = props;

  const gc = gradientColors?.length ? gradientColors : ["#3b82f6", "#8b5cf6", "#ec4899"];
  const gradientStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(135deg, ${gc.join(", ")})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  };

  return (
    <section className="relative w-full min-h-[70vh] flex items-center justify-center bg-gray-950 overflow-hidden py-16 sm:py-24 px-4">
      {animationType === "spotlight" && <SpotlightBg color={spotlightColor || "#3b82f6"} />}
      {animationType === "lamp" && <LampBg color={spotlightColor || "#3b82f6"} />}
      {animationType === "aurora" && <AuroraBg colors={gc} />}

      <div className="relative z-10 max-w-7xl mx-auto text-center flex flex-col items-center gap-6">
        <motion.h1
          className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight"
          style={gradientStyle}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {heading}
        </motion.h1>

        {subheading && (
          <motion.p
            className="text-lg sm:text-xl text-gray-400 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            {subheading}
          </motion.p>
        )}

        <motion.div
          className="flex gap-4 flex-wrap justify-center mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
          {primaryCta?.label && (
            <CtaButtonRenderer cta={primaryCta} variant="shimmer" className="px-8 py-3 text-sm" />
          )}
          {secondaryCta?.label && (
            <CtaButtonRenderer cta={secondaryCta} variant="outline" className="px-8 py-3 text-sm border-gray-600 text-gray-300" />
          )}
        </motion.div>
      </div>
    </section>
  );
}
