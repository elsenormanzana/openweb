import type { MarqueeBlockProps } from "@/lib/blocks";

export function MarqueeBlock({ props }: { props: MarqueeBlockProps }) {
  const { items, speed, direction, pauseOnHover } = props;

  if (!items || items.length === 0) return null;

  const duration = Math.max(5, 60 / (speed || 30) * items.length);
  const animationDirection = direction === "right" ? "reverse" : "normal";

  const renderItems = () =>
    items.map((item, i) => (
      <div
        key={i}
        className="flex-shrink-0 flex items-center gap-3 px-6 py-3 mx-2 rounded-xl border border-gray-200 bg-white shadow-sm"
      >
        {item.image && (
          <img src={item.image} alt={item.text || ""} className="size-10 rounded-lg object-cover" />
        )}
        {item.text && (
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{item.text}</span>
        )}
      </div>
    ));

  return (
    <section className="w-full py-16 sm:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div
          className={`flex ${pauseOnHover ? "[&:hover_.marquee-track]:pause" : ""}`}
          style={{
            maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          }}
        >
          <div
            className="marquee-track flex animate-marquee"
            style={{
              animationDuration: `${duration}s`,
              animationDirection,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
            }}
          >
            {renderItems()}
            {renderItems()}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation-name: marquee;
        }
        .\\[\\&\\:hover_\\.marquee-track\\]\\:pause:hover .marquee-track {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
