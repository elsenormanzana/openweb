import type { SocialConnectBlockProps } from "@/lib/blocks";
import { IconRenderer } from "@/components/shared/IconRenderer";

export function SocialConnectBlock({ props }: { props: SocialConnectBlockProps }) {
  const {
    heading,
    subheading,
    items = [],
    layout = "grid",
    buttonStyle = "glass",
    align = "center",
    backgroundColor,
  } = props;

  const alignClass = align === "left" ? "text-left items-start" : align === "right" ? "text-right items-end" : "text-center items-center";

  return (
    <section className="w-full py-16 px-6 transition-colors duration-300" style={{ backgroundColor: backgroundColor || undefined }}>
      <div className={`max-w-5xl mx-auto flex flex-col ${alignClass} gap-8`}>
        <div className="space-y-3 max-w-2xl">
          {heading && <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">{heading}</h2>}
          {subheading && <p className="text-base md:text-lg text-muted-foreground leading-relaxed">{subheading}</p>}
        </div>

        {/* Items Container */}
        <div className={`w-full ${layout === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 sm:gap-6 gap-4" : layout === "row" ? "flex flex-wrap justify-center gap-4" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"}`}>
          {items.map((item) => {
            let itemClass = "group relative flex items-center gap-3 p-4 rounded-xl font-semibold transition-all duration-300 ";

            if (buttonStyle === "outline") {
              itemClass += "border border-border hover:border-foreground/40 bg-background/40 backdrop-blur-sm text-foreground hover:shadow-lg hover:-translate-y-1 ";
            } else if (buttonStyle === "glass") {
              itemClass += "bg-background/60 dark:bg-white/10 backdrop-blur-md border border-border text-foreground hover:bg-muted/60 hover:border-foreground/30 hover:shadow-xl hover:-translate-y-1 ";
            } else if (buttonStyle === "shimmer") {
              itemClass += "bg-gradient-to-r from-background/40 via-muted/50 to-background/40 backdrop-blur-md border border-border text-foreground hover:shadow-xl hover:scale-105 ";
            } else {
              // solid
              itemClass += "text-white hover:shadow-lg hover:scale-105 ";
            }

            const isSolid = buttonStyle === "solid";
            const customBg = isSolid ? (item.color || "#333") : undefined;
            const iconBoxBgStyle = isSolid ? undefined : { backgroundColor: item.color ? `${item.color}1A` : "rgba(128,128,128,0.1)" };

            return (
              <a
                key={item.id}
                href={item.href || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={itemClass}
                style={{ backgroundColor: customBg }}
              >
                <div className={`flex items-center justify-center size-10 rounded-lg ${isSolid ? "bg-white/20 text-white" : ""} group-hover:scale-110 transition-transform duration-300 shadow-inner`} style={iconBoxBgStyle}>
                  {item.emoji ? (
                    <span className="text-xl">{item.emoji}</span>
                  ) : (
                    <IconRenderer icon={item.icon || item.platform} className="size-5.5" solidWhite={isSolid} />
                  )}
                </div>

                <div className="flex flex-col text-left flex-1 min-w-0">
                  <span className={`text-sm md:text-base font-bold truncate ${isSolid ? "text-white group-hover:text-white/90" : "text-foreground group-hover:text-foreground/90"} transition-colors`}>{item.label}</span>
                  <span className={`text-xs ${isSolid ? "text-white/70" : "text-muted-foreground"} truncate`}>{item.platform}</span>
                </div>

                {item.badge && (
                  <span className={`absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${isSolid ? "bg-white text-neutral-900" : "bg-primary text-primary-foreground"} shadow-sm`}>
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
