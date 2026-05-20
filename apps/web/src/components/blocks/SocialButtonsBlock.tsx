import type { SocialButtonsBlockProps } from "@/lib/blocks";
import { IconRenderer } from "@/components/shared/IconRenderer";

export function SocialButtonsBlock({ props }: { props: SocialButtonsBlockProps }) {
  const {
    items = [],
    layout = "row",
    buttonStyle = "solid",
    align = "center",
    size = "md",
    showOnlyLogos = false,
  } = props;

  const alignClass = align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";

  // Size mapping
  const sizeMap = {
    sm: { padding: "p-2.5 gap-2", iconBox: "size-8", icon: "size-4", textSize: "text-xs", platformSize: "text-[10px]" },
    md: { padding: "p-3.5 gap-3", iconBox: "size-10", icon: "size-5", textSize: "text-sm md:text-base", platformSize: "text-xs" },
    lg: { padding: "p-4.5 gap-4", iconBox: "size-12", icon: "size-6", textSize: "text-base md:text-lg font-bold", platformSize: "text-sm" },
  };

  const s = sizeMap[size] || sizeMap.md;

  return (
    <div className="w-full py-6 px-4">
      <div className={`w-full flex flex-wrap ${alignClass} ${layout === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 sm:gap-6 gap-4" : layout === "floating" ? "flex flex-wrap justify-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl max-w-fit mx-auto" : "flex flex-wrap gap-4"}`}>
        {items.map((item) => {
          let itemClass = `group relative flex items-center ${showOnlyLogos ? "justify-center" : ""} ${s.padding} rounded-xl font-semibold transition-all duration-300 `;

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
              <div className={`flex items-center justify-center ${s.iconBox} rounded-lg ${isSolid ? "bg-white/20 text-white" : ""} group-hover:scale-110 transition-transform duration-300 shadow-inner`} style={iconBoxBgStyle}>
                {item.emoji ? (
                  <span className="text-xl">{item.emoji}</span>
                ) : (
                  <IconRenderer icon={item.icon || item.platform} className={s.icon} solidWhite={isSolid} />
                )}
              </div>

              {!showOnlyLogos && (
                <div className="flex flex-col text-left flex-1 min-w-0">
                  <span className={`${s.textSize} font-bold truncate ${isSolid ? "text-white group-hover:text-white/90" : "text-foreground group-hover:text-foreground/90"} transition-colors`}>{item.label}</span>
                  <span className={`${s.platformSize} ${isSolid ? "text-white/70" : "text-muted-foreground"} truncate`}>{item.platform}</span>
                </div>
              )}

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
  );
}
