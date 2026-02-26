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

export function renderBlock(block: Block) {
  switch (block.type) {
    case "hero": return <HeroBlock key={block.id} props={block.props} />;
    case "cta": return <CtaBlock key={block.id} props={block.props} />;
    case "features": return <FeaturesBlock key={block.id} props={block.props} />;
    case "bio-cards": return <BioCardsBlock key={block.id} props={block.props} />;
    case "slideshow": return <SlideshowBlock key={block.id} props={block.props} />;
    case "pricing": return <PricingBlock key={block.id} props={block.props} />;
    case "testimonials": return <TestimonialsBlock key={block.id} props={block.props} />;
    case "faq": return <FaqBlock key={block.id} props={block.props} />;
    case "stats": return <StatsBlock key={block.id} props={block.props} />;
    case "logo-cloud": return <LogoCloudBlock key={block.id} props={block.props} />;
    case "text": return <TextBlock key={block.id} props={block.props} />;
    case "image": return <ImageBlock key={block.id} props={block.props} />;
    case "spacer": return <SpacerBlock key={block.id} props={block.props} />;
    case "heading": return <HeadingBlock key={block.id} props={block.props} />;
    case "columns": return <ColumnsBlock key={block.id} props={block.props} />;
    case "divider": return <DividerBlock key={block.id} props={block.props} />;
    case "navbar": return <NavbarBlock key={block.id} props={block.props} />;
    case "newsletter": return <NewsletterBlock key={block.id} props={block.props} />;
    case "contact": return <ContactBlock key={block.id} props={block.props} />;
  }
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
