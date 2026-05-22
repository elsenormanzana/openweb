import { Suspense, lazy, Component, type ReactNode, createContext } from "react";
import { parseBlocks, type Block } from "@/lib/parseBlocks";

export const NestedBlockContext = createContext(false);
import { HeroBlock } from "@/components/blocks/HeroBlock";
import { CtaBlock } from "@/components/blocks/CtaBlock";
import { FeaturesBlock } from "@/components/blocks/FeaturesBlock";
import { BioCardsBlock } from "@/components/blocks/BioCardsBlock";
import { SlideshowBlock } from "@/components/blocks/SlideshowBlock";
import { PricingBlock } from "@/components/blocks/PricingBlock";
import { TestimonialsBlock } from "@/components/blocks/TestimonialsBlock";
import { FaqBlock } from "@/components/blocks/FaqBlock";
import { StatsBlock } from "@/components/blocks/StatsBlock";
import { LogoCloudBlock } from "@/components/blocks/LogoCloudBlock";
import { TextBlock } from "@/components/blocks/TextBlock";
import { ImageBlock } from "@/components/blocks/ImageBlock";
import { SpacerBlock } from "@/components/blocks/SpacerBlock";
import { HeadingBlock } from "@/components/blocks/HeadingBlock";
import { ColumnsBlock } from "@/components/blocks/ColumnsBlock";
import { DividerBlock } from "@/components/blocks/DividerBlock";
import { NavbarBlock } from "@/components/blocks/NavbarBlock";
import { NewsletterBlock } from "@/components/blocks/NewsletterBlock";
import { ContactBlock } from "@/components/blocks/ContactBlock";
import { RowBlock } from "@/components/blocks/RowBlock";
import { CardBlock } from "@/components/blocks/CardBlock";
import { AlertBlock } from "@/components/blocks/AlertBlock";
import { ButtonBlock } from "@/components/blocks/ButtonBlock";
import { SectionBlock } from "@/components/blocks/SectionBlock";
import { IconBlock } from "@/components/blocks/IconBlock";
import { ListBlock } from "@/components/blocks/ListBlock";

// Lazy-load AnimationWrapper so framer-motion isn't bundled for pages without animations
const AnimationWrapper = lazy(() =>
  import("@/components/blocks/AnimationWrapper").then((m) => ({ default: m.AnimationWrapper }))
);

// Isolates each block: if one block throws while rendering, it is dropped and
// the rest of the page still renders. Works the same on the server and during
// hydration, so a single bad block can never blank the whole page.
class BlockErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// ── Lazy block registry ───────────────────────────────────────────────────────
// Animated + social blocks are heavy (framer-motion etc.), so each is a separate
// dynamic import — Vite emits one on-demand chunk per block, and the shared
// framer-motion code is a single chunk loaded once. `preloadBlocks()` fires the
// imports for exactly the block types a page uses, in parallel and up front, so
// there is no per-block load waterfall. A page with no animated/social blocks
// ships none of this code (and no framer-motion).
type ModuleLoader = () => Promise<Record<string, unknown>>;

const LAZY_BLOCK_LOADERS: Record<string, { load: ModuleLoader; export: string }> = {
  "animated-hero": { load: () => import("@/components/blocks/animated/AnimatedHeroBlock"), export: "AnimatedHeroBlock" },
  "animated-text": { load: () => import("@/components/blocks/animated/AnimatedTextBlock"), export: "AnimatedTextBlock" },
  "bento-grid": { load: () => import("@/components/blocks/animated/BentoGridBlock"), export: "BentoGridBlock" },
  "animated-cards": { load: () => import("@/components/blocks/animated/AnimatedCardsBlock"), export: "AnimatedCardsBlock" },
  "marquee": { load: () => import("@/components/blocks/animated/MarqueeBlock"), export: "MarqueeBlock" },
  "logo-marquee": { load: () => import("@/components/blocks/animated/LogoMarqueeBlock"), export: "LogoMarqueeBlock" },
  "animated-counter": { load: () => import("@/components/blocks/animated/AnimatedCounterBlock"), export: "AnimatedCounterBlock" },
  "card-grid": { load: () => import("@/components/blocks/animated/CardGridBlock"), export: "CardGridBlock" },
  "gradient-section": { load: () => import("@/components/blocks/animated/GradientSectionBlock"), export: "GradientSectionBlock" },
  "grid-background": { load: () => import("@/components/blocks/animated/GridBackgroundBlock"), export: "GridBackgroundBlock" },
  "parallax-scroll": { load: () => import("@/components/blocks/animated/ParallaxScrollBlock"), export: "ParallaxScrollBlock" },
  "feature-showcase": { load: () => import("@/components/blocks/animated/FeatureShowcaseBlock"), export: "FeatureShowcaseBlock" },
  "timeline": { load: () => import("@/components/blocks/animated/TimelineBlock"), export: "TimelineBlock" },
  "tabs-content": { load: () => import("@/components/blocks/animated/TabsContentBlock"), export: "TabsContentBlock" },
  "accordion": { load: () => import("@/components/blocks/animated/AccordionBlock"), export: "AccordionBlock" },
  "image-comparison": { load: () => import("@/components/blocks/animated/ImageComparisonBlock"), export: "ImageComparisonBlock" },
  "cta-banner": { load: () => import("@/components/blocks/animated/CtaBannerBlock"), export: "CtaBannerBlock" },
  "floating-dock": { load: () => import("@/components/blocks/animated/FloatingDockBlock"), export: "FloatingDockBlock" },
  "social-connect": { load: () => import("@/components/blocks/SocialConnectBlock"), export: "SocialConnectBlock" },
  "team-social": { load: () => import("@/components/blocks/TeamSocialBlock"), export: "TeamSocialBlock" },
  "footer-social": { load: () => import("@/components/blocks/FooterSocialBlock"), export: "FooterSocialBlock" },
  "social-proof-feed": { load: () => import("@/components/blocks/SocialProofFeedBlock"), export: "SocialProofFeedBlock" },
  "social-buttons": { load: () => import("@/components/blocks/SocialButtonsBlock"), export: "SocialButtonsBlock" },
};

// Approximate placeholder heights — keep the fallback close to the real block
// size so there is no layout shift while a chunk resolves.
const LAZY_BLOCK_FALLBACK: Record<string, string> = {
  "animated-hero": "h-96 bg-neutral-900",
  "animated-text": "h-32",
  "bento-grid": "h-96",
  "animated-cards": "h-96",
  "marquee": "h-24",
  "logo-marquee": "h-32",
  "animated-counter": "h-48",
  "card-grid": "h-96",
  "gradient-section": "h-96 bg-neutral-900",
  "grid-background": "h-96",
  "parallax-scroll": "h-96",
  "feature-showcase": "h-96",
  "timeline": "h-96",
  "tabs-content": "h-64",
  "accordion": "h-64",
  "image-comparison": "h-96",
  "cta-banner": "h-64 bg-neutral-900",
  "floating-dock": "h-32",
  "social-connect": "h-32",
  "team-social": "h-64",
  "footer-social": "h-64",
  "social-proof-feed": "h-64",
  "social-buttons": "h-16",
};

const LazyBlockComponents: Record<string, React.LazyExoticComponent<React.ComponentType<{ props: any }>>> = {};
for (const [type, { load, export: exportName }] of Object.entries(LAZY_BLOCK_LOADERS)) {
  LazyBlockComponents[type] = lazy(() =>
    load().then((m) => ({ default: m[exportName] as React.ComponentType<{ props: any }> }))
  );
}

/**
 * Warm the chunk(s) for the given block types in parallel. Called before render
 * so grouped chunks are already in flight by the time React reaches the blocks.
 * Idempotent — the browser/Vite dedupe repeat `import()` calls.
 */
export function preloadBlocks(types: Iterable<string>) {
  const seen = new Set<string>();
  for (const type of types) {
    if (seen.has(type)) continue;
    seen.add(type);
    LAZY_BLOCK_LOADERS[type]?.load();
  }
}

function renderLazyBlock(type: string, props: any) {
  const LazyComp = LazyBlockComponents[type];
  if (!LazyComp) return null;
  const fallbackClass = LAZY_BLOCK_FALLBACK[type] ?? "h-64";
  return (
    <Suspense fallback={<div className={fallbackClass} />}>
      <LazyComp props={props} />
    </Suspense>
  );
}

function renderBlockContent(block: Block, editorProps?: any) {
  switch (block.type) {
    // Core blocks — eager (small, used on most pages)
    case "hero": return <HeroBlock props={block.props} />;
    case "cta": return <CtaBlock props={block.props} />;
    case "features": return <FeaturesBlock props={block.props} />;
    case "bio-cards": return <BioCardsBlock props={block.props} />;
    case "slideshow": return <SlideshowBlock props={block.props} />;
    case "pricing": return <PricingBlock props={block.props} />;
    case "testimonials": return <TestimonialsBlock props={block.props} />;
    case "faq": return <FaqBlock props={block.props} />;
    case "stats": return <StatsBlock props={block.props} />;
    case "logo-cloud": return <LogoCloudBlock props={block.props} />;
    case "text": return <TextBlock props={block.props} />;
    case "image": return <ImageBlock props={block.props} />;
    case "spacer": return <SpacerBlock props={block.props} />;
    case "heading": return <HeadingBlock props={block.props} />;
    case "columns": return <ColumnsBlock props={block.props} editorProps={editorProps} blockId={block.id} />;
    case "row": return <RowBlock props={block.props} editorProps={editorProps} blockId={block.id} />;
    case "card": return <CardBlock props={block.props} editorProps={editorProps} blockId={block.id} />;
    case "alert": return <AlertBlock props={block.props} editorProps={editorProps} blockId={block.id} />;
    case "divider": return <DividerBlock props={block.props} />;
    case "navbar": return <NavbarBlock props={block.props} />;
    case "newsletter": return <NewsletterBlock props={block.props} />;
    case "contact": return <ContactBlock props={block.props} />;
    case "button": return <ButtonBlock props={block.props} />;
    case "section": return <SectionBlock props={block.props} editorProps={editorProps} blockId={block.id} />;
    case "icon": return <IconBlock props={block.props} />;
    case "list": return <ListBlock props={block.props} />;
    // Animated + social blocks — lazy, grouped into blocks-animated / blocks-social
    default: return renderLazyBlock(block.type, block.props);
  }
}

// Block types that render a dark background. Their `data-surface="dark"` makes
// buttons and content inside use the dark variant even in light mode.
const DARK_SURFACE_BLOCKS = new Set([
  "stats", "social-proof-feed", "team-social", "animated-hero", "gradient-section",
]);

function blockSurface(block: Block): "dark" | undefined {
  if (DARK_SURFACE_BLOCKS.has(block.type)) return "dark";
  // Hero/CTA/Section expose a textColor prop — "light" text means a dark background.
  if ((block.type === "hero" || block.type === "cta" || block.type === "section")
    && (block.props as { textColor?: string })?.textColor === "light") {
    return "dark";
  }
  return undefined;
}

export function renderBlock(block: Block, editorProps?: any) {
  const content = renderBlockContent(block, editorProps);
  const hasAnimation = block.meta?.animation && block.meta.animation.entrance !== "none";
  const hasCustomCSS = block.meta?.customCSS?.trim();
  const spacing = block.meta?.spacing;
  const anchorId = block.meta?.anchorId?.trim();

  const styleObj: React.CSSProperties = spacing ? {
    marginTop: spacing.marginTop || undefined,
    marginBottom: spacing.marginBottom || undefined,
    marginLeft: spacing.marginLeft || undefined,
    marginRight: spacing.marginRight || undefined,
    paddingTop: spacing.paddingTop || undefined,
    paddingBottom: spacing.paddingBottom || undefined,
    paddingLeft: spacing.paddingLeft || undefined,
    paddingRight: spacing.paddingRight || undefined,
    width: spacing.width || undefined,
    maxWidth: spacing.maxWidth || undefined,
    alignSelf: spacing.alignSelf !== "auto" ? spacing.alignSelf : undefined,
  } : {};

  return (
    <div
      key={block.id}
      id={anchorId || undefined}
      data-block-id={block.id}
      data-surface={blockSurface(block)}
      style={spacing ? styleObj : undefined}
    >
      {hasCustomCSS && (
        <style>{block.meta!.customCSS!.replace(/:block/g, `[data-block-id="${block.id}"]`)}</style>
      )}
      {/* Suspense isolates SSR render errors to this block (errors bubble to the
          nearest Suspense on the server); the error boundary does the same for
          client-side renders. Either way one bad block degrades to empty
          instead of blanking the whole page. */}
      <BlockErrorBoundary>
        <Suspense fallback={null}>
          {hasAnimation ? (
            <Suspense fallback={content}>
              <AnimationWrapper animation={block.meta!.animation}>
                {content}
              </AnimationWrapper>
            </Suspense>
          ) : (
            content
          )}
        </Suspense>
      </BlockErrorBoundary>
    </div>
  );
}

export function BlockRenderer({ content }: { content: string | null }) {
  if (!content) return null;

  const blocks = parseBlocks(content);
  if (blocks) {
    // Fire the grouped chunk requests up front, in parallel, so they are
    // already loading while the eager blocks render.
    preloadBlocks(blocks.map((b) => b.type));
    return <>{blocks.map((b) => renderBlock(b))}</>;
  }

  // Fallback for legacy HTML content
  return (
    <div
      className="prose prose-neutral max-w-none"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
