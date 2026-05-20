import type { LogoMarqueeBlockProps } from "@/lib/blocks";

function MarqueeRow({
  logos,
  speed,
  direction,
  grayscale,
  rowIndex,
}: {
  logos: { name: string; url: string }[];
  speed: number;
  direction: "left" | "right";
  grayscale: boolean;
  rowIndex: number;
}) {
  if (!logos || logos.length === 0) return null;

  const duration = Math.max(5, 60 / (speed || 30) * logos.length);
  const animationDirection = direction === "right" ? "reverse" : "normal";

  const renderLogos = () =>
    logos.map((logo, i) => (
      <div
        key={i}
        className={`flex-shrink-0 flex items-center justify-center px-8 py-4 mx-3 ${
          grayscale ? "grayscale hover:grayscale-0 transition-all duration-300" : ""
        }`}
      >
        {logo.url ? (
          <img
            src={logo.url}
            alt={logo.name}
            className="h-8 sm:h-10 max-w-[140px] object-contain"
          />
        ) : (
          <span className="text-base font-semibold text-gray-400 hover:text-gray-700 transition-colors whitespace-nowrap">
            {logo.name}
          </span>
        )}
      </div>
    ));

  return (
    <div
      className="flex overflow-hidden"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
      }}
    >
      <div
        className={`logo-marquee-track-${rowIndex} flex`}
        style={{
          animationName: "logoMarquee",
          animationDuration: `${duration}s`,
          animationDirection,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
        }}
      >
        {renderLogos()}
        {renderLogos()}
      </div>
    </div>
  );
}

export function LogoMarqueeBlock({ props }: { props: LogoMarqueeBlockProps }) {
  const { heading, logos, speed, rows, direction, grayscale } = props;

  if (!logos || logos.length === 0) return null;

  return (
    <section className="w-full py-16 sm:py-24 px-4">
      <div className="max-w-7xl mx-auto">
        {heading && (
          <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-gray-500 mb-10">
            {heading}
          </h2>
        )}

        <div className="flex flex-col gap-6">
          <MarqueeRow
            logos={logos}
            speed={speed}
            direction={direction}
            grayscale={grayscale}
            rowIndex={0}
          />
          {rows === 2 && (
            <MarqueeRow
              logos={[...logos].reverse()}
              speed={speed}
              direction={direction === "left" ? "right" : "left"}
              grayscale={grayscale}
              rowIndex={1}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes logoMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
