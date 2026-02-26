import type { NavbarBlockProps } from "@/lib/blocks";

export function NavbarBlock({ props }: { props: NavbarBlockProps }) {
  const { logoText, logoHref, links, ctaLabel, ctaHref, style, sticky } = props;

  const bgMap = {
    light: "bg-white border-b border-gray-200",
    dark: "bg-gray-900",
    transparent: "bg-transparent",
  };
  const textMap = {
    light: "text-gray-900",
    dark: "text-white",
    transparent: "text-white",
  };
  const linkMap = {
    light: "text-gray-600 hover:text-gray-900",
    dark: "text-gray-300 hover:text-white",
    transparent: "text-white/80 hover:text-white",
  };
  const ctaMap = {
    light: "bg-gray-900 text-white hover:bg-gray-700",
    dark: "bg-white text-gray-900 hover:bg-gray-100",
    transparent: "bg-white text-gray-900 hover:bg-white/90",
  };

  return (
    <nav
      className={`w-full ${bgMap[style]} ${sticky ? "sticky top-0 z-50" : ""}`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-8">
        <a href={logoHref || "/"} className={`font-bold text-xl shrink-0 ${textMap[style]}`}>
          {logoText}
        </a>
        <div className="flex items-center gap-7 flex-1">
          {links.map((link, i) => (
            <a
              key={i}
              href={link.href}
              className={`text-sm font-medium transition-colors ${linkMap[style]}`}
            >
              {link.label}
            </a>
          ))}
        </div>
        {ctaLabel && (
          <a
            href={ctaHref || "#"}
            className={`inline-flex items-center justify-center px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${ctaMap[style]}`}
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </nav>
  );
}
