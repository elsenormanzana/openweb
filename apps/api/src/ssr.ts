import type { Page, SiteSettings, BlogPost } from "./db/schema.js";

// Helper to normalize palette to CSS variables
export function paletteToCSS(palette: any): string {
  const defaultPalette = {
    primary: "#2563eb",
    secondary: "#0f172a",
    accent: "#f59e0b",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#111827",
    muted: "#6b7280",
    border: "#e5e7eb",
  };
  const activePalette = { ...defaultPalette, ...palette };
  return `:root{${Object.entries(activePalette).map(([k, v]) => `--palette-${k}:${v}`).join(";")}}`;
}

// Brand/Lucide SVGs for server-side layout
export function renderIcon(name: string, className: string = "size-4", color: string = "currentColor", solidWhite: boolean = false): string {
  const normalized = (name || "").trim().toLowerCase();
  
  if (normalized === "google") {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="${solidWhite ? "currentColor" : "#4285F4"}">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="${solidWhite ? "currentColor" : "#4285F4"}" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="${solidWhite ? "currentColor" : "#34A853"}" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="${solidWhite ? "currentColor" : "#FBBC05"}" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="${solidWhite ? "currentColor" : "#EA4335"}" />
    </svg>`;
  }
  if (normalized === "facebook") {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="${solidWhite ? "currentColor" : "#1877F2"}">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>`;
  }
  if (normalized === "instagram") {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="${solidWhite ? "currentColor" : "#E4405F"}">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>`;
  }
  if (normalized === "github") {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.2: 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>`;
  }
  if (normalized === "linkedin") {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="${solidWhite ? "currentColor" : "#0A66C2"}">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>`;
  }
  if (normalized === "youtube") {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="${solidWhite ? "currentColor" : "#FF0000"}">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>`;
  }
  if (normalized === "x" || normalized === "twitter") {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>`;
  }
  if (normalized === "whatsapp") {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="${solidWhite ? "currentColor" : "#25D366"}">
      <path d="M12.031 0C5.398 0 0 5.398 0 12.031c0 2.63.844 5.074 2.278 7.092L.61 24l5.056-1.625A11.968 11.968 0 0 0 12.03 24c6.633 0 12.031-5.398 12.031-12.031S18.664 0 12.031 0zm6.545 17.203c-.277.781-1.572 1.455-2.17 1.517-.551.057-1.258.118-2.025-.13-1.637-.528-3.708-2.046-5.187-3.525-1.478-1.479-2.997-3.55-3.525-5.187-.248-.767-.187-1.474-.13-2.025.062-.598.736-1.893 1.517-2.17.391-.138.832-.125 1.157.195.27.266.521.729.742 1.182.261.536.425.932.551 1.196.168.35.127.76-.118 1.077-.202.262-.408.489-.607.728-.184.22-.387.419-.17.79.217.371.658 1.025 1.161 1.528.503.503 1.157.944 1.528 1.161.371.217.57.014.79-.17.239-.199.466-.405.728-.607.317-.245.727-.286 1.077-.118.264.126.66.29 1.196.551.453.221.916.472 1.182.742.32.325.333.766.195 1.157z" />
    </svg>`;
  }

  // Fallback simple Globe
  return `<svg class="${className}" style="color:${color}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
  </svg>`;
}

// CTA Button Render Utility
function renderCtaButton(cta: any, defaultClass: string = ""): string {
  if (!cta || !cta.label) return "";
  const variant = cta.variant || "solid";
  const radius = cta.borderRadius || "md";
  const size = cta.size || "md";
  
  let baseClass = "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 shadow-sm ";
  
  if (radius === "none") baseClass += "rounded-none ";
  else if (radius === "sm") baseClass += "rounded-sm ";
  else if (radius === "lg") baseClass += "rounded-lg ";
  else if (radius === "full") baseClass += "rounded-full ";
  else baseClass += "rounded-md ";
  
  if (size === "sm") baseClass += "px-3 py-1.5 text-xs ";
  else if (size === "md") baseClass += "px-5 py-2.5 text-sm ";
  else if (size === "lg") baseClass += "px-8 py-3.5 text-lg ";
  
  const styles: string[] = [];
  if (variant === "outline") {
    baseClass += "border border-current bg-transparent hover:bg-black/5 ";
    if (cta.color) styles.push(`border-color: ${cta.color}`);
    if (cta.textColor || cta.color) styles.push(`color: ${cta.textColor || cta.color}`);
  } else if (variant === "glass") {
    baseClass += "bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 hover:shadow-lg text-white ";
    if (cta.textColor) styles.push(`color: ${cta.textColor}`);
  } else if (variant === "shimmer") {
    baseClass += "relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white hover:shadow-lg hover:scale-[1.02] ";
    if (cta.textColor) styles.push(`color: ${cta.textColor}`);
  } else {
    // solid
    baseClass += "hover:shadow hover:opacity-90 ";
    if (cta.color) {
      styles.push(`background-color: ${cta.color}`);
    } else {
      baseClass += "bg-blue-600 text-white ";
    }
    if (cta.textColor) styles.push(`color: ${cta.textColor}`);
  }
  
  const emojiHtml = cta.emoji ? `<span class="text-base">${cta.emoji}</span>` : "";
  const iconHtml = cta.icon && !cta.emoji ? renderIcon(cta.icon, "size-4.5") : "";
  const finalIcon = emojiHtml || iconHtml;
  
  const leftIcon = cta.iconPosition !== "right" ? finalIcon : "";
  const rightIcon = cta.iconPosition === "right" ? finalIcon : "";
  
  return `<a href="${cta.href || "#"}" class="${baseClass} ${defaultClass}" style="${styles.join("; ")}">${leftIcon}<span>${cta.label}</span>${rightIcon}</a>`;
}

// Check link activity (mock helper)
function isLinkActive(href?: string, currentPath: string = "/"): boolean {
  if (!href) return false;
  if (href.startsWith("#")) return false;
  const cleanHref = href.replace(/\/+$/, "");
  const cleanPath = currentPath.replace(/\/+$/, "");
  if (cleanHref === "" && cleanPath === "") return true;
  return cleanPath === cleanHref;
}

// Generate Dropdown Static Panel
function renderDropdownPanel(groups: any[], dropdownStyle: string = "minimal", currentPath: string = "/"): string {
  let innerHtml = "";
  for (const group of groups) {
    let groupLinksHtml = "";
    const links = group.links || [];
    for (const entry of links) {
      const isActive = isLinkActive(entry.href, currentPath);
      let childLinksHtml = "";
      const children = entry.children || [];
      for (const child of children) {
        const isChildActive = isLinkActive(child.href, currentPath);
        childLinksHtml += `
          <a href="${child.href || "#"}" class="flex items-center gap-1 text-xs transition-colors py-0.5 ${
            isChildActive ? "text-primary font-semibold" : "text-neutral-500 hover:text-neutral-800"
          }">
            ${isChildActive ? `<span class="text-primary font-bold">›</span>` : ""}
            <span>${child.label || ""}</span>
          </a>
        `;
      }

      groupLinksHtml += `
        <div class="rounded-md px-2.5 py-1.5 transition-colors border border-transparent hover:bg-neutral-50">
          ${entry.title ? `<p class="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">${entry.title}</p>` : ""}
          <a href="${entry.href || "#"}" class="flex items-center gap-1.5 text-sm font-medium transition-colors ${
            isActive ? "text-primary font-semibold" : "text-neutral-800 hover:text-neutral-600"
          }">
            ${isActive ? `<span class="size-1.5 rounded-full bg-primary"></span>` : ""}
            <span>${entry.label || ""}</span>
          </a>
          ${children.length > 0 ? `<div class="mt-1.5 space-y-1 pl-3 border-l border-neutral-200">${childLinksHtml}</div>` : ""}
        </div>
      `;
    }

    innerHtml += `
      <div class="space-y-2">
        ${group.title ? `<p class="px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">${group.title}</p>` : ""}
        <div class="space-y-1">${groupLinksHtml}</div>
      </div>
    `;
  }

  let wrapperClass = "absolute left-0 top-full pt-2 z-50 pointer-events-none opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100 ";
  let containerClass = "min-w-[280px] rounded-xl border border-neutral-100 bg-white p-3 shadow-lg ";

  if (dropdownStyle === "modern-card") {
    containerClass = "min-w-[320px] rounded-2xl border border-neutral-100 bg-white p-4 shadow-2xl relative overflow-hidden";
    return `
      <div class="${wrapperClass}">
        <div class="${containerClass}">
          <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-500"></div>
          <div class="space-y-3 mt-1">${innerHtml}</div>
        </div>
      </div>
    `;
  }
  if (dropdownStyle === "gradient-border") {
    containerClass = "min-w-[300px] p-[1px] bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 rounded-xl shadow-2xl overflow-hidden";
    return `
      <div class="${wrapperClass}">
        <div class="${containerClass}">
          <div class="bg-white p-3 rounded-[11px] space-y-3">${innerHtml}</div>
        </div>
      </div>
    `;
  }
  if (dropdownStyle === "glassmorphic") {
    containerClass = "min-w-[280px] rounded-2xl border border-white/20 bg-white/70 backdrop-blur-xl p-3 shadow-2xl";
    return `
      <div class="${wrapperClass}">
        <div class="${containerClass}">
          <div class="space-y-3">${innerHtml}</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="${wrapperClass}">
      <div class="${containerClass}">
        <div class="space-y-3">${innerHtml}</div>
      </div>
    </div>
  `;
}

// Generate Header Desktop Navigation Links
function renderDesktopNav(links: any[], navLinkStyle: string = "classic", dropdownStyle: string = "minimal", currentPath: string = "/"): string {
  let itemsHtml = "";
  for (const item of links) {
    const hasDropdown = (item.dropdown || []).length > 0;
    const isDirectActive = isLinkActive(item.href, currentPath);
    
    // Check nested dropdown link activity
    const hasActiveDropdownLink = item.dropdown?.some((group: any) => 
      group.links?.some((entry: any) => 
        isLinkActive(entry.href, currentPath) || 
        entry.children?.some((child: any) => isLinkActive(child.href, currentPath))
      )
    );
    const isActive = isDirectActive || hasActiveDropdownLink;

    let containerClass = "relative py-1.5 px-3 text-sm font-medium transition-all group/link flex items-center gap-1 rounded-md ";
    let underlineElement = "";

    if (navLinkStyle === "underline") {
      containerClass += isActive 
        ? "text-neutral-900 font-semibold "
        : "text-neutral-600 hover:text-neutral-900 ";
      underlineElement = `<span class="absolute bottom-0 left-3 right-3 h-[2px] bg-blue-600 transition-all duration-300 ${isActive ? "w-[calc(100%-1.5rem)] opacity-100" : "w-0 opacity-0 group-hover/link:w-[calc(100%-1.5rem)] group-hover/link:opacity-100"}"></span>`;
    } else if (navLinkStyle === "pill") {
      containerClass = "relative py-1.5 px-4 text-sm font-medium transition-all group/link flex items-center gap-1 rounded-full z-10 ";
      if (isActive) {
        containerClass += "text-blue-600 font-semibold ";
        underlineElement = `<span class="absolute inset-0 bg-blue-600/10 rounded-full -z-10"></span>`;
      } else {
        containerClass += "text-neutral-600 hover:bg-neutral-100/50 hover:text-neutral-900 ";
      }
    } else if (navLinkStyle === "art-gradient") {
      containerClass += "font-bold ";
      if (isActive) {
        containerClass += "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent ";
      } else {
        containerClass += "text-neutral-600 hover:bg-gradient-to-r hover:from-pink-500 hover:via-purple-500 hover:to-indigo-500 hover:bg-clip-text hover:text-transparent ";
      }
      underlineElement = `<span class="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 transition-all duration-300 ${isActive ? "w-[calc(100%-1.5rem)] opacity-100" : "w-0 opacity-0 group-hover/link:w-[calc(100%-1.5rem)] group-hover/link:opacity-100"}"></span>`;
    } else {
      // classic
      if (isActive) {
        containerClass += "text-blue-600 font-semibold ";
      } else {
        containerClass += "text-neutral-700 hover:text-blue-600 ";
      }
    }

    if (hasDropdown) {
      itemsHtml += `
        <li class="relative group">
          <button type="button" class="${containerClass}">
            <span>${item.label || ""}</span>
            <svg class="size-4" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd" />
            </svg>
            ${underlineElement}
          </button>
          ${renderDropdownPanel(item.dropdown || [], dropdownStyle, currentPath)}
        </li>
      `;
    } else {
      itemsHtml += `
        <li>
          <a href="${item.href || "#"}" class="${containerClass}">
            <span>${item.label || ""}</span>
            ${underlineElement}
          </a>
        </li>
      `;
    }
  }

  return `
    <nav class="hidden lg:block">
      <ul class="flex items-center gap-x-1">${itemsHtml}</ul>
    </nav>
  `;
}

// Generate Site Header Layout
function renderHeader(nav: any, currentPath: string = "/"): string {
  const navVariant = nav.navVariant || "minimal";
  const logoText = nav.logoText || "Logo";
  const logoImage = nav.logoImage || "";
  const logoHref = nav.logoHref || "/";
  const navLinks = Array.isArray(nav.navLinks) ? nav.navLinks : [];
  const navLinkStyle = nav.navLinkStyle || "classic";
  const dropdownStyle = nav.dropdownStyle || "minimal";
  
  const ctaPrimaryText = nav.ctaPrimaryText || "";
  const ctaPrimaryHref = nav.ctaPrimaryHref || "#";
  const ctaSecondaryText = nav.ctaSecondaryText || "";
  const ctaSecondaryHref = nav.ctaSecondaryHref || "#";

  const heroBadge = nav.heroBadge || "";
  const heroHeadline = nav.heroHeadline || "";
  const heroDescription = nav.heroDescription || "";
  const hasHero = heroBadge || heroHeadline || heroDescription;

  const logoBrandHtml = `
    <a href="${logoHref}" class="inline-flex items-center gap-2 font-semibold text-lg text-neutral-900">
      ${logoImage ? `<img src="${logoImage}" alt="${logoText}" class="h-8 w-auto max-w-36 object-contain" />` : ""}
      ${logoText ? `<span>${logoText}</span>` : ""}
    </a>
  `;

  const rightCtaHtml = `
    <div class="flex flex-wrap items-center justify-center gap-3 justify-self-end lg:flex-nowrap lg:gap-x-2">
      ${ctaSecondaryText ? `<a href="${ctaSecondaryHref}" class="hidden lg:flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all px-3 py-2 rounded-[0.625rem] border border-neutral-100 bg-white text-neutral-700 hover:border-neutral-200 hover:bg-neutral-100">${ctaSecondaryText}</a>` : ""}
      ${ctaPrimaryText ? `<a href="${ctaPrimaryHref}" class="flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all px-3 py-2 rounded-[0.625rem] bg-slate-900 text-white hover:bg-slate-800">${ctaPrimaryText}</a>` : ""}
      <button type="button" aria-label="Open menu" class="lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
        <svg class="h-6 text-slate-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" d="M3 9a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 9Zm0 6.75a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  `;

  if (navVariant === "elevated") {
    return `
      <header class="fixed top-0 left-0 right-0 z-50 py-3">
        <div class="max-w-7xl mx-auto px-4 xl:px-0">
          <div class="bg-white flex items-center justify-between gap-x-4 rounded-2xl py-2.5 pl-5 pr-2.5 shadow-[0_2px_10px_0px_rgba(0,0,0,0.15)] lg:grid lg:grid-cols-[1fr_auto_1fr] lg:justify-stretch lg:gap-x-12 lg:rounded-[1.375rem]">
            <div class="flex items-center gap-x-10">
              ${logoBrandHtml}
              <span class="hidden h-4 w-[1px] bg-neutral-300 lg:block"></span>
            </div>
            ${renderDesktopNav(navLinks, navLinkStyle, dropdownStyle, currentPath)}
            <div class="flex items-center gap-x-10 justify-self-end">
              <span class="hidden h-4 w-[1px] bg-neutral-300 lg:block"></span>
              <div class="flex items-center gap-x-3 lg:gap-x-2">
                ${ctaSecondaryText ? `<a href="${ctaSecondaryHref}" class="hidden lg:flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all shadow-[0_2px_10px_0px_rgba(0,0,0,0.05)] border border-neutral-100 bg-white text-neutral-700 hover:border-neutral-200 hover:bg-neutral-100 px-3 py-2 rounded-[0.625rem]">${ctaSecondaryText}</a>` : ""}
                ${ctaPrimaryText ? `<a href="${ctaPrimaryHref}" class="flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all shadow-[0_2px_10px_0px_rgba(0,0,0,0.05)] bg-slate-900 text-white hover:bg-slate-800 px-3 py-2 rounded-[0.625rem]">${ctaPrimaryText}</a>` : ""}
              </div>
            </div>
          </div>
        </div>
      </header>
      <div class="h-24 md:h-28" aria-hidden="true"></div>
    `;
  }

  if (navVariant === "saas-cta") {
    return `
      <header class="py-4 w-full border-b bg-white">
        <div class="max-w-7xl mx-auto px-4 xl:px-0 flex items-center justify-between gap-x-4">
          ${logoBrandHtml}
          ${renderDesktopNav(navLinks, navLinkStyle, dropdownStyle, currentPath)}
          <div class="flex items-center gap-2">
            ${ctaSecondaryText ? `<a href="${ctaSecondaryHref}" class="hidden lg:flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all px-3 py-2 rounded-[0.625rem] border border-neutral-100 bg-white text-neutral-700 hover:border-neutral-200 hover:bg-neutral-100">${ctaSecondaryText}</a>` : ""}
            ${ctaPrimaryText ? `<a href="${ctaPrimaryHref}" class="flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all px-3 py-2 rounded-[0.625rem] bg-slate-900 text-white hover:bg-slate-800">${ctaPrimaryText}</a>` : ""}
          </div>
        </div>
      </header>
      ${hasHero ? `
        <section class="pt-12 pb-16 lg:pt-16 bg-white">
          <div class="max-w-7xl mx-auto px-4 xl:px-0 flex flex-col items-center">
            ${heroBadge ? `<div class="inline-flex items-center justify-center rounded-full text-sm font-medium whitespace-nowrap shadow-[0_2px_10px_0px_rgba(0,0,0,0.15)] bg-white text-neutral-700 px-2.5 py-1">${heroBadge}</div>` : ""}
            ${heroHeadline ? `<div class="bg-gradient-to-b from-slate-800 to-slate-600 bg-clip-text text-3xl font-semibold text-transparent lg:text-5xl mt-6 text-center sm:mx-auto sm:w-1/2 md:mt-8 md:w-2/5 lg:w-1/2 lg:leading-tight xl:mt-9 xl:w-2/5">${heroHeadline}</div>` : ""}
            ${heroDescription ? `<p class="text-sm font-medium text-slate-600 leading-normal lg:leading-normal lg:text-base mt-4 text-center sm:mx-auto sm:w-2/3 md:w-1/2 xl:w-2/5">${heroDescription}</p>` : ""}
            ${(ctaPrimaryText || ctaSecondaryText) ? `
              <div class="mt-6 flex flex-wrap items-center justify-center gap-3 md:mt-8 xl:mt-9">
                ${ctaSecondaryText ? `<a href="${ctaSecondaryHref}" class="flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all shadow-[0_2px_10px_0px_rgba(0,0,0,0.05)] border border-neutral-100 bg-white text-neutral-700 hover:border-neutral-200 hover:bg-neutral-100 px-4 py-2.5 rounded-[0.625rem]">${ctaSecondaryText}</a>` : ""}
                ${ctaPrimaryText ? `<a href="${ctaPrimaryHref}" class="flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all shadow-[0_2px_10px_0px_rgba(0,0,0,0.05)] bg-slate-900 text-white hover:bg-slate-800 px-4 py-2.5 rounded-[0.625rem]"><span>${ctaPrimaryText}</span><svg class="shrink-0 ml-2 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg></a>` : ""}
              </div>
            ` : ""}
          </div>
        </section>
      ` : ""}
    `;
  }

  if (navVariant === "saas-email") {
    return `
      <div class="${hasHero ? "bg-gradient-to-b from-[#E9FFDF] via-[#DBF2FF] to-white" : ""}">
        <header class="py-4 w-full border-b border-transparent">
          <div class="max-w-7xl mx-auto px-4 xl:px-0 flex items-center justify-between gap-x-4">
            ${logoBrandHtml}
            ${renderDesktopNav(navLinks, navLinkStyle, dropdownStyle, currentPath)}
          </div>
        </header>
        ${hasHero ? `
          <section class="pt-8 pb-16 lg:pt-12">
            <div class="max-w-7xl mx-auto px-4 xl:px-0 flex flex-col items-center">
              ${heroBadge ? `<div class="inline-flex items-center justify-center rounded-full text-sm font-medium whitespace-nowrap shadow-[0_2px_10px_0px_rgba(0,0,0,0.15)] bg-white text-neutral-700 px-2.5 py-1">${heroBadge}</div>` : ""}
              ${heroHeadline ? `<div class="bg-gradient-to-b from-slate-800 to-slate-600 bg-clip-text text-3xl font-semibold text-transparent lg:text-5xl mt-8 text-center sm:mx-auto sm:w-2/3 md:w-3/4 lg:mt-9 lg:leading-tight xl:w-3/5">${heroHeadline}</div>` : ""}
              ${heroDescription ? `<p class="text-sm font-medium text-slate-600 leading-normal lg:leading-normal lg:text-base mt-4 text-center sm:mx-auto sm:w-2/3 md:w-1/2 xl:w-2/5">${heroDescription}</p>` : ""}
              <div class="mt-8 flex w-full flex-col gap-y-2 sm:mx-auto sm:w-1/2 md:w-2/5 lg:mt-9 lg:flex-row lg:items-center lg:gap-x-4 lg:gap-y-0">
                <div class="group relative rounded-xl border border-neutral-200 bg-white transition-all hover:bg-neutral-50 flex-1">
                  <svg class="absolute top-1/2 -translate-y-1/2 left-3 h-5 text-neutral-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
                    <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
                  </svg>
                  <input type="email" aria-label="Email address" class="font-medium w-full rounded-xl bg-transparent shadow-[0_2px_10px_0px_rgba(0,0,0,0.05)] text-sm placeholder:font-medium placeholder:text-sm text-neutral-700 focus-visible:outline-none focus:shadow-[0_0px_0px_2px_rgba(15,23,42,0.25)] pl-10 pr-4 py-3 placeholder:text-neutral-300" placeholder="Enter your email" />
                </div>
                ${ctaPrimaryText ? `<a href="${ctaPrimaryHref}" class="flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all shadow-[0_2px_10px_0px_rgba(0,0,0,0.05)] bg-slate-900 text-white hover:bg-slate-800 px-5 py-3 rounded-xl"><span>${ctaPrimaryText}</span><svg class="shrink-0 ml-2 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg></a>` : ""}
              </div>
            </div>
          </section>
        ` : ""}
      </div>
    `;
  }

  // default / minimal
  return `
    <header class="py-4 w-full border-b bg-white">
      <div class="max-w-7xl mx-auto px-4 xl:px-0 flex items-center justify-between gap-x-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:justify-stretch lg:gap-x-12">
        ${logoBrandHtml}
        ${renderDesktopNav(navLinks, navLinkStyle, dropdownStyle, currentPath)}
        ${rightCtaHtml}
      </div>
    </header>
  `;
}

// Generate Site Footer Layout
function renderFooter(footer: any): string {
  const copyright = footer.copyright || "";
  const footerLinks = footer.links || [];
  const columns = footer.columns || [];
  const hasFooter = copyright || footerLinks.length > 0 || columns.length > 0;

  if (!hasFooter) return "";

  let columnsHtml = "";
  if (columns.length > 0) {
    for (const col of columns) {
      let colLinksHtml = "";
      if (col.links && col.links.length > 0) {
        colLinksHtml = `<ul class="flex flex-col gap-2">`;
        for (const link of col.links) {
          colLinksHtml += `<li><a href="${link.href || "#"}" class="text-sm text-gray-400 hover:text-white transition-colors">${link.label || ""}</a></li>`;
        }
        colLinksHtml += `</ul>`;
      }

      columnsHtml += `
        <div class="flex flex-col gap-4">
          ${col.heading ? `<p class="text-sm font-semibold uppercase tracking-wider text-gray-300">${col.heading}</p>` : ""}
          ${col.text ? `<p class="text-sm text-gray-400 leading-relaxed">${col.text}</p>` : ""}
          ${colLinksHtml}
        </div>
      `;
    }
  }

  let footerLinksHtml = "";
  if (footerLinks.length > 0) {
    footerLinksHtml = `<nav><ul class="flex gap-4">`;
    for (const link of footerLinks) {
      footerLinksHtml += `<li><a href="${link.href || "#"}" class="text-sm text-gray-400 hover:text-white transition-colors">${link.label || ""}</a></li>`;
    }
    footerLinksHtml += `</ul></nav>`;
  }

  return `
    <footer class="border-t bg-gray-900 text-white mt-auto">
      ${columns.length > 0 ? `
        <div class="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          ${columnsHtml}
        </div>
      ` : ""}
      ${(copyright || footerLinks.length > 0) ? `
        <div class="border-t border-white/10 ${columns.length > 0 ? "" : "py-4"}">
          <div class="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2">
            ${copyright ? `<p class="text-sm text-gray-400">${copyright}</p>` : ""}
            ${footerLinksHtml}
          </div>
        </div>
      ` : ""}
    </footer>
  `;
}

// Visual Block Renderer
function renderBlock(block: any): string {
  if (!block || !block.type) return "";
  const props = block.props || {};
  const blockId = block.id || "";
  const anchorAttr = block.meta?.anchorId ? `id="${block.meta.anchorId}"` : "";
  
  // Outer margins/paddings from meta spacing if present
  let styleStr = "";
  if (block.meta?.spacing) {
    const sp = block.meta.spacing;
    const rules: string[] = [];
    if (sp.marginTop) rules.push(`margin-top: ${sp.marginTop}`);
    if (sp.marginBottom) rules.push(`margin-bottom: ${sp.marginBottom}`);
    if (sp.marginLeft) rules.push(`margin-left: ${sp.marginLeft}`);
    if (sp.marginRight) rules.push(`margin-right: ${sp.marginRight}`);
    if (sp.paddingTop) rules.push(`padding-top: ${sp.paddingTop}`);
    if (sp.paddingBottom) rules.push(`padding-bottom: ${sp.paddingBottom}`);
    if (sp.paddingLeft) rules.push(`padding-left: ${sp.paddingLeft}`);
    if (sp.paddingRight) rules.push(`padding-right: ${sp.paddingRight}`);
    if (sp.width) rules.push(`width: ${sp.width}`);
    if (sp.maxWidth) rules.push(`max-width: ${sp.maxWidth}`);
    if (rules.length > 0) styleStr = `style="${rules.join("; ")}"`;
  }

  let contentHtml = "";

  switch (block.type) {
    case "hero":
    case "animated-hero": {
      const align = props.align || "center";
      const alignClass = align === "center" ? "items-center text-center" : "items-start text-left";
      const isLight = props.textColor !== "dark";
      const textClass = isLight ? "text-white" : "text-gray-900";
      const subTextClass = isLight ? "text-gray-200" : "text-gray-600";
      
      let bgStyle = "";
      if (props.backgroundType === "color" && props.backgroundColor) {
        bgStyle = `style="background-color: ${props.backgroundColor}"`;
      }
      
      contentHtml = `
        <section ${bgStyle} class="relative w-full py-24 px-4 overflow-hidden">
          ${props.backgroundType === "video" && props.backgroundVideo ? `
            <video class="absolute inset-0 w-full h-full object-cover" src="${props.backgroundVideo}" autoplay muted loop playsinline></video>
          ` : ""}
          ${props.backgroundType === "image" && props.backgroundImage ? `
            <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('${props.backgroundImage}'); opacity: ${(props.backgroundOpacity || 50) / 100}"></div>
          ` : ""}
          <div class="relative max-w-5xl mx-auto flex flex-col gap-6 ${alignClass}">
            ${props.badgeText ? `
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${isLight ? "border-white/30 text-white bg-white/10" : "border-gray-300 text-gray-700 bg-white"}">
                ${props.badgeText}
              </span>
            ` : ""}
            <h1 class="text-4xl md:text-6xl font-bold leading-tight ${textClass}">${props.heading || ""}</h1>
            ${props.subheading ? `<p class="text-xl font-medium ${subTextClass}">${props.subheading}</p>` : ""}
            ${props.description ? `<p class="text-lg max-w-2xl ${subTextClass}">${props.description}</p>` : ""}
            <div class="flex gap-4 flex-wrap ${align === "center" ? "justify-center" : ""}">
              ${renderCtaButton(props.primaryCta)}
              ${renderCtaButton(props.secondaryCta)}
            </div>
          </div>
        </section>
      `;
      break;
    }

    case "cta":
    case "cta-banner": {
      const isLight = props.textColor !== "dark";
      const textClass = isLight ? "text-white" : "text-gray-900";
      const subTextClass = isLight ? "text-blue-100" : "text-gray-600";
      
      let bgStyle = "";
      if (props.backgroundColor) {
        bgStyle = `style="background-color: ${props.backgroundColor}"`;
      } else {
        bgStyle = `style="background-color: var(--palette-primary)"`;
      }

      contentHtml = `
        <section ${bgStyle} class="w-full py-16 px-4">
          <div class="max-w-4xl mx-auto text-center flex flex-col items-center gap-6">
            <h2 class="text-3xl md:text-4xl font-bold tracking-tight ${textClass}">${props.heading || ""}</h2>
            ${props.description ? `<p class="text-lg max-w-2xl ${subTextClass}">${props.description}</p>` : ""}
            <div class="flex gap-4 flex-wrap justify-center mt-2">
              ${renderCtaButton(props.primaryCta || { label: props.buttonText, href: props.buttonHref })}
              ${renderCtaButton(props.secondaryCta)}
            </div>
          </div>
        </section>
      `;
      break;
    }

    case "features":
    case "bento-grid":
    case "card-grid": {
      const items = props.items || [];
      const cols = props.columns || 3;
      let gridClass = "grid grid-cols-1 md:grid-cols-3 gap-8";
      if (cols === 2) gridClass = "grid grid-cols-1 md:grid-cols-2 gap-8";
      if (cols === 4) gridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6";

      let itemsHtml = "";
      for (const item of items) {
        itemsHtml += `
          <div class="flex flex-col items-center text-center p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div class="p-3 bg-blue-50 text-blue-600 rounded-lg mb-4">
              ${renderIcon(item.icon, "size-6")}
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">${item.title || ""}</h3>
            <p class="text-sm text-gray-600 leading-relaxed">${item.description || ""}</p>
          </div>
        `;
      }

      contentHtml = `
        <section class="w-full py-16 px-4 bg-gray-50">
          <div class="max-w-5xl mx-auto">
            ${props.heading ? `
              <div class="text-center max-w-2xl mx-auto mb-12">
                <h2 class="text-3xl font-bold text-gray-900 mb-4">${props.heading}</h2>
                ${props.subheading ? `<p class="text-gray-600">${props.subheading}</p>` : ""}
              </div>
            ` : ""}
            <div class="${gridClass}">${itemsHtml}</div>
          </div>
        </section>
      `;
      break;
    }

    case "bio-cards":
    case "animated-cards": {
      const items = props.items || [];
      let cardsHtml = "";
      for (const member of items) {
        cardsHtml += `
          <div class="flex flex-col items-center bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            ${member.avatar ? `
              <img src="${member.avatar}" alt="${member.name}" class="size-24 rounded-full object-cover mb-4 border-2 border-gray-100" />
            ` : `
              <div class="size-24 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
                <svg class="size-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
            `}
            <h3 class="font-semibold text-gray-900">${member.name || ""}</h3>
            <p class="text-xs text-blue-600 font-medium mb-2">${member.role || ""}</p>
            <p class="text-sm text-gray-600 text-center leading-normal mb-4">${member.bio || ""}</p>
          </div>
        `;
      }

      contentHtml = `
        <section class="w-full py-16 px-4 bg-white">
          <div class="max-w-5xl mx-auto">
            <div class="text-center max-w-2xl mx-auto mb-12">
              <h2 class="text-3xl font-bold text-gray-900 mb-4">${props.heading || "Meet the Team"}</h2>
              ${props.subheading ? `<p class="text-gray-600">${props.subheading}</p>` : ""}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">${cardsHtml}</div>
          </div>
        </section>
      `;
      break;
    }

    case "testimonials": {
      const items = props.items || [];
      let testimonialsHtml = "";
      for (const item of items) {
        testimonialsHtml += `
          <div class="bg-white rounded-xl border border-gray-100 p-8 shadow-sm flex flex-col gap-4">
            <p class="text-gray-600 italic">"${item.quote || ""}"</p>
            <div class="flex items-center gap-3 mt-auto">
              ${item.avatar ? `<img src="${item.avatar}" class="size-10 rounded-full object-cover" />` : ""}
              <div>
                <h4 class="font-semibold text-sm text-gray-900">${item.name || ""}</h4>
                <p class="text-xs text-gray-500">${item.role || ""} at ${item.company || ""}</p>
              </div>
            </div>
          </div>
        `;
      }
      contentHtml = `
        <section class="w-full py-16 px-4 bg-gray-50">
          <div class="max-w-5xl mx-auto">
            <h2 class="text-3xl font-bold text-center text-gray-900 mb-12">${props.heading || "What our customers say"}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">${testimonialsHtml}</div>
          </div>
        </section>
      `;
      break;
    }

    case "faq":
    case "accordion": {
      const items = props.items || [];
      let faqsHtml = "";
      for (const item of items) {
        faqsHtml += `
          <div class="border-b border-gray-100 pb-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">${item.question || ""}</h3>
            <p class="text-sm text-gray-600 leading-relaxed">${item.answer || ""}</p>
          </div>
        `;
      }
      contentHtml = `
        <section class="w-full py-16 px-4 bg-white">
          <div class="max-w-3xl mx-auto">
            <h2 class="text-3xl font-bold text-center text-gray-900 mb-12">${props.heading || "Frequently Asked Questions"}</h2>
            <div class="flex flex-col gap-6">${faqsHtml}</div>
          </div>
        </section>
      `;
      break;
    }

    case "stats":
    case "animated-counter": {
      const items = props.items || [];
      let statsHtml = "";
      for (const item of items) {
        statsHtml += `
          <div class="flex flex-col items-center">
            <span class="text-4xl md:text-5xl font-extrabold text-blue-600">${item.value || "0"}</span>
            <span class="text-sm font-semibold text-gray-900 mt-2">${item.label || ""}</span>
            ${item.description ? `<span class="text-xs text-gray-500 text-center mt-1">${item.description}</span>` : ""}
          </div>
        `;
      }
      contentHtml = `
        <section class="w-full py-12 px-4 bg-white border-y border-gray-100">
          <div class="max-w-5xl mx-auto">
            ${props.heading ? `<h2 class="text-2xl font-bold text-center text-gray-900 mb-8">${props.heading}</h2>` : ""}
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-8">${statsHtml}</div>
          </div>
        </section>
      `;
      break;
    }

    case "logo-cloud":
    case "logo-marquee": {
      const logos = props.logos || [];
      let logosHtml = "";
      for (const logo of logos) {
        logosHtml += `
          <div class="h-12 flex items-center justify-center px-4 bg-gray-50 rounded-lg">
            <span class="text-sm font-bold text-gray-400 tracking-wider uppercase">${logo.name || "Company"}</span>
          </div>
        `;
      }
      contentHtml = `
        <section class="w-full py-12 px-4 bg-white">
          <div class="max-w-5xl mx-auto">
            <div class="text-center mb-8">
              ${props.heading ? `<h3 class="text-sm font-semibold uppercase tracking-wider text-gray-400">${props.heading}</h3>` : ""}
              ${props.subheading ? `<p class="text-xs text-gray-500">${props.subheading}</p>` : ""}
            </div>
            <div class="flex flex-wrap items-center justify-center gap-6">${logosHtml}</div>
          </div>
        </section>
      `;
      break;
    }

    case "text":
    case "animated-text": {
      const align = props.align || "left";
      const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
      contentHtml = `
        <div class="w-full px-4">
          <div class="max-w-3xl mx-auto prose prose-neutral max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 ${alignClass}">
            ${props.content || props.text || ""}
          </div>
        </div>
      `;
      break;
    }

    case "image": {
      const widthClass = props.width === "contained" ? "max-w-4xl mx-auto" : "w-full";
      contentHtml = `
        <div class="w-full px-4 my-8">
          <div class="${widthClass} flex flex-col items-center">
            ${props.src ? `<img src="${props.src}" alt="${props.alt || ""}" class="rounded-xl shadow-sm object-cover max-h-[500px]" />` : ""}
            ${props.caption ? `<p class="text-xs text-gray-500 mt-2">${props.caption}</p>` : ""}
          </div>
        </div>
      `;
      break;
    }

    case "spacer": {
      contentHtml = `<div style="height: ${props.height || 32}px" class="w-full"></div>`;
      break;
    }

    case "heading": {
      const level = props.level || "h2";
      const align = props.align || "left";
      const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
      const sizeClasses = {
        h1: "text-5xl md:text-6xl",
        h2: "text-4xl md:text-5xl",
        h3: "text-3xl md:text-4xl",
        h4: "text-2xl md:text-3xl",
        h5: "text-xl md:text-2xl",
        h6: "text-lg md:text-xl",
      };
      const activeSize = (sizeClasses as any)[level] || sizeClasses.h2;
      const colorStyle = props.color ? `style="color: ${props.color}"` : "";

      contentHtml = `
        <div class="w-full px-4 py-4">
          <div class="max-w-5xl mx-auto">
            <${level} class="font-bold leading-tight ${activeSize} ${alignClass}" ${colorStyle}>
              ${props.text || ""}
            </${level}>
          </div>
        </div>
      `;
      break;
    }

    case "divider": {
      const styles = {
        solid: "border-solid",
        dashed: "border-dashed",
        dotted: "border-dotted",
        none: "border-none",
      };
      const activeStyle = (styles as any)[props.style] || styles.solid;
      const colStyle = props.color ? `border-color: ${props.color}` : "";
      
      contentHtml = `
        <div style="padding-top: ${props.paddingY || 16}px; padding-bottom: ${props.paddingY || 16}px" class="w-full px-4">
          <hr class="w-full border-t ${activeStyle}" style="${colStyle}" />
        </div>
      `;
      break;
    }

    case "button": {
      const align = props.align || "center";
      const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : align === "full" ? "w-full" : "text-left";
      contentHtml = `
        <div class="w-full px-4 py-2 ${alignClass}">
          ${renderCtaButton(props, align === "full" ? "w-full" : "")}
        </div>
      `;
      break;
    }

    case "social-buttons": {
      const items = props.items || [];
      const align = props.align || "center";
      const alignClass = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";
      const showOnlyLogos = !!props.showOnlyLogos;
      
      let buttonsHtml = "";
      for (const item of items) {
        const ctaStyle = props.buttonStyle || "solid";
        const ctaSize = props.size || "md";
        const buttonObj = {
          label: showOnlyLogos ? "" : item.label,
          href: item.href,
          variant: ctaStyle,
          size: ctaSize,
          borderRadius: "md",
          icon: item.icon,
          emoji: item.emoji,
          color: item.color,
        };
        buttonsHtml += renderCtaButton(buttonObj, "m-1");
      }

      contentHtml = `
        <div class="w-full px-4 py-4">
          <div class="flex flex-wrap items-center ${alignClass}">${buttonsHtml}</div>
        </div>
      `;
      break;
    }

    case "newsletter": {
      const isLight = props.textColor !== "dark";
      const textClass = isLight ? "text-white" : "text-gray-900";
      const subTextClass = isLight ? "text-blue-100" : "text-gray-600";
      const align = props.align || "center";
      const alignClass = align === "center" ? "text-center items-center" : "text-left items-start";
      
      let bgStyle = "";
      if (props.backgroundColor) {
        bgStyle = `style="background-color: ${props.backgroundColor}"`;
      } else {
        bgStyle = `style="background-color: var(--palette-primary)"`;
      }

      contentHtml = `
        <section ${bgStyle} class="w-full py-16 px-4">
          <div class="max-w-4xl mx-auto flex flex-col ${alignClass} gap-6">
            <h2 class="text-3xl font-bold tracking-tight ${textClass}">${props.heading || "Subscribe to our Newsletter"}</h2>
            ${props.description ? `<p class="text-lg max-w-2xl ${subTextClass}">${props.description}</p>` : ""}
            <form class="flex w-full flex-col sm:flex-row max-w-md gap-2 mt-2">
              <input type="email" required placeholder="${props.placeholder || "Enter your email"}" class="px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus-visible:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 flex-1" />
              <button type="submit" class="px-5 py-2.5 rounded-lg text-sm bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors">${props.buttonLabel || "Subscribe"}</button>
            </form>
          </div>
        </section>
      `;
      break;
    }

    case "contact": {
      const showForm = props.showForm !== false;
      let bgStyle = "";
      if (props.backgroundColor) {
        bgStyle = `style="background-color: ${props.backgroundColor}"`;
      }
      
      contentHtml = `
        <section ${bgStyle} class="w-full py-16 px-4 bg-white">
          <div class="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 class="text-3xl font-bold text-gray-900 mb-4">${props.heading || "Contact Us"}</h2>
              ${props.subheading ? `<p class="text-gray-600 mb-8">${props.subheading}</p>` : ""}
              
              <div class="flex flex-col gap-6">
                ${props.email ? `
                  <div class="flex items-start gap-3">
                    <span class="p-2 bg-blue-50 text-blue-600 rounded-lg">${renderIcon("mail", "size-5")}</span>
                    <div>
                      <h4 class="font-medium text-sm text-gray-900">Email</h4>
                      <a href="mailto:${props.email}" class="text-sm text-gray-500 hover:text-blue-600">${props.email}</a>
                    </div>
                  </div>
                ` : ""}
                ${props.phone ? `
                  <div class="flex items-start gap-3">
                    <span class="p-2 bg-blue-50 text-blue-600 rounded-lg">${renderIcon("phone", "size-5")}</span>
                    <div>
                      <h4 class="font-medium text-sm text-gray-900">Phone</h4>
                      <a href="tel:${props.phone}" class="text-sm text-gray-500 hover:text-blue-600">${props.phone}</a>
                    </div>
                  </div>
                ` : ""}
                ${props.address ? `
                  <div class="flex items-start gap-3">
                    <span class="p-2 bg-blue-50 text-blue-600 rounded-lg">${renderIcon("globe", "size-5")}</span>
                    <div>
                      <h4 class="font-medium text-sm text-gray-900">Address</h4>
                      <span class="text-sm text-gray-500">${props.address}</span>
                    </div>
                  </div>
                ` : ""}
              </div>
            </div>

            ${showForm ? `
              <div class="bg-gray-50 rounded-2xl p-8 border border-gray-100 shadow-sm">
                <form class="flex flex-col gap-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                      <label class="text-xs font-semibold text-gray-700">First Name</label>
                      <input type="text" required class="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="text-xs font-semibold text-gray-700">Last Name</label>
                      <input type="text" required class="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    </div>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-semibold text-gray-700">Email Address</label>
                    <input type="email" required class="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-semibold text-gray-700">Message</label>
                    <textarea rows="4" required class="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"></textarea>
                  </div>
                  <button type="submit" class="w-full py-2.5 rounded-lg text-sm bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors mt-2">${props.submitLabel || "Send Message"}</button>
                </form>
              </div>
            ` : ""}
          </div>
        </section>
      `;
      break;
    }

    case "columns": {
      const columns = props.columns || [];
      const gapStyle = props.gap === "lg" ? "gap-12" : props.gap === "sm" ? "gap-4" : "gap-8";
      let colsHtml = "";
      
      for (const col of columns) {
        let colBlocksHtml = "";
        if (col.blocks && col.blocks.length > 0) {
          for (const nestedBlock of col.blocks) {
            colBlocksHtml += renderBlock(nestedBlock);
          }
        }
        colsHtml += `<div class="flex-1 min-w-[250px]">${colBlocksHtml}</div>`;
      }

      contentHtml = `
        <div class="w-full px-4 py-8" style="background-color: ${props.bgColor || "transparent"}">
          <div class="max-w-7xl mx-auto flex flex-wrap ${gapStyle}">${colsHtml}</div>
        </div>
      `;
      break;
    }

    case "row": {
      const columns = props.columns || [];
      const gapStyle = props.gap === "lg" ? "gap-12" : props.gap === "sm" ? "gap-4" : props.gap === "none" ? "gap-0" : "gap-8";
      let colsHtml = "";
      
      for (const col of columns) {
        let colBlocksHtml = "";
        if (col.blocks && col.blocks.length > 0) {
          for (const nestedBlock of col.blocks) {
            colBlocksHtml += renderBlock(nestedBlock);
          }
        }
        const colBg = col.bgColor ? `style="background-color: ${col.bgColor}"` : "";
        colsHtml += `<div class="flex-1" ${colBg}>${colBlocksHtml}</div>`;
      }

      contentHtml = `
        <div class="w-full px-4 py-8" style="background-color: ${props.backgroundColor || "transparent"}">
          <div class="max-w-7xl mx-auto flex flex-wrap ${gapStyle}">${colsHtml}</div>
        </div>
      `;
      break;
    }

    case "card": {
      const borderClass = props.borderColor ? `border border-[${props.borderColor}]` : "border border-gray-100";
      const paddingClass = props.padding === "lg" ? "p-8" : props.padding === "sm" ? "p-4" : "p-6";
      let cardBlocksHtml = "";
      if (props.blocks && props.blocks.length > 0) {
        for (const nestedBlock of props.blocks) {
          cardBlocksHtml += renderBlock(nestedBlock);
        }
      }

      contentHtml = `
        <div class="w-full px-4 py-4">
          <div class="max-w-3xl mx-auto rounded-xl bg-white shadow-sm overflow-hidden ${borderClass} ${paddingClass}">
            ${props.image ? `<img src="${props.image}" class="w-full h-48 object-cover rounded-lg mb-6" />` : ""}
            ${props.title ? `<h3 class="text-xl font-bold text-gray-900 mb-1">${props.title}</h3>` : ""}
            ${props.subtitle ? `<p class="text-sm text-gray-500 mb-6">${props.subtitle}</p>` : ""}
            <div class="flex flex-col gap-4">${cardBlocksHtml}</div>
          </div>
        </div>
      `;
      break;
    }

    case "alert": {
      const type = props.type || "info";
      const colors = {
        info: "bg-blue-50 border-blue-200 text-blue-800",
        warning: "bg-amber-50 border-amber-200 text-amber-800",
        success: "bg-green-50 border-green-200 text-green-800",
        error: "bg-red-50 border-red-200 text-red-800",
      };
      const activeColor = (colors as any)[type] || colors.info;
      let alertBlocksHtml = "";
      if (props.blocks && props.blocks.length > 0) {
        for (const nestedBlock of props.blocks) {
          alertBlocksHtml += renderBlock(nestedBlock);
        }
      }

      contentHtml = `
        <div class="w-full px-4 py-2">
          <div class="max-w-3xl mx-auto rounded-lg border p-4 flex gap-3 ${activeColor}">
            ${props.icon !== false ? `
              <div class="shrink-0 mt-0.5">
                ${renderIcon(type === "error" ? "shield" : type === "success" ? "check" : type === "warning" ? "sparkles" : "globe", "size-5")}
              </div>
            ` : ""}
            <div>
              ${props.title ? `<h4 class="font-bold text-sm mb-1">${props.title}</h4>` : ""}
              <div class="text-sm leading-relaxed">${alertBlocksHtml}</div>
            </div>
          </div>
        </div>
      `;
      break;
    }

    default:
      // Fallback for simple blocks or unhandled animation blocks
      if (props.heading || props.text) {
        contentHtml = `
          <div class="w-full px-4 py-8 text-center">
            <h2 class="text-3xl font-bold text-gray-900 mb-4">${props.heading || ""}</h2>
            <p class="text-gray-600">${props.text || props.description || ""}</p>
          </div>
        `;
      }
      break;
  }

  return `
    <div ${anchorAttr} class="w-full block-wrapper" ${styleStr}>
      ${contentHtml}
    </div>
  `;
}

// Global Document Wrapper Template
function assembleHtml(
  indexTemplate: string,
  renderedStaticHTML: string,
  pageTitle: string,
  seoConfig: any,
  pageData: any,
  settingsData: any,
  palette: any,
  extraGlobalData: Record<string, any> = {}
): string {
  // Pre-generate dynamic style injection
  const paletteCSS = paletteToCSS(palette);
  
  // SEO tags
  const defaultTitle = settingsData?.seoConfig?.siteName || settingsData?.seoConfig?.siteTitle || "OpenWeb";
  const finalTitle = pageTitle ? `${pageTitle} | ${defaultTitle}` : defaultTitle;
  
  const desc = seoConfig.seoDescription || settingsData?.seoConfig?.defaultDescription || "";
  const keywords = seoConfig.seoKeywords || settingsData?.seoConfig?.defaultKeywords || "";
  const ogImg = seoConfig.ogImage || "";

  let headerTags = `
    <title>${finalTitle}</title>
    <style>${paletteCSS}</style>
  `;

  if (desc) headerTags += `<meta name="description" content="${desc}" />\n`;
  if (keywords) headerTags += `<meta name="keywords" content="${keywords}" />\n`;
  if (ogImg) {
    headerTags += `
      <meta property="og:title" content="${finalTitle}" />
      <meta property="og:description" content="${desc}" />
      <meta property="og:image" content="${ogImg}" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content="${ogImg}" />
    `;
  }

  if (seoConfig.noIndex) {
    headerTags += `<meta name="robots" content="noindex, nofollow" />\n`;
  }

  // Site verifications
  const globalSeo = settingsData?.seoConfig || {};
  if (globalSeo.googleVerification) headerTags += `<meta name="google-site-verification" content="${globalSeo.googleVerification}" />\n`;
  if (globalSeo.bingVerification) headerTags += `<meta name="msvalidate.01" content="${globalSeo.bingVerification}" />\n`;
  if (globalSeo.yandexVerification) headerTags += `<meta name="yandex-verification" content="${globalSeo.yandexVerification}" />\n`;

  // Structured LD+JSON
  if (globalSeo.siteName || globalSeo.siteUrl) {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": globalSeo.businessType || "WebSite",
      "name": globalSeo.businessName || globalSeo.siteName,
      "url": globalSeo.siteUrl,
      "description": globalSeo.businessDescription || globalSeo.defaultDescription,
    };
    headerTags += `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n`;
  }

  // Inject Google Analytics snippet
  if (globalSeo.googleAnalyticsId) {
    headerTags += `
      <script async src="https://www.googletagmanager.com/gtag/js?id=${globalSeo.googleAnalyticsId}"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${globalSeo.googleAnalyticsId}');
      </script>
    `;
  }

  // Inject initial state variables for hydrating Vite client SPA
  let bodyStateScripts = `
    <script>
      window.__INITIAL_PAGE_DATA__ = ${JSON.stringify(pageData)};
      window.__INITIAL_SITE_SETTINGS__ = ${JSON.stringify(settingsData)};
  `;

  for (const [k, v] of Object.entries(extraGlobalData)) {
    bodyStateScripts += `window.${k} = ${JSON.stringify(v)};\n`;
  }
  bodyStateScripts += `</script>`;

  // Modify indexTemplate
  let html = indexTemplate;

  // Replace <title> tag if exists, otherwise prepend to head
  if (html.includes("<title>")) {
    html = html.replace(/<title>[^<]*<\/title>/i, "");
  }
  
  html = html.replace("</head>", `${headerTags}</head>`);
  
  // Inject server-rendered static DOM into React's root mount node
  const rootMountToken = '<div id="root"></div>';
  const hydratedMountToken = `<div id="root">${renderedStaticHTML}</div>${bodyStateScripts}`;
  
  if (html.includes(rootMountToken)) {
    html = html.replace(rootMountToken, hydratedMountToken);
  } else {
    html = html.replace("</body>", `${hydratedMountToken}</body>`);
  }

  // Inject preloader right after <body> tag
  const preloaderHtml = `
<div id="openweb-preloader" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: var(--palette-background, #0b0f19); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 999999; transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.4s cubic-bezier(0.4, 0, 0.2, 1);">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 1.5rem;">
    <div style="position: relative; width: 64px; height: 64px;">
      <div style="box-sizing: border-box; display: block; position: absolute; width: 64px; height: 64px; border: 4px solid transparent; border-radius: 50%; border-top-color: var(--palette-primary, #6366f1); animation: openweb-spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;"></div>
      <div style="box-sizing: border-box; display: block; position: absolute; width: 64px; height: 64px; border: 4px solid transparent; border-radius: 50%; border-top-color: var(--palette-accent, #f59e0b); animation: openweb-spin-reverse 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite; animation-delay: -0.6s;"></div>
    </div>
    <div style="color: var(--palette-text, #f8fafc); font-family: system-ui, -apple-system, sans-serif; font-size: 0.875rem; letter-spacing: 0.15em; font-weight: 600; text-transform: uppercase; animation: openweb-pulse 1.8s ease-in-out infinite;">Loading</div>
  </div>
</div>
<style>
@keyframes openweb-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes openweb-spin-reverse {
  0% { transform: rotate(360deg); }
  100% { transform: rotate(0deg); }
}
@keyframes openweb-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
</style>
<script>
(function() {
  function fadeOutPreloader() {
    const preloader = document.getElementById('openweb-preloader');
    if (preloader) {
      preloader.style.opacity = '0';
      preloader.style.visibility = 'hidden';
      setTimeout(function() {
        preloader.remove();
      }, 400);
    }
  }
  if (document.readyState === 'complete') {
    fadeOutPreloader();
  } else {
    window.addEventListener('load', fadeOutPreloader);
    setTimeout(fadeOutPreloader, 3000);
  }
})();
</script>
  `;

  if (html.includes("<body>")) {
    html = html.replace("<body>", `<body>${preloaderHtml}`);
  } else {
    html = html.replace(/<body([^>]*)>/i, `<body$1>${preloaderHtml}`);
  }

  return html;
}

// ── RENDER ROOT CHANNELS ──────────────────────────────────────────────────────

// Render custom page HTML
export function renderPageHtml(page: Page, settings: SiteSettings, indexTemplate: string, currentPath: string = "/"): string {
  const contentStr = page.content || "[]";
  let blocks: any[] = [];
  try {
    blocks = JSON.parse(contentStr);
  } catch (e) {}

  let blocksHtml = "";
  for (const block of blocks) {
    blocksHtml += renderBlock(block);
  }

  const nav = settings.navConfig ? JSON.parse(settings.navConfig) : {};
  const footer = settings.footerConfig ? JSON.parse(settings.footerConfig) : {};
  const palette = nav.palette || {};

  let layoutHtml = "";
  if (page.ignoreGlobalLayout) {
    layoutHtml = `
      <div class="min-h-screen flex flex-col">
        <main class="flex-1">${blocksHtml}</main>
      </div>
    `;
  } else {
    layoutHtml = `
      <div class="min-h-screen flex flex-col">
        ${renderHeader(nav, currentPath)}
        <main class="flex-1">${blocksHtml}</main>
        ${renderFooter(footer)}
      </div>
    `;
  }

  const seo = {
    seoDescription: page.seoDescription,
    seoKeywords: page.seoKeywords,
    ogImage: page.ogImage,
    noIndex: page.noIndex,
    canonicalUrl: page.canonicalUrl,
  };

  return assembleHtml(
    indexTemplate,
    layoutHtml,
    page.seoTitle || page.title,
    seo,
    page,
    settings,
    palette
  );
}

// Render Blog List HTML
export function renderBlogListHtml(posts: BlogPost[], settings: SiteSettings, indexTemplate: string, currentPath: string = "/blog"): string {
  const nav = settings.navConfig ? JSON.parse(settings.navConfig) : {};
  const footer = settings.footerConfig ? JSON.parse(settings.footerConfig) : {};
  const palette = nav.palette || {};

  let postsListHtml = "";
  for (const post of posts) {
    const postDate = post.datePublished 
      ? new Date(post.datePublished).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "";
      
    postsListHtml += `
      <article class="flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        ${post.headerImage ? `
          <a href="/blog/${post.slug}" class="block h-48 overflow-hidden">
            <img src="${post.headerImage}" alt="${post.title}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
          </a>
        ` : ""}
        <div class="p-6 flex flex-col flex-grow">
          ${postDate ? `<span class="text-xs font-medium text-blue-600 mb-2">${postDate}</span>` : ""}
          <h3 class="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
            <a href="/blog/${post.slug}">${post.title}</a>
          </h3>
          ${post.description ? `<p class="text-sm text-gray-500 line-clamp-3 mb-4 leading-relaxed">${post.description}</p>` : ""}
          <a href="/blog/${post.slug}" class="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-auto">
            Read article
            <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
          </a>
        </div>
      </article>
    `;
  }

  const layoutHtml = `
    <div class="min-h-screen flex flex-col">
      ${renderHeader(nav, currentPath)}
      <main class="flex-1 py-16 px-4 bg-gray-50/50">
        <div class="max-w-5xl mx-auto">
          <div class="text-center max-w-2xl mx-auto mb-16">
            <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Latest Insights</h1>
            <p class="text-lg text-gray-500">Guides, updates, and deep dives from our team.</p>
          </div>
          ${posts.length === 0 ? `
            <div class="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
              <p class="text-gray-400">No published articles found.</p>
            </div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">${postsListHtml}</div>
          `}
        </div>
      </main>
      ${renderFooter(footer)}
    </div>
  `;

  return assembleHtml(
    indexTemplate,
    layoutHtml,
    "Blog",
    {},
    null,
    settings,
    palette,
    { "__INITIAL_BLOG_POSTS__": posts }
  );
}

// Render Blog Post Detail HTML
export function renderBlogPostHtml(post: BlogPost, settings: SiteSettings, indexTemplate: string, currentPath: string = "/blog"): string {
  const nav = settings.navConfig ? JSON.parse(settings.navConfig) : {};
  const footer = settings.footerConfig ? JSON.parse(settings.footerConfig) : {};
  const palette = nav.palette || {};

  const postDate = post.datePublished 
    ? new Date(post.datePublished).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  const layoutHtml = `
    <div class="min-h-screen flex flex-col">
      ${renderHeader(nav, currentPath)}
      <main class="flex-1 py-12 md:py-20 px-4 bg-white">
        <article class="max-w-3xl mx-auto">
          <header class="mb-10 text-center">
            <a href="/blog" class="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-6 transition-colors">
              <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
              Back to blog
            </a>
            ${postDate ? `<span class="text-sm font-medium text-gray-500 block mb-3">${postDate}</span>` : ""}
            <h1 class="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">${post.title}</h1>
            ${post.description ? `<p class="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">${post.description}</p>` : ""}
          </header>

          ${post.headerImage ? `
            <div class="mb-10 rounded-xl overflow-hidden shadow-sm max-h-[480px]">
              <img src="${post.headerImage}" alt="${post.title}" class="w-full h-full object-cover" />
            </div>
          ` : ""}

          <div class="prose prose-neutral max-w-none md:prose-lg leading-relaxed">
            ${post.content || ""}
          </div>
        </article>
      </main>
      ${renderFooter(footer)}
    </div>
  `;

  const seo = {
    seoDescription: post.description,
    ogImage: post.headerImage,
  };

  return assembleHtml(
    indexTemplate,
    layoutHtml,
    post.title,
    seo,
    null,
    settings,
    palette,
    { "__INITIAL_BLOG_POST__": post }
  );
}
