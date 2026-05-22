import type { Block } from "@/lib/blocks";
import { HeroForm } from "./HeroForm";
import { CtaForm } from "./CtaForm";
import { FeaturesForm } from "./FeaturesForm";
import { BioCardsForm } from "./BioCardsForm";
import { SlideshowForm } from "./SlideshowForm";
import { PricingForm } from "./PricingForm";
import { TestimonialsForm } from "./TestimonialsForm";
import { FaqForm } from "./FaqForm";
import { StatsForm } from "./StatsForm";
import { LogoCloudForm } from "./LogoCloudForm";
import { TextForm } from "./TextForm";
import { ImageForm } from "./ImageForm";
import { SpacerForm } from "./SpacerForm";
import { HeadingForm } from "./HeadingForm";
import { ColumnsForm } from "./ColumnsForm";
import { DividerForm } from "./DividerForm";
import { NavbarForm } from "./NavbarForm";
import { NewsletterForm } from "./NewsletterForm";
import { ContactForm } from "./ContactForm";
import { RowForm } from "./RowForm";
import { CardForm } from "./CardForm";
import { AlertForm } from "./AlertForm";
// Sprint 4: Animated Wave 1
import { AnimatedHeroForm } from "./AnimatedHeroForm";
import { AnimatedTextForm } from "./AnimatedTextForm";
import { BentoGridForm } from "./BentoGridForm";
import { AnimatedCardsForm } from "./AnimatedCardsForm";
import { MarqueeForm } from "./MarqueeForm";
import { LogoMarqueeForm } from "./LogoMarqueeForm";
import { AnimatedCounterForm } from "./AnimatedCounterForm";
import { CardGridForm } from "./CardGridForm";
// Sprint 5: Animated Wave 2
import { GradientSectionForm } from "./GradientSectionForm";
import { GridBackgroundForm } from "./GridBackgroundForm";
import { ParallaxScrollForm } from "./ParallaxScrollForm";
import { FeatureShowcaseForm } from "./FeatureShowcaseForm";
import { TimelineForm } from "./TimelineForm";
import { TabsContentForm } from "./TabsContentForm";
import { AccordionForm } from "./AccordionForm";
import { ImageComparisonForm } from "./ImageComparisonForm";
import { CtaBannerForm } from "./CtaBannerForm";
import { FloatingDockForm } from "./FloatingDockForm";
import { SocialConnectForm } from "./SocialConnectForm";
import { TeamSocialForm } from "./TeamSocialForm";
import { FooterSocialForm } from "./FooterSocialForm";
import { SocialProofFeedForm } from "./SocialProofFeedForm";
import { SocialButtonsForm } from "./SocialButtonsForm";
import { ButtonForm } from "./ButtonForm";
import { SectionForm } from "./SectionForm";
import { IconForm } from "./IconForm";
import { ListForm } from "./ListForm";

// Re-export shared field helpers for external use
export { Field, Textarea, ColorField, ImagePickerField, SelectField, CtaButtonField, ItemHeader } from "./shared";

export function BlockPropsForm({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  switch (block.type) {
    case "hero": return <HeroForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "cta": return <CtaForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "features": return <FeaturesForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "bio-cards": return <BioCardsForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "slideshow": return <SlideshowForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "pricing": return <PricingForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "testimonials": return <TestimonialsForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "faq": return <FaqForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "stats": return <StatsForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "logo-cloud": return <LogoCloudForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "text": return <TextForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "image": return <ImageForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "spacer": return <SpacerForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "heading": return <HeadingForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "columns": return <ColumnsForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "row": return <RowForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "card": return <CardForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "alert": return <AlertForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "divider": return <DividerForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "social-buttons": return <SocialButtonsForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "navbar": return <NavbarForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "newsletter": return <NewsletterForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "contact": return <ContactForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "button": return <ButtonForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "section": return <SectionForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "icon": return <IconForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "list": return <ListForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    // Sprint 4: Animated Wave 1
    case "animated-hero": return <AnimatedHeroForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "animated-text": return <AnimatedTextForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "bento-grid": return <BentoGridForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "animated-cards": return <AnimatedCardsForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "marquee": return <MarqueeForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "logo-marquee": return <LogoMarqueeForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "animated-counter": return <AnimatedCounterForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "card-grid": return <CardGridForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    // Sprint 5: Animated Wave 2
    case "gradient-section": return <GradientSectionForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "grid-background": return <GridBackgroundForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "parallax-scroll": return <ParallaxScrollForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "feature-showcase": return <FeatureShowcaseForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "timeline": return <TimelineForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "tabs-content": return <TabsContentForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "accordion": return <AccordionForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "image-comparison": return <ImageComparisonForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "cta-banner": return <CtaBannerForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "floating-dock": return <FloatingDockForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "social-connect": return <SocialConnectForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "team-social": return <TeamSocialForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "footer-social": return <FooterSocialForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "social-proof-feed": return <SocialProofFeedForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
  }
}

