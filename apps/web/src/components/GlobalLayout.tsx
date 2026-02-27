import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type SiteSettings, type NavMenuItem } from "@/lib/api";
import { NavbarMinimal, NavbarElevated, HeaderSaasCta, HeaderSaasEmail } from "@/components/NavbarVariants";
import { paletteToCSS, DEFAULT_PALETTE } from "@/lib/palette";

// ── Structured data builder ───────────────────────────────────────────────────

function buildJsonLd(settings: SiteSettings): object | null {
  const seo = settings.seoConfig ?? {};
  const type = seo.businessType ?? "WebSite";
  const name = seo.businessName || seo.siteName;
  if (!name) return null;

  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": type,
    name,
    url: seo.siteUrl,
    description: seo.businessDescription || seo.defaultDescription,
  };

  if (seo.businessLogo) {
    base.logo = { "@type": "ImageObject", url: seo.businessLogo };
  }

  if ((seo.socialProfiles ?? []).length > 0) {
    base.sameAs = (seo.socialProfiles ?? []).map((p) => p.url).filter(Boolean);
  }

  if (type === "LocalBusiness" || type === "Organization") {
    if (seo.businessPhone) base.telephone = seo.businessPhone;
    if (seo.businessEmail) base.email = seo.businessEmail;
    if (seo.businessStreet || seo.businessCity) {
      base.address = {
        "@type": "PostalAddress",
        streetAddress: seo.businessStreet,
        addressLocality: seo.businessCity,
        addressRegion: seo.businessState,
        postalCode: seo.businessZip,
        addressCountry: seo.businessCountry,
      };
    }
  }

  return base;
}

// ── GlobalLayout ──────────────────────────────────────────────────────────────

export function GlobalLayout({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    api.siteSettings.get().then(setSettings).catch(() => {});
  }, []);

  // Inject enabled client plugins
  useEffect(() => {
    let scripts: HTMLScriptElement[] = [];
    api.plugins.list().then((list) => {
      scripts = list
        .filter((p) => p.enabled && p.hasClient)
        .map((p) => {
          const el = document.createElement("script");
          el.src = `/api/plugins/${p.slug}/client.js`;
          el.async = true;
          document.head.appendChild(el);
          return el;
        });
    }).catch(() => {});
    return () => { scripts.forEach((s) => s.remove()); };
  }, []);

  const nav = settings?.navConfig ?? {};
  const footer = settings?.footerConfig ?? {};
  const seo = settings?.seoConfig ?? {};

  const normalizeNavLinks = (items: unknown): NavMenuItem[] => {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      if (!item || typeof item !== "object") return { label: "", href: "#" };
      const raw = item as Record<string, unknown>;
      const label = typeof raw.label === "string" ? raw.label : "";
      const href = typeof raw.href === "string" ? raw.href : undefined;
      const dropdown = Array.isArray(raw.dropdown)
        ? raw.dropdown.map((group) => {
            const g = group && typeof group === "object" ? (group as Record<string, unknown>) : {};
            const links = Array.isArray(g.links)
              ? g.links.map((entry) => {
                  const e = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
                  const children = Array.isArray(e.children)
                    ? e.children.map((child) => {
                        const c = child && typeof child === "object" ? (child as Record<string, unknown>) : {};
                        return {
                          label: typeof c.label === "string" ? c.label : "",
                          href: typeof c.href === "string" ? c.href : "#",
                        };
                      })
                    : [];
                  return {
                    label: typeof e.label === "string" ? e.label : "",
                    href: typeof e.href === "string" ? e.href : "#",
                    title: typeof e.title === "string" ? e.title : undefined,
                    children,
                  };
                })
              : [];
            return {
              title: typeof g.title === "string" ? g.title : "",
              links,
            };
          })
        : undefined;
      return { label, href, dropdown };
    });
  };

  const logoText = nav.logoText ?? "Logo";
  const logoImage = nav.logoImage ?? "";
  const logoHref = nav.logoHref ?? "/";
  const navLinks = normalizeNavLinks(nav.navLinks);
  const navVariant = nav.navVariant ?? "minimal";

  const sharedProps = {
    logoText,
    logoImage,
    logoHref,
    navLinks,
    ctaPrimaryText: nav.ctaPrimaryText,
    ctaPrimaryHref: nav.ctaPrimaryHref,
    ctaSecondaryText: nav.ctaSecondaryText,
    ctaSecondaryHref: nav.ctaSecondaryHref,
    heroBadge: nav.heroBadge,
    heroHeadline: nav.heroHeadline,
    heroDescription: nav.heroDescription,
    headerStyle: nav.headerStyle ?? "solid",
    headerBg: nav.headerBg ?? "#ffffff",
    headerTextColor: nav.headerTextColor ?? "#000000",
  };

  const copyright = footer.copyright ?? "";
  const footerLinks = footer.links ?? [];
  const columns = footer.columns ?? [];
  const hasFooter = copyright || footerLinks.length > 0 || columns.length > 0;

  const NavHeader = () => {
    if (navVariant === "elevated") return <NavbarElevated {...sharedProps} />;
    if (navVariant === "saas-cta") return <HeaderSaasCta {...sharedProps} />;
    if (navVariant === "saas-email") return <HeaderSaasEmail {...sharedProps} />;
    return <NavbarMinimal {...sharedProps} />;
  };

  const palette = { ...DEFAULT_PALETTE, ...(nav.palette ?? {}) };

  // Build JSON-LD
  const jsonLd = settings ? buildJsonLd(settings) : null;

  // Verification meta & GA snippet
  const verificationMeta = [
    seo.googleVerification && `<meta name="google-site-verification" content="${seo.googleVerification}" />`,
    seo.bingVerification && `<meta name="msvalidate.01" content="${seo.bingVerification}" />`,
    seo.yandexVerification && `<meta name="yandex-verification" content="${seo.yandexVerification}" />`,
  ].filter(Boolean).join("\n");

  useEffect(() => {
    if (!settings) return;
    const created: Element[] = [];
    const existingFavicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    const previousFaviconHref = existingFavicon?.getAttribute("href") ?? null;
    let injectedFavicon: HTMLLinkElement | null = null;

    // Verification tags
    const verifications: Array<[string, string]> = [
      ["google-site-verification", seo.googleVerification ?? ""],
      ["msvalidate.01", seo.bingVerification ?? ""],
      ["yandex-verification", seo.yandexVerification ?? ""],
    ];
    for (const [name, content] of verifications) {
      if (!content) continue;
      const el = document.createElement("meta");
      el.setAttribute("name", name);
      el.setAttribute("content", content);
      document.head.appendChild(el);
      created.push(el);
    }

    // JSON-LD structured data
    let ldScript: HTMLScriptElement | null = null;
    if (jsonLd) {
      ldScript = document.createElement("script");
      ldScript.type = "application/ld+json";
      ldScript.text = JSON.stringify(jsonLd);
      document.head.appendChild(ldScript);
    }

    // Google Analytics 4
    let gaScript1: HTMLScriptElement | null = null;
    let gaScript2: HTMLScriptElement | null = null;
    if (seo.googleAnalyticsId) {
      gaScript1 = document.createElement("script");
      gaScript1.src = `https://www.googletagmanager.com/gtag/js?id=${seo.googleAnalyticsId}`;
      gaScript1.async = true;
      document.head.appendChild(gaScript1);

      gaScript2 = document.createElement("script");
      gaScript2.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${seo.googleAnalyticsId}');`;
      document.head.appendChild(gaScript2);
    }

    // Favicon from layout logo image
    if (logoImage) {
      if (existingFavicon) {
        existingFavicon.setAttribute("href", logoImage);
      } else {
        injectedFavicon = document.createElement("link");
        injectedFavicon.setAttribute("rel", "icon");
        injectedFavicon.setAttribute("href", logoImage);
        document.head.appendChild(injectedFavicon);
      }
    }

    return () => {
      created.forEach((el) => el.remove());
      ldScript?.remove();
      gaScript1?.remove();
      gaScript2?.remove();
      if (logoImage && existingFavicon) {
        if (previousFaviconHref !== null) existingFavicon.setAttribute("href", previousFaviconHref);
        else existingFavicon.removeAttribute("href");
      }
      injectedFavicon?.remove();
    };
  }, [settings, seo.googleAnalyticsId, seo.googleVerification, seo.bingVerification, seo.yandexVerification, jsonLd, logoImage]);

  void verificationMeta; // used above in effect

  return (
    <div className="min-h-screen flex flex-col">
      <style>{paletteToCSS(palette)}</style>
      <NavHeader />

      <main className="flex-1">
        {children}
      </main>

      {hasFooter && (
        <footer className="border-t bg-gray-900 text-white">
          {columns.length > 0 && (
            <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {columns.map((col, i) => (
                <div key={i} className="flex flex-col gap-4">
                  {col.heading && <p className="text-sm font-semibold uppercase tracking-wider text-gray-300">{col.heading}</p>}
                  {col.text && <p className="text-sm text-gray-400 leading-relaxed">{col.text}</p>}
                  {col.links.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {col.links.map((link, li) => (
                        <li key={li}>
                          <Link to={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
          {(copyright || footerLinks.length > 0) && (
            <div className={`border-t border-white/10 ${columns.length > 0 ? "" : "py-4"}`}>
              <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2">
                {copyright && <p className="text-sm text-gray-400">{copyright}</p>}
                {footerLinks.length > 0 && (
                  <nav>
                    <ul className="flex gap-4">
                      {footerLinks.map((link, i) => (
                        <li key={i}>
                          <Link to={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
              </div>
            </div>
          )}
        </footer>
      )}
    </div>
  );
}
