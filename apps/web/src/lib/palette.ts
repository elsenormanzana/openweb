import { createContext, useContext } from "react";

export type ColorPalette = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
};

/** A site's dark-mode brand colors. Same shape as the light palette. */
export type DarkColorPalette = ColorPalette;

export const DEFAULT_PALETTE: ColorPalette = {
  primary: "#2563eb",
  secondary: "#0f172a",
  accent: "#f59e0b",
  background: "#ffffff",
  surface: "#f8fafc",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
};

/** Apple-graphite default dark palette. Used until a site sets its own. */
export const DEFAULT_DARK_PALETTE: DarkColorPalette = {
  primary: "#4493f8",
  secondary: "#e6edf3",
  accent: "#fbbf24",
  background: "#0d1117",
  surface: "#161b22",
  text: "#e6edf3",
  muted: "#8b949e",
  border: "#2d333b",
};

export const PALETTE_KEYS: { key: keyof ColorPalette; label: string; hint: string }[] = [
  { key: "primary",    label: "Primary",    hint: "Buttons, links, highlights" },
  { key: "secondary",  label: "Secondary",  hint: "Dark sections, hero backgrounds" },
  { key: "accent",     label: "Accent",     hint: "Badges and special elements" },
  { key: "background", label: "Background", hint: "Page background" },
  { key: "surface",    label: "Surface",    hint: "Cards and panels" },
  { key: "text",       label: "Text",       hint: "Main body text" },
  { key: "muted",      label: "Muted",      hint: "Subtle text and captions" },
  { key: "border",     label: "Border",     hint: "Lines and dividers" },
];

export const PaletteContext = createContext<ColorPalette>(DEFAULT_PALETTE);
export const usePalette = () => useContext(PaletteContext);

// ── Color helpers ───────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance (0 = black, 1 = white). */
function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Pick black or white text for readable contrast on `bg`. Returns near-black
 * (not pure #000) for a softer, Apple-like feel on light surfaces.
 */
export function readableOn(bg: string): string {
  return luminance(bg) > 0.55 ? "#0b0b0c" : "#ffffff";
}

/** Mix two colors in sRGB; `weightA` is the percentage of `a`. */
function mix(a: string, b: string, weightA: number): string {
  return `color-mix(in srgb, ${a} ${weightA}%, ${b})`;
}

/** Build the semantic `--ow-*` token block for one palette. */
function semanticTokens(p: ColorPalette): string {
  return [
    `--ow-bg:${p.background}`,
    `--ow-surface:${p.surface}`,
    // A slightly contrasted elevated surface for hover/nested cards.
    `--ow-surface-2:${mix(p.surface, p.text, 92)}`,
    `--ow-text:${p.text}`,
    `--ow-text-muted:${p.muted}`,
    `--ow-border:${p.border}`,
    `--ow-primary:${p.primary}`,
    `--ow-primary-foreground:${readableOn(p.primary)}`,
    `--ow-secondary:${p.secondary}`,
    `--ow-secondary-foreground:${readableOn(p.secondary)}`,
    `--ow-accent:${p.accent}`,
    `--ow-accent-foreground:${readableOn(p.accent)}`,
    // Soft accent/primary tints for badges and subtle fills.
    `--ow-primary-soft:${mix(p.primary, p.background, 14)}`,
    `--ow-accent-soft:${mix(p.accent, p.background, 16)}`,
    `--ow-ring:${p.primary}`,
  ].join(";");
}

/**
 * Emit the full theme `<style>` body for a site:
 *   - `:root` keeps the legacy `--palette-*` vars (used for first-paint body bg)
 *   - `.ow-shell` carries the light semantic tokens every block consumes
 *   - `.dark .ow-shell` swaps in the dark palette's semantic tokens
 *
 * Both palettes feed the same `--ow-*` names, so dark mode is just a different
 * set of values — no per-component class remapping required.
 */
export function paletteToCSS(light: ColorPalette, dark?: DarkColorPalette): string {
  const d = { ...DEFAULT_DARK_PALETTE, ...(dark ?? {}) };
  const brandVars = Object.entries(light).map(([k, v]) => `--palette-${k}:${v}`).join(";");
  return [
    `:root{${brandVars}}`,
    `.ow-shell{${semanticTokens(light)}}`,
    `.dark .ow-shell{${semanticTokens(d)}}`,
  ].join("");
}
