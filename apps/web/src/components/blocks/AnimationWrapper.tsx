import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import type { AnimationConfig } from "@/lib/animations";
import { getAnimationVariants, getEasing, DEFAULT_ANIMATION } from "@/lib/animations";

export function AnimationWrapper({
  animation,
  children,
  className,
}: {
  animation?: AnimationConfig;
  children: React.ReactNode;
  className?: string;
}) {
  const config = animation ?? DEFAULT_ANIMATION;
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: config.once, amount: 0.2 });

  if (config.entrance === "none") {
    return <div className={className}>{children}</div>;
  }

  const variants = getAnimationVariants(config.entrance);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={config.triggerOnView ? (isInView ? "visible" : "hidden") : "visible"}
      variants={variants}
      transition={{
        duration: config.duration,
        delay: config.delay,
        ease: getEasing(config.easing ?? "easeOut"),
      }}
    >
      {children}
    </motion.div>
  );
}
