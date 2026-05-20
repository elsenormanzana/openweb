import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import type { CtaBannerBlockProps } from "@/lib/blocks";

function ShimmerButton({ text, href }: { text: string; href: string }) {
  return (
    <a
      href={href || "#"}
      className="relative inline-flex items-center px-8 py-3.5 rounded-full bg-white text-gray-900 font-semibold text-lg overflow-hidden group"
    >
      <span className="relative z-10">{text}</span>
      <div
        className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
        }}
      />
      {/* Auto-shimmer animation */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
        }}
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
      />
    </a>
  );
}

function MovingBorderButton({ text, href }: { text: string; href: string }) {
  return (
    <a
      href={href || "#"}
      className="relative inline-flex items-center px-8 py-3.5 rounded-full font-semibold text-lg text-white group"
    >
      {/* Rotating gradient border */}
      <div className="absolute inset-0 rounded-full p-[2px] overflow-hidden">
        <motion.div
          className="absolute inset-[-50%] rounded-full"
          style={{
            background: "conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #f97316, #3b82f6)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-[2px] rounded-full bg-gray-900" />
      </div>
      <span className="relative z-10">{text}</span>
    </a>
  );
}

function PulseGlowButton({ text, href }: { text: string; href: string }) {
  return (
    <a
      href={href || "#"}
      className="relative inline-flex items-center px-8 py-3.5 rounded-full bg-white text-gray-900 font-semibold text-lg"
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-white"
        animate={{
          boxShadow: [
            "0 0 20px rgba(255,255,255,0.2), 0 0 40px rgba(255,255,255,0.1)",
            "0 0 40px rgba(255,255,255,0.4), 0 0 80px rgba(255,255,255,0.2)",
            "0 0 20px rgba(255,255,255,0.2), 0 0 40px rgba(255,255,255,0.1)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="relative z-10">{text}</span>
    </a>
  );
}

export function CtaBannerBlock({ props }: { props: CtaBannerBlockProps }) {
  const { heading, description, buttonText, buttonHref, buttonStyle } = props;
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section
      ref={ref}
      className="w-full py-16 sm:py-24"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 text-center">
        <motion.h2
          className="text-4xl md:text-5xl font-bold text-white mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {heading}
        </motion.h2>
        {description && (
          <motion.p
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {description}
          </motion.p>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {buttonStyle === "shimmer" && <ShimmerButton text={buttonText} href={buttonHref} />}
          {buttonStyle === "moving-border" && <MovingBorderButton text={buttonText} href={buttonHref} />}
          {buttonStyle === "pulse-glow" && <PulseGlowButton text={buttonText} href={buttonHref} />}
        </motion.div>
      </div>
    </section>
  );
}
