import type { FooterSocialBlockProps } from "@/lib/blocks";
import { IconRenderer } from "@/components/shared/IconRenderer";
import { ArrowRight, Send } from "lucide-react";

export function FooterSocialBlock({ props }: { props: FooterSocialBlockProps }) {
  const {
    brandName = "OpenWeb",
    tagline = "",
    copyright = "",
    socials = [],
    newsletterHeading = "Stay Updated",
    newsletterPlaceholder = "Enter your email",
    newsletterButtonText = "Subscribe",
    backgroundColor = "#0b0f19",
  } = props;

  return (
    <footer className="w-full text-white relative overflow-hidden border-t border-slate-800" style={{ backgroundColor }}>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 pb-16 border-b border-slate-800/80">
          {/* Brand & Tagline */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/20">
                {brandName.charAt(0)}
              </div>
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">{brandName}</span>
            </div>
            {tagline && <p className="text-slate-400 text-base max-w-sm leading-relaxed">{tagline}</p>}
          </div>

          {/* Newsletter Signup */}
          <div className="lg:col-span-7 lg:pl-12 space-y-4">
            <h3 className="text-lg font-semibold text-white tracking-wide">{newsletterHeading}</h3>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-3 max-w-md">
              <div className="relative flex-1">
                <input
                  type="email"
                  placeholder={newsletterPlaceholder}
                  className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-inner"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-blue-500/20 shrink-0"
              >
                <Send className="size-4" /> {newsletterButtonText}
              </button>
            </form>
            <p className="text-xs text-slate-500">We care about the protection of your data. Read our privacy policy.</p>
          </div>
        </div>

        {/* Social Dock & Copyright */}
        <div className="pt-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            {socials.map((soc) => (
              <a
                key={soc.id}
                href={soc.href || "#"}
                target="_blank"
                rel="noreferrer"
                className="group relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/80 transition-all duration-300 shadow-sm hover:-translate-y-0.5"
              >
                <div className="p-2 rounded-lg bg-slate-700/50 group-hover:scale-110 transition-transform duration-200" style={{ color: soc.color || "#38bdf8" }}>
                  <IconRenderer icon={soc.icon || "Globe"} className="size-4.5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">{soc.label || soc.platform}</span>
                  {soc.badge && <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{soc.badge}</span>}
                </div>
                <ArrowRight className="size-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all ml-1" />
              </a>
            ))}
          </div>

          <div className="text-sm text-slate-500 text-center md:text-right">
            {copyright}
          </div>
        </div>
      </div>
    </footer>
  );
}
