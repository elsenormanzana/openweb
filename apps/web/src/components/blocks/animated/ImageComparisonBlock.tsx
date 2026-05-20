import { useRef, useState, useCallback, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import type { ImageComparisonBlockProps } from "@/lib/blocks";

export function ImageComparisonBlock({ props }: { props: ImageComparisonBlockProps }) {
  const { beforeImage, afterImage, beforeLabel, afterLabel, orientation } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const isHorizontal = orientation !== "vertical";

  const updatePosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let pct: number;
      if (isHorizontal) {
        pct = ((clientX - rect.left) / rect.width) * 100;
      } else {
        pct = ((clientY - rect.top) / rect.height) * 100;
      }
      setPosition(Math.max(0, Math.min(100, pct)));
    },
    [isHorizontal]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      updatePosition(e.clientX, e.clientY);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [updatePosition]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX, e.clientY);
    },
    [isDragging, updatePosition]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const handleGlobalUp = () => setIsDragging(false);
    window.addEventListener("pointerup", handleGlobalUp);
    return () => window.removeEventListener("pointerup", handleGlobalUp);
  }, []);

  const clipBefore = isHorizontal
    ? `inset(0 ${100 - position}% 0 0)`
    : `inset(0 0 ${100 - position}% 0)`;
  const clipAfter = isHorizontal
    ? `inset(0 0 0 ${position}%)`
    : `inset(${position}% 0 0 0)`;

  return (
    <section ref={sectionRef} className="w-full py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          ref={containerRef}
          className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 cursor-col-resize select-none touch-none"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ cursor: isHorizontal ? "col-resize" : "row-resize" }}
        >
          {/* Before image (left / top) */}
          <div className="absolute inset-0" style={{ clipPath: clipBefore }}>
            {beforeImage ? (
              <img src={beforeImage} alt={beforeLabel || "Before"} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-400">
                Before
              </div>
            )}
          </div>

          {/* After image (right / bottom) */}
          <div className="absolute inset-0" style={{ clipPath: clipAfter }}>
            {afterImage ? (
              <img src={afterImage} alt={afterLabel || "After"} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gray-300 flex items-center justify-center text-gray-500">
                After
              </div>
            )}
          </div>

          {/* Divider line */}
          {isHorizontal ? (
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10 pointer-events-none"
              style={{ left: `${position}%`, transform: "translateX(-50%)" }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-10 rounded-full bg-white shadow-lg flex items-center justify-center">
                <svg className="size-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 6l-4 6 4 6M16 6l4 6-4 6" />
                </svg>
              </div>
            </div>
          ) : (
            <div
              className="absolute left-0 right-0 h-1 bg-white shadow-lg z-10 pointer-events-none"
              style={{ top: `${position}%`, transform: "translateY(-50%)" }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-10 rounded-full bg-white shadow-lg flex items-center justify-center">
                <svg className="size-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 8l6-4 6 4M6 16l6 4 6-4" />
                </svg>
              </div>
            </div>
          )}

          {/* Labels */}
          {beforeLabel && (
            <span
              className={`absolute z-20 text-sm font-semibold text-white bg-black/50 px-3 py-1 rounded-full ${
                isHorizontal ? "top-4 left-4" : "top-4 left-4"
              }`}
            >
              {beforeLabel}
            </span>
          )}
          {afterLabel && (
            <span
              className={`absolute z-20 text-sm font-semibold text-white bg-black/50 px-3 py-1 rounded-full ${
                isHorizontal ? "top-4 right-4" : "bottom-4 right-4"
              }`}
            >
              {afterLabel}
            </span>
          )}
        </motion.div>
      </div>
    </section>
  );
}
