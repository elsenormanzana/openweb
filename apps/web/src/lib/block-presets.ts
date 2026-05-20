import { defaultBlock, type Block, type BlockType } from "./blocks";

export type BlockPreset = {
  id?: string;
  name: string;
  description: string;
  blocks: BlockType[];
  savedBlocks?: Block[];
};

export const BLOCK_PRESETS: BlockPreset[] = [
  {
    name: "SaaS Landing",
    description: "Hero, features, stats, testimonials, pricing, CTA",
    blocks: ["animated-hero", "features", "animated-counter", "testimonials", "pricing", "cta-banner"],
  },
  {
    name: "Portfolio",
    description: "Hero, bento grid, timeline, contact",
    blocks: ["animated-hero", "bento-grid", "timeline", "contact"],
  },
  {
    name: "About Page",
    description: "Hero, team cards, stats, testimonials",
    blocks: ["hero", "bio-cards", "stats", "testimonials"],
  },
  {
    name: "Product Page",
    description: "Animated hero, feature showcase, pricing, FAQ, CTA",
    blocks: ["animated-hero", "feature-showcase", "pricing", "accordion", "cta-banner"],
  },
  {
    name: "Minimal Landing",
    description: "Gradient section, animated text, card grid, newsletter",
    blocks: ["gradient-section", "animated-text", "card-grid", "newsletter"],
  },
  {
    name: "Agency Showcase",
    description: "Hero, logo marquee, features, slideshow, testimonials, CTA",
    blocks: ["animated-hero", "logo-marquee", "features", "slideshow", "testimonials", "cta"],
  },
  {
    name: "Blog / Content",
    description: "Hero, text sections, image, divider, newsletter",
    blocks: ["hero", "text", "image", "divider", "text", "newsletter"],
  },
  {
    name: "Comparison Page",
    description: "Hero, tabs content, image comparison, FAQ, CTA banner",
    blocks: ["hero", "tabs-content", "image-comparison", "faq", "cta-banner"],
  },
  {
    name: "Event / Launch",
    description: "Animated hero, animated counter, feature showcase, accordion, CTA",
    blocks: ["animated-hero", "animated-counter", "feature-showcase", "accordion", "cta-banner"],
  },
  {
    name: "Startup Landing",
    description: "Grid background, animated cards, marquee, pricing, newsletter",
    blocks: ["grid-background", "animated-cards", "marquee", "pricing", "newsletter"],
  },
  {
    name: "E-commerce Storefront",
    description: "Hero, marquee, card grid, pricing, testimonials, newsletter",
    blocks: ["hero", "marquee", "card-grid", "pricing", "testimonials", "newsletter"],
  },
  {
    name: "Webinar Registration",
    description: "Animated hero, animated counter, team cards, accordion, CTA banner",
    blocks: ["animated-hero", "animated-counter", "bio-cards", "accordion", "cta-banner"],
  },
  {
    name: "Mobile App Promo",
    description: "Gradient section, bento grid, feature showcase, pricing, floating dock",
    blocks: ["gradient-section", "bento-grid", "feature-showcase", "pricing", "floating-dock"],
  },
  {
    name: "Creative Studio",
    description: "Parallax scroll, logo marquee, slideshow, image comparison, contact",
    blocks: ["parallax-scroll", "logo-marquee", "slideshow", "image-comparison", "contact"],
  },
  {
    name: "Enterprise Portal",
    description: "Hero, logo cloud, features, stats, tabs content, FAQ, contact",
    blocks: ["hero", "logo-cloud", "features", "stats", "tabs-content", "faq", "contact"],
  },
];

export function createPresetBlocks(preset: BlockPreset): Block[] {
  if (preset.savedBlocks && preset.savedBlocks.length > 0) {
    return preset.savedBlocks.map((b) => ({ ...structuredClone(b), id: crypto.randomUUID() }));
  }
  return preset.blocks.map((type) => defaultBlock(type));
}
