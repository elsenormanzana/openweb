import { Suspense, lazy } from "react";
import { parseBlocks, type Block } from "@/lib/blocks";
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

// Lazy-load AnimationWrapper so framer-motion isn't bundled for pages without animations
const AnimationWrapper = lazy(() =>
  import("@/components/blocks/AnimationWrapper").then((m) => ({ default: m.AnimationWrapper }))
);

// Lazy-load animated blocks (they use framer-motion)
const AnimatedHeroBlock = lazy(() => import("@/components/blocks/animated/AnimatedHeroBlock").then((m) => ({ default: m.AnimatedHeroBlock })));
const AnimatedTextBlock = lazy(() => import("@/components/blocks/animated/AnimatedTextBlock").then((m) => ({ default: m.AnimatedTextBlock })));
const BentoGridBlock = lazy(() => import("@/components/blocks/animated/BentoGridBlock").then((m) => ({ default: m.BentoGridBlock })));
const AnimatedCardsBlock = lazy(() => import("@/components/blocks/animated/AnimatedCardsBlock").then((m) => ({ default: m.AnimatedCardsBlock })));
const MarqueeBlock = lazy(() => import("@/components/blocks/animated/MarqueeBlock").then((m) => ({ default: m.MarqueeBlock })));
const LogoMarqueeBlock = lazy(() => import("@/components/blocks/animated/LogoMarqueeBlock").then((m) => ({ default: m.LogoMarqueeBlock })));
const AnimatedCounterBlock = lazy(() => import("@/components/blocks/animated/AnimatedCounterBlock").then((m) => ({ default: m.AnimatedCounterBlock })));
const CardGridBlock = lazy(() => import("@/components/blocks/animated/CardGridBlock").then((m) => ({ default: m.CardGridBlock })));
const GradientSectionBlock = lazy(() => import("@/components/blocks/animated/GradientSectionBlock").then((m) => ({ default: m.GradientSectionBlock })));
const GridBackgroundBlock = lazy(() => import("@/components/blocks/animated/GridBackgroundBlock").then((m) => ({ default: m.GridBackgroundBlock })));
const ParallaxScrollBlock = lazy(() => import("@/components/blocks/animated/ParallaxScrollBlock").then((m) => ({ default: m.ParallaxScrollBlock })));
const FeatureShowcaseBlock = lazy(() => import("@/components/blocks/animated/FeatureShowcaseBlock").then((m) => ({ default: m.FeatureShowcaseBlock })));
const TimelineBlock = lazy(() => import("@/components/blocks/animated/TimelineBlock").then((m) => ({ default: m.TimelineBlock })));
const TabsContentBlock = lazy(() => import("@/components/blocks/animated/TabsContentBlock").then((m) => ({ default: m.TabsContentBlock })));
const AccordionBlock = lazy(() => import("@/components/blocks/animated/AccordionBlock").then((m) => ({ default: m.AccordionBlock })));
const ImageComparisonBlock = lazy(() => import("@/components/blocks/animated/ImageComparisonBlock").then((m) => ({ default: m.ImageComparisonBlock })));
const CtaBannerBlock = lazy(() => import("@/components/blocks/animated/CtaBannerBlock").then((m) => ({ default: m.CtaBannerBlock })));
const FloatingDockBlock = lazy(() => import("@/components/blocks/animated/FloatingDockBlock").then((m) => ({ default: m.FloatingDockBlock })));
const SocialConnectBlock = lazy(() => import("@/components/blocks/SocialConnectBlock").then((m) => ({ default: m.SocialConnectBlock })));
const TeamSocialBlock = lazy(() => import("@/components/blocks/TeamSocialBlock").then((m) => ({ default: m.TeamSocialBlock })));
const FooterSocialBlock = lazy(() => import("@/components/blocks/FooterSocialBlock").then((m) => ({ default: m.FooterSocialBlock })));
const SocialProofFeedBlock = lazy(() => import("@/components/blocks/SocialProofFeedBlock").then((m) => ({ default: m.SocialProofFeedBlock })));
const SocialButtonsBlock = lazy(() => import("@/components/blocks/SocialButtonsBlock").then((m) => ({ default: m.SocialButtonsBlock })));

function renderBlockContent(block: Block, editorProps?: any) {
  switch (block.type) {
    // Original blocks
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
    case "social-buttons": return <Suspense fallback={<div className="h-16" />}><SocialButtonsBlock props={block.props} /></Suspense>;
    case "navbar": return <NavbarBlock props={block.props} />;
    case "newsletter": return <NewsletterBlock props={block.props} />;
    case "contact": return <ContactBlock props={block.props} />;
    case "button": return <ButtonBlock props={block.props} />;
    // Animated blocks (lazy-loaded)
    case "animated-hero": return <Suspense fallback={<div className="h-96 bg-neutral-900" />}><AnimatedHeroBlock props={block.props} /></Suspense>;
    case "animated-text": return <Suspense fallback={<div className="h-32" />}><AnimatedTextBlock props={block.props} /></Suspense>;
    case "bento-grid": return <Suspense fallback={<div className="h-96" />}><BentoGridBlock props={block.props} /></Suspense>;
    case "animated-cards": return <Suspense fallback={<div className="h-96" />}><AnimatedCardsBlock props={block.props} /></Suspense>;
    case "marquee": return <Suspense fallback={<div className="h-24" />}><MarqueeBlock props={block.props} /></Suspense>;
    case "logo-marquee": return <Suspense fallback={<div className="h-32" />}><LogoMarqueeBlock props={block.props} /></Suspense>;
    case "animated-counter": return <Suspense fallback={<div className="h-48" />}><AnimatedCounterBlock props={block.props} /></Suspense>;
    case "card-grid": return <Suspense fallback={<div className="h-96" />}><CardGridBlock props={block.props} /></Suspense>;
    case "gradient-section": return <Suspense fallback={<div className="h-96 bg-neutral-900" />}><GradientSectionBlock props={block.props} /></Suspense>;
    case "grid-background": return <Suspense fallback={<div className="h-96" />}><GridBackgroundBlock props={block.props} /></Suspense>;
    case "parallax-scroll": return <Suspense fallback={<div className="h-96" />}><ParallaxScrollBlock props={block.props} /></Suspense>;
    case "feature-showcase": return <Suspense fallback={<div className="h-96" />}><FeatureShowcaseBlock props={block.props} /></Suspense>;
    case "timeline": return <Suspense fallback={<div className="h-96" />}><TimelineBlock props={block.props} /></Suspense>;
    case "tabs-content": return <Suspense fallback={<div className="h-64" />}><TabsContentBlock props={block.props} /></Suspense>;
    case "accordion": return <Suspense fallback={<div className="h-64" />}><AccordionBlock props={block.props} /></Suspense>;
    case "image-comparison": return <Suspense fallback={<div className="h-96" />}><ImageComparisonBlock props={block.props} /></Suspense>;
    case "cta-banner": return <Suspense fallback={<div className="h-64 bg-neutral-900" />}><CtaBannerBlock props={block.props} /></Suspense>;
    case "floating-dock": return <Suspense fallback={<div className="h-32" />}><FloatingDockBlock props={block.props} /></Suspense>;
    case "social-connect": return <Suspense fallback={<div className="h-32" />}><SocialConnectBlock props={block.props} /></Suspense>;
    case "team-social": return <Suspense fallback={<div className="h-64" />}><TeamSocialBlock props={block.props} /></Suspense>;
    case "footer-social": return <Suspense fallback={<div className="h-64" />}><FooterSocialBlock props={block.props} /></Suspense>;
    case "social-proof-feed": return <Suspense fallback={<div className="h-64" />}><SocialProofFeedBlock props={block.props} /></Suspense>;
  }
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
      style={spacing ? styleObj : undefined}
    >
      {hasCustomCSS && (
        <style>{block.meta!.customCSS!.replace(/:block/g, `[data-block-id="${block.id}"]`)}</style>
      )}
      {hasAnimation ? (
        <Suspense fallback={<div>{content}</div>}>
          <AnimationWrapper animation={block.meta!.animation}>
            {content}
          </AnimationWrapper>
        </Suspense>
      ) : (
        content
      )}
    </div>
  );
}

export function BlockRenderer({ content }: { content: string | null }) {
  if (!content) return null;

  const blocks = parseBlocks(content);
  if (blocks) {
    return <>{blocks.map(renderBlock)}</>;
  }

  // Fallback for legacy HTML content
  return (
    <div
      className="prose prose-neutral max-w-none"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
