import type { ColorPalette, DarkColorPalette } from "@/lib/palette";

/**
 * Curated, Apple-inspired theme presets. Each preset is a paired light + dark
 * palette that feeds the `--ow-*` semantic tokens (see paletteToCSS). Applying
 * one writes `navConfig.palette` (light) and `navConfig.darkPalette` (dark).
 */
export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  light: ColorPalette;
  dark: DarkColorPalette;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "graphite",
    name: "Graphite",
    description: "Apple-system neutral — true blue on clean white, graphite in the dark.",
    light: {
      primary: "#0071e3", secondary: "#1d1d1f", accent: "#f59e0b",
      background: "#ffffff", surface: "#f5f5f7", text: "#1d1d1f",
      muted: "#6e6e73", border: "#d2d2d7",
    },
    dark: {
      primary: "#0a84ff", secondary: "#f5f5f7", accent: "#ffd60a",
      background: "#000000", surface: "#1c1c1e", text: "#f5f5f7",
      muted: "#98989d", border: "#38383a",
    },
  },
  {
    id: "sky",
    name: "Sky",
    description: "Calm, airy blue with soft tinted surfaces.",
    light: {
      primary: "#0ea5e9", secondary: "#0f172a", accent: "#38bdf8",
      background: "#ffffff", surface: "#f0f9ff", text: "#0c1620",
      muted: "#5b7083", border: "#dbeafe",
    },
    dark: {
      primary: "#38bdf8", secondary: "#e2f2fb", accent: "#7dd3fc",
      background: "#0a1420", surface: "#11202e", text: "#e8f4fb",
      muted: "#8aa6b8", border: "#1e3447",
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Grounded greens for natural, wellness, and outdoor brands.",
    light: {
      primary: "#16a34a", secondary: "#14532d", accent: "#65a30d",
      background: "#ffffff", surface: "#f3faf5", text: "#14241a",
      muted: "#5f7468", border: "#d6ece0",
    },
    dark: {
      primary: "#4ade80", secondary: "#dcfce7", accent: "#a3e635",
      background: "#0b1410", surface: "#13201a", text: "#e7f5ec",
      muted: "#8ba596", border: "#1f3429",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm coral and amber over cream — energetic and inviting.",
    light: {
      primary: "#ea580c", secondary: "#431407", accent: "#f59e0b",
      background: "#fffbf7", surface: "#fff3ea", text: "#2a160b",
      muted: "#8a6a55", border: "#fbe0cc",
    },
    dark: {
      primary: "#fb923c", secondary: "#ffedd5", accent: "#fbbf24",
      background: "#160d07", surface: "#241710", text: "#fbe7da",
      muted: "#b08a6f", border: "#3a261a",
    },
  },
  {
    id: "violet",
    name: "Violet",
    description: "Refined indigo-to-magenta for creative and product brands.",
    light: {
      primary: "#7c3aed", secondary: "#1e1b4b", accent: "#d946ef",
      background: "#ffffff", surface: "#f7f5ff", text: "#1c1733",
      muted: "#6b6486", border: "#e7e1fb",
    },
    dark: {
      primary: "#a78bfa", secondary: "#ede9fe", accent: "#e879f9",
      background: "#0e0b1a", surface: "#181428", text: "#ece8fb",
      muted: "#9990b8", border: "#2a2342",
    },
  },
  {
    id: "mono",
    name: "Mono",
    description: "Stark monochrome — maximal contrast, zero distraction.",
    light: {
      primary: "#111111", secondary: "#111111", accent: "#555555",
      background: "#ffffff", surface: "#f6f6f6", text: "#111111",
      muted: "#707070", border: "#e3e3e3",
    },
    dark: {
      primary: "#ffffff", secondary: "#f0f0f0", accent: "#a0a0a0",
      background: "#0a0a0a", surface: "#161616", text: "#f5f5f5",
      muted: "#9a9a9a", border: "#2a2a2a",
    },
  },
];

/** Whether a stored palette matches a preset's light palette (key colors). */
export function paletteMatchesPreset(
  palette: Partial<ColorPalette> | undefined,
  preset: ThemePreset,
): boolean {
  if (!palette) return false;
  const keys: (keyof ColorPalette)[] = ["primary", "background", "surface", "text"];
  return keys.every((k) => (palette[k] ?? "").toLowerCase() === preset.light[k].toLowerCase());
}
