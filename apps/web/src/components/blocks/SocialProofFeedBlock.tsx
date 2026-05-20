import type { SocialProofFeedBlockProps } from "@/lib/blocks";
import { IconRenderer } from "@/components/shared/IconRenderer";
import { CtaButtonRenderer } from "@/components/shared/CtaButtonRenderer";
import { Star } from "lucide-react";

export function SocialProofFeedBlock({ props }: { props: SocialProofFeedBlockProps }) {
  const { heading, subheading, mainCta, feed = [], layout = "masonry" } = props;

  return (
    <section className="w-full py-24 px-4 bg-slate-950 text-white relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/10 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-600/10 blur-[160px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl space-y-3">
            {heading && <h2 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">{heading}</h2>}
            {subheading && <p className="text-lg text-slate-400 leading-relaxed">{subheading}</p>}
          </div>
          {mainCta?.label && (
            <CtaButtonRenderer cta={mainCta} variant="shimmer" className="px-8 py-3.5 text-sm shrink-0 shadow-lg shadow-blue-500/10" />
          )}
        </div>

        <div className={`grid gap-6 ${layout === "grid" ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-3 items-start"}`}>
          {feed.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col p-7 rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl hover:border-slate-700 hover:bg-slate-900/80 transition-all duration-300 shadow-xl shadow-black/20 hover:-translate-y-1"
            >
              {/* Header: Author + Platform Icon */}
              <div className="flex items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3.5">
                  {item.authorAvatar ? (
                    <img src={item.authorAvatar} alt={item.authorName} loading="lazy" decoding="async" className="size-12 rounded-full object-cover border border-slate-700 shadow-sm" />
                  ) : (
                    <div className="size-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-300 border border-slate-700">
                      {item.authorName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">{item.authorName}</h4>
                    <p className="text-xs text-slate-400 font-medium">{item.authorHandle}</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-blue-400 group-hover:scale-110 transition-transform shadow-sm shrink-0">
                  <IconRenderer icon={item.icon || item.platform} className="size-5" />
                </div>
              </div>

              {/* Rating stars */}
              {item.rating && item.rating > 0 && (
                <div className="flex items-center gap-1 mb-4 text-amber-400">
                  {Array.from({ length: item.rating }).map((_, i) => (
                    <Star key={i} className="size-4 fill-amber-400" />
                  ))}
                </div>
              )}

              {/* Content */}
              <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6 flex-1 font-normal">
                "{item.content}"
              </p>

              {/* Footer: Date */}
              {item.date && (
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Posted on {item.platform}</span>
                  <span>{item.date}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
