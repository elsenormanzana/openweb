// Theme resolution for the public site.
//
// The site is "designed" for one mode — light or dark — and that is ALWAYS the
// base. The visitor's OS `prefers-color-scheme` is consulted in exactly one
// situation: the owner shows the dark/light toggle AND opts the toggle's
// initial state into "follow device". With the toggle hidden, the designed
// theme is forced and neither the device nor any stored choice can change it.
//
// Dark is applied via the `dark` class on <html>; `dark:` utilities are wired
// to that class (see index.css @custom-variant).

const STORAGE_KEY = "openweb_theme";

export type Theme = "light" | "dark";
export type PageTheme = "auto" | "light" | "dark";
export type ToggleMode = "hidden" | "nav" | "actions";
export type ToggleInitial = "site" | "device";

/** The dark-mode behavior a site is configured with (subset of NavConfig). */
export type ThemeBehavior = {
  defaultTheme?: Theme | null;
  themeToggle?: ToggleMode | null;
  toggleInitial?: ToggleInitial | null;
};

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

/** True when the OS reports a dark color-scheme preference. */
function osPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/** Visitor explicitly picked a theme — persists and overrides defaults. */
export function setTheme(theme: Theme) {
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  applyClass(theme);
  window.dispatchEvent(new Event("openweb-theme"));
}

export function toggleTheme() {
  setTheme(isDark() ? "light" : "dark");
}

/**
 * Resolve and apply the effective theme for a public page.
 *
 * Toggle hidden  → the designed theme (page override → site default) is forced.
 *                  Device preference and any stored choice are ignored.
 * Toggle shown   → visitor's stored choice wins; otherwise the initial state is
 *                  the device preference (only if the owner chose "device") or
 *                  the designed theme.
 */
export function applyPageTheme(
  pageTheme: PageTheme | null | undefined,
  behavior: ThemeBehavior | null | undefined,
) {
  if (typeof document === "undefined") return;

  const siteDefault: Theme = behavior?.defaultTheme === "dark" ? "dark" : "light";
  const designed: Theme =
    pageTheme === "dark" || pageTheme === "light" ? pageTheme : siteDefault;
  const toggleShown = (behavior?.themeToggle ?? "nav") !== "hidden";

  let effective: Theme;
  if (!toggleShown) {
    effective = designed;
  } else {
    const stored = getStoredTheme();
    if (stored) effective = stored;
    else if (behavior?.toggleInitial === "device") effective = osPrefersDark() ? "dark" : "light";
    else effective = designed;
  }
  applyClass(effective);
}
