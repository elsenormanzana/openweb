import type { HeroBlockProps } from "@/lib/blocks";

export function HeroBlock({ props }: { props: HeroBlockProps }) {
  const {
    heading, subheading, description, primaryCta, secondaryCta,
    badgeText, backgroundType, backgroundColor, backgroundImage,
    backgroundVideo, backgroundOpacity, align, textColor,
  } = props;

  const isLight = textColor === "light";
  const textClass = isLight ? "text-white" : "text-gray-900";
  const subTextClass = isLight ? "text-white/80" : "text-gray-600";
  const alignClass = align === "center" ? "text-center items-center" : "text-left items-start";

  const hasMedia = (backgroundType === "image" && backgroundImage) || (backgroundType === "video" && backgroundVideo);
  const overlayOpacity = (backgroundOpacity ?? 50) / 100;

  const bgStyle: React.CSSProperties =
    backgroundType === "image" && backgroundImage
      ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" }
      : backgroundType === "video"
      ? {}
      : { backgroundColor };

  return (
    <section style={bgStyle} className="relative w-full py-24 px-4 overflow-hidden">
      {backgroundType === "video" && backgroundVideo && (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={backgroundVideo}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
      {hasMedia && (
        <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />
      )}
      <div className={`relative max-w-5xl mx-auto flex flex-col gap-6 ${alignClass}`}>
        {badgeText && (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${isLight ? "border-white/30 text-white bg-white/10" : "border-gray-300 text-gray-700 bg-white"}`}>
            {badgeText}
          </span>
        )}
        <h1 className={`text-4xl md:text-6xl font-bold leading-tight ${textClass}`}>{heading}</h1>
        {subheading && <p className={`text-xl font-medium ${subTextClass}`}>{subheading}</p>}
        {description && <p className={`text-lg max-w-2xl ${subTextClass}`}>{description}</p>}
        <div className={`flex gap-4 flex-wrap ${align === "center" ? "justify-center" : ""}`}>
          {primaryCta.label && (
            <a
              href={primaryCta.href || "#"}
              className="inline-flex items-center justify-center rounded-md bg-white text-gray-900 px-6 py-3 text-sm font-semibold shadow hover:bg-gray-100 transition-colors"
            >
              {primaryCta.label}
            </a>
          )}
          {secondaryCta.label && (
            <a
              href={secondaryCta.href || "#"}
              className={`inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-semibold border transition-colors ${isLight ? "border-white/50 text-white hover:bg-white/10" : "border-gray-400 text-gray-700 hover:bg-gray-100"}`}
            >
              {secondaryCta.label}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
