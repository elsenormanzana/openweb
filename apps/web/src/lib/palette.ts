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

/** Build a <style> string injecting CSS custom properties */
export function paletteToCSS(palette: ColorPalette): string {
  return `:root{${Object.entries(palette).map(([k, v]) => `--palette-${k}:${v}`).join(";")}}`;
}
