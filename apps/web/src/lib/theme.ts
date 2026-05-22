// Opt-in dark mode. Dark is applied via the `dark` class on <html>; `dark:`
// utilities are wired to that class (see index.css @custom-variant). The OS
// `prefers-color-scheme` is never consulted — the site is light by default.

const STORAGE_KEY = "openweb_theme";

export type Theme = "light" | "dark";
export type PageTheme = "auto" | "light" | "dark";

/** The visitor's explicit choice, if they've used the toggle. */
export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

export function isDark(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

function applyClass(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Visitor explicitly picked a theme — persists and overrides page defaults everywhere. */
export function setTheme(theme: Theme) {
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  applyClass(theme);
  window.dispatchEvent(new Event("openweb-theme"));
}

export function toggleTheme() {
  setTheme(isDark() ? "light" : "dark");
}

/**
 * Resolve and apply the effective theme. Precedence:
 * visitor's saved choice → the page's theme (when not "auto") → the site
 * default → light.
 */
export function applyPageTheme(
  pageTheme: PageTheme | null | undefined,
  siteDefault: Theme | null | undefined,
) {
  if (typeof document === "undefined") return;
  const stored = getStoredTheme();
  let effective: Theme;
  if (stored) effective = stored;
  else if (pageTheme === "dark" || pageTheme === "light") effective = pageTheme;
  else effective = siteDefault === "dark" ? "dark" : "light";
  applyClass(effective);
}
