import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import type { AnimatedTextBlockProps } from "@/lib/blocks";

function TypewriterText({ text, speed }: { text: string; speed: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (!isInView) return;
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed || 50);
    return () => clearInterval(interval);
  }, [isInView, text, speed]);

  return (
    <span ref={ref}>
      {displayed}
      {displayed.length < text.length && (
        <motion.span
          className="inline-block w-[3px] h-[1em] bg-current ml-0.5 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
        />
      )}
    </span>
  );
}

function GenerateText({ text, speed }: { text: string; speed: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const words = text.split(" ");
  const delayPerWord = (speed || 50) / 1000;

  return (
    <span ref={ref}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.3em]"
          initial={{ opacity: 0, filter: "blur(4px)" }}
          animate={isInView ? { opacity: 1, filter: "blur(0px)" } : {}}
          transition={{ duration: 0.4, delay: i * delayPerWord }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

function GradientText({ text, colors }: { text: string; colors: string[] }) {
  const gc = colors?.length >= 2 ? colors : ["#3b82f6", "#8b5cf6"];
  const gradientStr = gc.join(", ");

  return (
    <motion.span
      className="inline-block"
      style={{
        backgroundImage: `linear-gradient(90deg, ${gradientStr}, ${gc[0]})`,
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
      animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
      transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
    >
      {text}
    </motion.span>
  );
}

function BlurInText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <motion.span
      ref={ref}
      className="inline-block"
      initial={{ opacity: 0, filter: "blur(12px)" }}
      animate={isInView ? { opacity: 1, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {text}
    </motion.span>
  );
}

function FadeUpText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <motion.span
      ref={ref}
      className="inline-block"
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      {text}
    </motion.span>
  );
}

export function AnimatedTextBlock({ props }: { props: AnimatedTextBlockProps }) {
  const { text, animation, speed, gradientColors, align } = props;

  const alignClass =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  return (
    <section className="w-full py-16 sm:py-24 px-4">
      <div className={`max-w-7xl mx-auto ${alignClass}`}>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
          {animation === "typewriter" && <TypewriterText text={text} speed={speed} />}
          {animation === "generate" && <GenerateText text={text} speed={speed} />}
          {animation === "gradient" && <GradientText text={text} colors={gradientColors} />}
          {animation === "blur-in" && <BlurInText text={text} />}
          {animation === "fade-up" && <FadeUpText text={text} />}
        </h2>
      </div>
    </section>
  );
}
