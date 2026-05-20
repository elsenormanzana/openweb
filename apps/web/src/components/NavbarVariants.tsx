import { useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import type { NavMenuItem, NavDropdownLink } from "@/lib/api";

export type NavVariantProps = {
  logoText: string;
  logoImage?: string;
  logoHref: string;
  navLinks: NavMenuItem[];
  navLinkStyle?: "classic" | "underline" | "pill" | "art-gradient";
  dropdownStyle?: "minimal" | "modern-card" | "gradient-border" | "glassmorphic";
  dropdownAnimation?: "fade" | "slide-up" | "scale-up" | "fade-slide";
  ctaPrimaryText?: string;
  ctaPrimaryHref?: string;
  ctaSecondaryText?: string;
  ctaSecondaryHref?: string;
  heroBadge?: string;
  heroHeadline?: string;
  heroDescription?: string;
  headerStyle?: "transparent" | "solid";
  headerBg?: string;
  headerTextColor?: string;
};

function HamburgerIcon() {
  return (
    <svg aria-hidden="true" className="h-6 text-slate-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M3 9a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 9Zm0 6.75a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg aria-hidden="true" className="shrink-0 ml-2 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  );
}

function isExternalHref(href: string): boolean {
  return /^(https?:\/\/|mailto:|tel:)/i.test(href);
}

function NavAnchor({ href, className, style, children }: { href?: string; className: string; style?: CSSProperties; children: ReactNode }) {
  const targetHref = href && href.trim() ? href : "#";
  if (isExternalHref(targetHref)) {
    return (
      <a href={targetHref} className={className} style={style}>
        {children}
      </a>
    );
  }
  return (
    <Link to={targetHref} className={className} style={style}>
      {children}
    </Link>
  );
}

function LogoBrand({ logoText, logoImage, logoHref, linkStyle }: { logoText: string; logoImage?: string; logoHref: string; linkStyle?: CSSProperties }) {
  return (
    <NavAnchor href={logoHref} className="inline-flex items-center gap-2 font-semibold text-lg text-neutral-900" style={linkStyle}>
      {logoImage ? <img src={logoImage} alt={logoText || "Logo"} className="h-8 w-auto max-w-36 object-contain" /> : null}
      {logoText ? <span>{logoText}</span> : null}
    </NavAnchor>
  );
}

function DropdownPanel({
  groups,
  dropdownStyle = "minimal",
  dropdownAnimation = "fade",
}: {
  groups: NonNullable<NavMenuItem["dropdown"]>;
  dropdownStyle?: "minimal" | "modern-card" | "gradient-border" | "glassmorphic";
  dropdownAnimation?: "fade" | "slide-up" | "scale-up" | "fade-slide";
}) {
  const location = useLocation();

  // Outer transition/animation styles
  let animationClass = "";
  if (dropdownAnimation === "slide-up") {
    animationClass = "absolute left-0 top-full pt-2 z-50 pointer-events-none opacity-0 translate-y-3 transition-all duration-300 ease-out group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0";
  } else if (dropdownAnimation === "scale-up") {
    animationClass = "absolute left-0 top-full pt-2 z-50 pointer-events-none opacity-0 scale-95 origin-top transition-all duration-300 ease-out group-hover:pointer-events-auto group-hover:opacity-100 group-hover:scale-100";
  } else if (dropdownAnimation === "fade-slide") {
    animationClass = "absolute left-0 top-full pt-2 z-50 pointer-events-none opacity-0 translate-y-2 scale-[0.98] origin-top transition-all duration-300 ease-in-out group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100";
  } else {
    // default/fade
    animationClass = "absolute left-0 top-full pt-2 z-50 pointer-events-none opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100";
  }

  let container = null;
  if (dropdownStyle === "modern-card") {
    container = (
      <div className="min-w-[320px] rounded-2xl border border-neutral-100 bg-white p-4 shadow-2xl relative overflow-hidden dark:bg-neutral-950 dark:border-neutral-900">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-indigo-500" />
        <div className="space-y-3 mt-1">
          {groups.map((group, gi) => (
            <div key={gi} className="space-y-2">
              {group.title ? (
                <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                  {group.title}
                </p>
              ) : null}
              <div className="space-y-1">
                {group.links.map((entry, li) => {
                  const isActive = isLinkActive(entry.href, location.pathname, location.hash);
                  return (
                    <div
                      key={li}
                      className={`rounded-xl px-3 py-2 transition-all border ${
                        isActive
                          ? "bg-primary/5 text-primary border-primary/20 shadow-sm font-semibold"
                          : "border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:border-neutral-100 dark:hover:border-neutral-800"
                      }`}
                    >
                      {entry.title ? (
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                          {entry.title}
                        </p>
                      ) : null}
                      <NavAnchor
                        href={entry.href}
                        className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                          isActive ? "text-primary" : "text-neutral-800 hover:text-neutral-600 dark:text-neutral-200 dark:hover:text-neutral-400"
                        }`}
                      >
                        {isActive && <span className="size-1.5 rounded-full bg-primary animate-pulse" />}
                        <span>{entry.label}</span>
                      </NavAnchor>
                      {(entry.children ?? []).length > 0 ? (
                        <div className="mt-1.5 space-y-1 pl-3 border-l border-neutral-200 dark:border-neutral-800">
                          {entry.children?.map((child, ci) => {
                            const isChildActive = isLinkActive(child.href, location.pathname, location.hash);
                            return (
                              <NavAnchor
                                key={ci}
                                href={child.href}
                                className={`flex items-center gap-1 text-xs transition-colors py-0.5 ${
                                  isChildActive
                                    ? "text-primary font-semibold"
                                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                                }`}
                              >
                                {isChildActive && <span className="text-primary font-bold">›</span>}
                                <span>{child.label}</span>
                              </NavAnchor>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (dropdownStyle === "gradient-border") {
    container = (
      <div className="min-w-[300px] p-[1px] bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-white dark:bg-neutral-950 p-3 rounded-[11px] space-y-3">
          {groups.map((group, gi) => (
            <div key={gi} className="space-y-2">
              {group.title ? (
                <p className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                  {group.title}
                </p>
              ) : null}
              <div className="space-y-1">
                {group.links.map((entry, li) => {
                  const isActive = isLinkActive(entry.href, location.pathname, location.hash);
                  return (
                    <div
                      key={li}
                      className={`rounded-lg px-2.5 py-1.5 transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-pink-500/10 to-indigo-500/10 text-neutral-900 dark:text-white font-semibold border-r-2 border-indigo-500"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      }`}
                    >
                      {entry.title ? (
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                          {entry.title}
                        </p>
                      ) : null}
                      <NavAnchor
                        href={entry.href}
                        className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent"
                            : "text-neutral-800 hover:text-neutral-600 dark:text-neutral-200 dark:hover:text-neutral-400"
                        }`}
                      >
                        {isActive && <span className="size-1.5 rounded-full bg-gradient-to-r from-pink-500 to-indigo-500" />}
                        <span>{entry.label}</span>
                      </NavAnchor>
                      {(entry.children ?? []).length > 0 ? (
                        <div className="mt-1.5 space-y-1 pl-3 border-l border-neutral-200 dark:border-neutral-800">
                          {entry.children?.map((child, ci) => {
                            const isChildActive = isLinkActive(child.href, location.pathname, location.hash);
                            return (
                              <NavAnchor
                                key={ci}
                                href={child.href}
                                className={`flex items-center gap-1 text-xs transition-colors py-0.5 ${
                                  isChildActive
                                    ? "text-purple-600 dark:text-purple-400 font-semibold"
                                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                                }`}
                              >
                                {isChildActive && <span className="text-purple-500 font-bold">›</span>}
                                <span>{child.label}</span>
                              </NavAnchor>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (dropdownStyle === "glassmorphic") {
    container = (
      <div className="min-w-[280px] rounded-2xl border border-white/20 bg-white/70 backdrop-blur-xl p-3 shadow-2xl dark:bg-neutral-900/60 dark:border-white/10">
        <div className="space-y-3">
          {groups.map((group, gi) => (
            <div key={gi} className="space-y-2">
              {group.title ? (
                <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                  {group.title}
                </p>
              ) : null}
              <div className="space-y-0.5">
                {group.links.map((entry, li) => {
                  const isActive = isLinkActive(entry.href, location.pathname, location.hash);
                  return (
                    <div
                      key={li}
                      className={`rounded-lg px-2.5 py-1.5 transition-all ${
                        isActive
                          ? "bg-white/80 dark:bg-white/20 text-neutral-950 dark:text-white shadow-inner font-semibold border-l-2 border-indigo-500 -ml-2 pl-3.5"
                          : "hover:bg-white/50 dark:hover:bg-white/10"
                      }`}
                    >
                      {entry.title ? (
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                          {entry.title}
                        </p>
                      ) : null}
                      <NavAnchor
                        href={entry.href}
                        className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                          isActive ? "text-neutral-950 dark:text-white" : "text-neutral-800 hover:text-neutral-600 dark:text-neutral-200 dark:hover:text-neutral-400"
                        }`}
                      >
                        {isActive && <span className="size-1.5 rounded-full bg-indigo-500" />}
                        <span>{entry.label}</span>
                      </NavAnchor>
                      {(entry.children ?? []).length > 0 ? (
                        <div className="mt-1.5 space-y-1 pl-3 border-l border-neutral-200 dark:border-neutral-800">
                          {entry.children?.map((child, ci) => {
                            const isChildActive = isLinkActive(child.href, location.pathname, location.hash);
                            return (
                              <NavAnchor
                                key={ci}
                                href={child.href}
                                className={`flex items-center gap-1 text-xs transition-colors py-0.5 ${
                                  isChildActive
                                    ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                                }`}
                              >
                                {isChildActive && <span className="text-indigo-500 font-bold">›</span>}
                                <span>{child.label}</span>
                              </NavAnchor>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    // minimal
    container = (
      <div className="min-w-[280px] rounded-xl border border-neutral-100 bg-white p-3 shadow-lg dark:bg-neutral-900 dark:border-neutral-800">
        <div className="space-y-3">
          {groups.map((group, gi) => (
            <div key={gi} className="space-y-2">
              {group.title ? (
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  {group.title}
                </p>
              ) : null}
              <div className="space-y-1">
                {group.links.map((entry, li) => {
                  const isActive = isLinkActive(entry.href, location.pathname, location.hash);
                  return (
                    <div
                      key={li}
                      className={`rounded-md px-2.5 py-1.5 transition-colors ${
                        isActive
                          ? "bg-neutral-50 dark:bg-neutral-800 text-primary font-semibold border-l-2 border-primary -ml-2 pl-3.5"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      }`}
                    >
                      {entry.title ? (
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                          {entry.title}
                        </p>
                      ) : null}
                      <NavAnchor
                        href={entry.href}
                        className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                          isActive ? "text-primary" : "text-neutral-800 hover:text-neutral-600 dark:text-neutral-200 dark:hover:text-neutral-400"
                        }`}
                      >
                        {isActive && <span className="size-1.5 rounded-full bg-primary" />}
                        <span>{entry.label}</span>
                      </NavAnchor>
                      {(entry.children ?? []).length > 0 ? (
                        <div className="mt-1.5 space-y-1 pl-3 border-l border-neutral-200 dark:border-neutral-800">
                          {entry.children?.map((child, ci) => {
                            const isChildActive = isLinkActive(child.href, location.pathname, location.hash);
                            return (
                              <NavAnchor
                                key={ci}
                                href={child.href}
                                className={`flex items-center gap-1 text-xs transition-colors py-0.5 ${
                                  isChildActive
                                    ? "text-primary font-semibold"
                                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                                }`}
                              >
                                {isChildActive && <span className="text-primary font-bold">›</span>}
                                <span>{child.label}</span>
                              </NavAnchor>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={animationClass}>
      {container}
    </div>
  );
}

function isLinkActive(href?: string, pathname?: string, hash?: string): boolean {
  if (!href) return false;
  const path = pathname || "/";
  const h = hash || "";
  if (href.startsWith("#")) {
    return h === href;
  }
  const cleanHref = href.replace(/\/+$/, "");
  const cleanPath = path.replace(/\/+$/, "");
  if (cleanHref === "" && cleanPath === "") {
    return h === "";
  }
  return cleanPath === cleanHref;
}

function DesktopNav({
  links,
  linkStyle,
  navLinkStyle = "classic",
  dropdownStyle = "minimal",
  dropdownAnimation = "fade",
}: {
  links: NavMenuItem[];
  linkStyle?: CSSProperties;
  navLinkStyle?: "classic" | "underline" | "pill" | "art-gradient";
  dropdownStyle?: "minimal" | "modern-card" | "gradient-border" | "glassmorphic";
  dropdownAnimation?: "fade" | "slide-up" | "scale-up" | "fade-slide";
}) {
  const location = useLocation();

  return (
    <nav className="hidden lg:block">
      <ul className="flex items-center gap-x-1">
        {links.map((item, i) => {
          const hasDropdown = (item.dropdown ?? []).length > 0;
          const isDirectActive = isLinkActive(item.href, location.pathname, location.hash);
          
          // Parent menu item highlighting: check if any dropdown links or child links are active
          const hasActiveDropdownLink = item.dropdown?.some(group => 
            group.links?.some(entry => 
              isLinkActive(entry.href, location.pathname, location.hash) || 
              entry.children?.some(child => isLinkActive(child.href, location.pathname, location.hash))
            )
          );
          const isActive = isDirectActive || hasActiveDropdownLink;

          let containerClass = "relative py-1.5 px-3 text-sm font-medium transition-all group/link flex items-center gap-1 rounded-md ";
          let customLinkStyle = { ...linkStyle };
          let underlineElement = null;

          if (navLinkStyle === "underline") {
            containerClass += isActive 
              ? "text-neutral-900 dark:text-white font-semibold "
              : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white ";
            underlineElement = (
              <span className={`absolute bottom-0 left-3 right-3 h-[2px] bg-primary transition-all duration-300 ${isActive ? "w-[calc(100%-1.5rem)] opacity-100" : "w-0 opacity-0 group-hover/link:w-[calc(100%-1.5rem)] group-hover/link:opacity-100"}`} />
            );
          } else if (navLinkStyle === "pill") {
            containerClass = "relative py-1.5 px-4 text-sm font-medium transition-all group/link flex items-center gap-1 rounded-full z-10 ";
            if (isActive) {
              containerClass += "text-primary font-semibold ";
            } else {
              containerClass += "text-neutral-600 hover:bg-neutral-100/50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white ";
            }
            // CSS-only active pill — keeps framer-motion out of the navbar so
            // it never loads on pages without animated blocks.
            underlineElement = isActive ? (
              <span className="absolute inset-0 bg-primary/10 rounded-full -z-10 transition-colors duration-200" />
            ) : null;
          } else if (navLinkStyle === "art-gradient") {
            containerClass += "font-bold ";
            if (isActive) {
              containerClass += "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent ";
            } else {
              containerClass += "text-neutral-600 hover:bg-gradient-to-r hover:from-pink-500 hover:via-purple-500 hover:to-indigo-500 hover:bg-clip-text hover:text-transparent dark:text-neutral-300 ";
            }
            underlineElement = (
              <span className={`absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 transition-all duration-300 ${isActive ? "w-[calc(100%-1.5rem)] opacity-100" : "w-0 opacity-0 group-hover/link:w-[calc(100%-1.5rem)] group-hover/link:opacity-100"}`} />
            );
          } else {
            // classic
            if (isActive) {
              containerClass += "text-primary font-semibold ";
            } else {
              containerClass += "text-neutral-700 hover:text-primary dark:text-neutral-300 dark:hover:text-white ";
            }
          }

          if (hasDropdown) {
            return (
              <li key={i} className="relative group">
                <button type="button" style={customLinkStyle} className={containerClass}>
                  <span>{item.label}</span>
                  <ChevronDown />
                  {underlineElement}
                </button>
                <DropdownPanel groups={item.dropdown ?? []} dropdownStyle={dropdownStyle} dropdownAnimation={dropdownAnimation} />
              </li>
            );
          }

          return (
            <li key={i}>
              <NavAnchor href={item.href} style={customLinkStyle} className={containerClass}>
                <span>{item.label}</span>
                {underlineElement}
              </NavAnchor>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function DropdownMobileEntry({ entry }: { entry: NavDropdownLink }) {
  const [open, setOpen] = useState(false);
  const hasChildren = (entry.children ?? []).length > 0;

  return (
    <div className="rounded-md border border-neutral-100 bg-white">
      <div className="p-2">
        {entry.title ? <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{entry.title}</p> : null}
        <div className="mt-1 flex items-center justify-between gap-2">
          <NavAnchor href={entry.href} className="text-sm font-medium text-neutral-800 hover:text-neutral-600">
            {entry.label}
          </NavAnchor>
          {hasChildren ? (
            <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-neutral-600">
              {open ? "Hide" : "Show"}
              <ChevronDown />
            </button>
          ) : null}
        </div>
      </div>
      {open && hasChildren ? (
        <div className="border-t px-3 py-2 space-y-1.5">
          {entry.children?.map((child, ci) => (
            <NavAnchor key={ci} href={child.href} className="block text-xs text-neutral-600 hover:text-neutral-800">
              {child.label}
            </NavAnchor>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MobileDrawer({
  links,
  open,
  navLinkStyle = "classic",
}: {
  links: NavMenuItem[];
  open: boolean;
  navLinkStyle?: "classic" | "underline" | "pill" | "art-gradient";
}) {
  const [openIndexes, setOpenIndexes] = useState<Record<number, boolean>>({});
  const location = useLocation();

  if (!open || links.length === 0) return null;

  return (
    <div className="border-t mt-2 pt-2 lg:hidden">
      <nav className="flex flex-col gap-1.5 px-2 pb-2">
        {links.map((item, i) => {
          const hasDropdown = (item.dropdown ?? []).length > 0;
          const isActive = isLinkActive(item.href, location.pathname, location.hash);

          let mobileClass = "px-3 py-2 text-sm font-medium rounded-md transition-colors block ";
          if (navLinkStyle === "underline") {
            mobileClass += isActive
              ? "text-primary border-l-2 border-primary pl-2 bg-neutral-50/50 "
              : "text-neutral-700 hover:bg-neutral-50 ";
          } else if (navLinkStyle === "pill") {
            mobileClass += isActive
              ? "bg-primary/10 text-primary font-semibold px-4 rounded-full "
              : "text-neutral-700 hover:bg-neutral-50 ";
          } else if (navLinkStyle === "art-gradient") {
            mobileClass += "font-bold ";
            mobileClass += isActive
              ? "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent border-l-2 border-pink-500 pl-2 "
              : "text-neutral-700 hover:bg-neutral-50 ";
          } else {
            // classic
            mobileClass += isActive
              ? "text-primary font-semibold bg-primary/5 "
              : "text-neutral-700 hover:bg-neutral-50 ";
          }

          if (!hasDropdown) {
            return (
              <NavAnchor key={i} href={item.href} className={mobileClass}>
                {item.label}
              </NavAnchor>
            );
          }
          const isOpen = !!openIndexes[i];
          return (
            <div key={i} className="rounded-lg border border-neutral-200 bg-neutral-50">
              <button
                type="button"
                onClick={() => setOpenIndexes((prev) => ({ ...prev, [i]: !prev[i] }))}
                className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-neutral-700"
              >
                <span className={isActive ? "text-primary font-semibold" : ""}>{item.label}</span>
                <ChevronDown />
              </button>
              {isOpen ? (
                <div className="border-t bg-white px-2 py-2 space-y-2">
                  {(item.dropdown ?? []).map((group, gi) => (
                    <div key={gi} className="space-y-2">
                      {group.title ? <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 px-1">{group.title}</p> : null}
                      {(group.links ?? []).map((entry, ei) => <DropdownMobileEntry key={ei} entry={entry} />)}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

/** Navbar 1 — Minimal clean */
export function NavbarMinimal({ logoText, logoImage, logoHref, navLinks, navLinkStyle, dropdownStyle, dropdownAnimation, ctaPrimaryText, ctaPrimaryHref, ctaSecondaryText, ctaSecondaryHref, headerStyle, headerBg, headerTextColor }: NavVariantProps) {
  const [open, setOpen] = useState(false);
  const isTransparent = headerStyle === "transparent";
  const wrapStyle: CSSProperties = isTransparent
    ? { position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, background: "transparent" }
    : { backgroundColor: headerBg };
  const linkStyle = headerTextColor ? { color: headerTextColor } : undefined;

  return (
    <header style={wrapStyle} className={`py-4 w-full ${isTransparent ? "" : "border-b"}`}>
      <div className="max-w-7xl mx-auto px-4 xl:px-0 flex items-center justify-between gap-x-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:justify-stretch lg:gap-x-12">
        <LogoBrand logoText={logoText} logoImage={logoImage} logoHref={logoHref} linkStyle={linkStyle} />

        <DesktopNav links={navLinks} linkStyle={linkStyle} navLinkStyle={navLinkStyle} dropdownStyle={dropdownStyle} dropdownAnimation={dropdownAnimation} />

        <div className="flex flex-wrap items-center justify-center gap-3 justify-self-end lg:flex-nowrap lg:gap-x-2">
          {ctaSecondaryText && (
            <NavAnchor href={ctaSecondaryHref ?? "#"} className="hidden lg:flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all px-3 py-2 rounded-[0.625rem] border border-neutral-100 bg-white text-neutral-700 hover:border-neutral-200 hover:bg-neutral-100">
              {ctaSecondaryText}
            </NavAnchor>
          )}
          {ctaPrimaryText && (
            <NavAnchor href={ctaPrimaryHref ?? "#"} className="flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all px-3 py-2 rounded-[0.625rem] bg-slate-900 text-white hover:bg-slate-800">
              {ctaPrimaryText}
            </NavAnchor>
          )}
          <button type="button" aria-label="Open menu" onClick={() => setOpen(!open)} className="lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
            <HamburgerIcon />
          </button>
        </div>
      </div>
      <MobileDrawer links={navLinks} open={open} navLinkStyle={navLinkStyle} />
    </header>
  );
}

/** Navbar 2 — Elevated floating card (absolutely positioned over page content) */
export function NavbarElevated({ logoText, logoImage, logoHref, navLinks, navLinkStyle, dropdownStyle, dropdownAnimation, ctaPrimaryText, ctaPrimaryHref, ctaSecondaryText, ctaSecondaryHref }: NavVariantProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 py-3">
        <div className="max-w-7xl mx-auto px-4 xl:px-0">
          <div className="bg-white flex items-center justify-between gap-x-4 rounded-2xl py-2.5 pl-5 pr-2.5 shadow-[0_2px_10px_0px_rgba(0,0,0,0.15)] lg:grid lg:grid-cols-[1fr_auto_1fr] lg:justify-stretch lg:gap-x-12 lg:rounded-[1.375rem]">
            <div className="flex items-center gap-x-10">
              <LogoBrand logoText={logoText} logoImage={logoImage} logoHref={logoHref} />
              <span className="hidden h-4 w-[1px] bg-neutral-300 lg:block" />
            </div>

            <DesktopNav links={navLinks} navLinkStyle={navLinkStyle} dropdownStyle={dropdownStyle} dropdownAnimation={dropdownAnimation} />

            <div className="flex items-center gap-x-10 justify-self-end">
              <span className="hidden h-4 w-[1px] bg-neutral-300 lg:block" />
              <div className="flex items-center gap-x-3 lg:gap-x-2">
                {ctaSecondaryText && (
                  <NavAnchor href={ctaSecondaryHref ?? "#"} className="hidden lg:flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all shadow-[0_2px_10px_0px_rgba(0,0,0,0.05)] border border-neutral-100 bg-white text-neutral-700 hover:border-neutral-200 hover:bg-neutral-100 px-3 py-2 rounded-[0.625rem]">
                    {ctaSecondaryText}
                  </NavAnchor>
                )}
                {ctaPrimaryText && (
                  <NavAnchor href={ctaPrimaryHref ?? "#"} className="flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all shadow-[0_2px_10px_0px_rgba(0,0,0,0.05)] bg-slate-900 text-white hover:bg-slate-800 px-3 py-2 rounded-[0.625rem]">
                    {ctaPrimaryText}
                  </NavAnchor>
                )}
                <button type="button" aria-label="Open menu" onClick={() => setOpen(!open)} className="lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
                  <HamburgerIcon />
                </button>
              </div>
            </div>
          </div>

          {open && (
            <div className="mt-2 bg-white rounded-2xl shadow-[0_2px_10px_0px_rgba(0,0,0,0.15)] overflow-hidden">
              <MobileDrawer links={navLinks} open={open} navLinkStyle={navLinkStyle} />
            </div>
          )}
        </div>
      </header>
      <div className="h-24 md:h-28" aria-hidden="true" />
    </>
  );
}

/** Header 1 — SaaS landing with dual CTAs */
export function HeaderSaasCta({ logoText, logoImage, logoHref, navLinks, navLinkStyle, dropdownStyle, dropdownAnimation, ctaPrimaryText, ctaPrimaryHref, ctaSecondaryText, ctaSecondaryHref, heroBadge, heroHeadline, heroDescription }: NavVariantProps) {
  const [open, setOpen] = useState(false);
  const hasHero = heroBadge || heroHeadline || heroDescription;

  return (
    <>
      <header className="py-4 w-full border-b">
        <div className="max-w-7xl mx-auto px-4 xl:px-0 flex items-center justify-between gap-x-4">
          <LogoBrand logoText={logoText} logoImage={logoImage} logoHref={logoHref} />
          <DesktopNav links={navLinks} navLinkStyle={navLinkStyle} dropdownStyle={dropdownStyle} dropdownAnimation={dropdownAnimation} />
          <div className="flex items-center gap-2">
            {ctaSecondaryText && (
              <NavAnchor href={ctaSecondaryHref ?? "#"} className="hidden lg:flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all px-3 py-2 rounded-[0.625rem] border border-neutral-100 bg-white text-neutral-700 hover:border-neutral-200 hover:bg-neutral-100">
                {ctaSecondaryText}
              </NavAnchor>
            )}
            {ctaPrimaryText && (
              <NavAnchor href={ctaPrimaryHref ?? "#"} className="flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all px-3 py-2 rounded-[0.625rem] bg-slate-900 text-white hover:bg-slate-800">
                {ctaPrimaryText}
              </NavAnchor>
            )}
            <button type="button" aria-label="Open menu" onClick={() => setOpen(!open)} className="lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
              <HamburgerIcon />
            </button>
          </div>
        </div>
        <MobileDrawer links={navLinks} open={open} navLinkStyle={navLinkStyle} />
      </header>

      {hasHero && (
        <section className="pt-12 pb-16 lg:pt-16">
          <div className="max-w-7xl mx-auto px-4 xl:px-0 flex flex-col items-center">
            {heroBadge && (
              <div className="inline-flex items-center justify-center rounded-full text-sm font-medium whitespace-nowrap shadow-[0_2px_10px_0px_rgba(0,0,0,0.15)] bg-white text-neutral-700 px-2.5 py-1">
                {heroBadge}
              </div>
            )}
            {heroHeadline && (
              <div className="bg-gradient-to-b from-slate-800 to-slate-600 bg-clip-text text-3xl font-semibold text-transparent lg:text-5xl mt-6 text-center sm:mx-auto sm:w-1/2 md:mt-8 md:w-2/5 lg:w-1/2 lg:leading-tight xl:mt-9 xl:w-2/5">
                {heroHeadline}
              </div>
            )}
            {heroDescription && (
              <p className="text-sm font-medium text-slate-600 leading-normal lg:leading-normal lg:text-base mt-4 text-center sm:mx-auto sm:w-2/3 md:w-1/2 xl:w-2/5">
                {heroDescription}
              </p>
            )}
            {(ctaPrimaryText || ctaSecondaryText) && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:mt-8 xl:mt-9">
                {ctaSecondaryText && (
                  <NavAnchor href={ctaSecondaryHref ?? "#"} className="flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all shadow-[0_2px_10px_0px_rgba(0,0,0,0.05)] border border-neutral-100 bg-white text-neutral-700 hover:border-neutral-200 hover:bg-neutral-100 px-4 py-2.5 rounded-[0.625rem]">
                    {ctaSecondaryText}
                  </NavAnchor>
                )}
                {ctaPrimaryText && (
                  <NavAnchor href={ctaPrimaryHref ?? "#"} className="flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all shadow-[0_2px_10px_0px_rgba(0,0,0,0.05)] bg-slate-900 text-white hover:bg-slate-800 px-4 py-2.5 rounded-[0.625rem]">
                    {ctaPrimaryText}
                    <ArrowRight />
                  </NavAnchor>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}

/** Header 2 — SaaS landing with email capture */
export function HeaderSaasEmail({ logoText, logoImage, logoHref, navLinks, navLinkStyle, dropdownStyle, dropdownAnimation, ctaPrimaryText, ctaPrimaryHref, heroBadge, heroHeadline, heroDescription }: NavVariantProps) {
  const [open, setOpen] = useState(false);
  const hasHero = heroBadge || heroHeadline || heroDescription;

  return (
    <div className={hasHero ? "bg-gradient-to-b from-[#E9FFDF] via-[#DBF2FF] to-white" : undefined}>
      <header className="py-4 w-full border-b border-transparent">
        <div className="max-w-7xl mx-auto px-4 xl:px-0 flex items-center justify-between gap-x-4">
          <LogoBrand logoText={logoText} logoImage={logoImage} logoHref={logoHref} />
          <DesktopNav links={navLinks} navLinkStyle={navLinkStyle} dropdownStyle={dropdownStyle} dropdownAnimation={dropdownAnimation} />
          <button type="button" aria-label="Open menu" onClick={() => setOpen(!open)} className="lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
            <HamburgerIcon />
          </button>
        </div>
        <MobileDrawer links={navLinks} open={open} navLinkStyle={navLinkStyle} />
      </header>

      {hasHero && (
        <section className="pt-8 pb-16 lg:pt-12">
          <div className="max-w-7xl mx-auto px-4 xl:px-0 flex flex-col items-center">
            {heroBadge && (
              <div className="inline-flex items-center justify-center rounded-full text-sm font-medium whitespace-nowrap shadow-[0_2px_10px_0px_rgba(0,0,0,0.15)] bg-white text-neutral-700 px-2.5 py-1">
                {heroBadge}
              </div>
            )}
            {heroHeadline && (
              <div className="bg-gradient-to-b from-slate-800 to-slate-600 bg-clip-text text-3xl font-semibold text-transparent lg:text-5xl mt-8 text-center sm:mx-auto sm:w-2/3 md:w-3/4 lg:mt-9 lg:leading-tight xl:w-3/5">
                {heroHeadline}
              </div>
            )}
            {heroDescription && (
              <p className="text-sm font-medium text-slate-600 leading-normal lg:leading-normal lg:text-base mt-4 text-center sm:mx-auto sm:w-2/3 md:w-1/2 xl:w-2/5">
                {heroDescription}
              </p>
            )}
            <div className="mt-8 flex w-full flex-col gap-y-2 sm:mx-auto sm:w-1/2 md:w-2/5 lg:mt-9 lg:flex-row lg:items-center lg:gap-x-4 lg:gap-y-0">
              <div className="group relative rounded-xl border border-neutral-200 bg-white transition-all hover:bg-neutral-50 flex-1">
                <svg className="absolute top-1/2 -translate-y-1/2 left-3 h-5 text-neutral-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
                  <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
                </svg>
                <input
                  type="email"
                  aria-label="Email address"
                  autoComplete="email"
                  className="font-medium w-full rounded-xl bg-transparent shadow-[0_2px_10px_0px_rgba(0,0,0,0.05)] text-sm placeholder:font-medium placeholder:text-sm text-neutral-700 focus-visible:outline-none focus:shadow-[0_0px_0px_2px_rgba(15,23,42,0.25)] pl-10 pr-4 py-3 placeholder:text-neutral-300"
                  placeholder="Enter your email"
                />
              </div>
              {ctaPrimaryText && (
                <NavAnchor href={ctaPrimaryHref ?? "#"} className="flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all shadow-[0_2px_10px_0px_rgba(0,0,0,0.05)] bg-slate-900 text-white hover:bg-slate-800 px-5 py-3 rounded-xl">
                  {ctaPrimaryText}
                  <ArrowRight />
                </NavAnchor>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
