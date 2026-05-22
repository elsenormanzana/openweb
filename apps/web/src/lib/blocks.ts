import type { LucideIcon } from "lucide-react";
import {
  Sparkles, Megaphone, LayoutGrid, Users, GalleryHorizontal,
  BadgeDollarSign, MessageSquare, CircleHelp, BarChart3, Building2,
  Type, ImageIcon, SeparatorHorizontal, Heading1, Columns2, Minus,
  Navigation, Mail, PhoneCall,
  // Sprint 4-5 icons
  Wand2, TextCursorInput, Grid3x3, Layers, ArrowRightLeft, Hash,
  LayoutDashboard, Palette, Grip, PanelTop, Scroll,
  SquareStack, ChevronsUpDown, SplitSquareHorizontal, Anchor,
  Milestone, Share2, MousePointerClick, Star, List,
} from "lucide-react";

// Features-block icon picker map — re-exported from a lightweight module so
// public block components can import it without dragging in BLOCK_REGISTRY.
export { FEATURE_ICON_MAP } from "./featureIcons";
export type { FeatureIconName } from "./featureIcons";

// parseBlocks lives in its own dependency-free module (see ./parseBlocks).
export { parseBlocks } from "./parseBlocks";

// ─── Block prop types ────────────────────────────────────────────────────────

export type CtaButton = {
  label: string;
  href: string;
  icon?: string;
  emoji?: string;
  iconPosition?: "left" | "right";
  variant?: "solid" | "outline" | "glass" | "shimmer";
  color?: string;
  textColor?: string;
  size?: "sm" | "md" | "lg";
  borderRadius?: "none" | "sm" | "md" | "lg" | "full";
};

export type SocialConnectItem = {
  id: string;
  platform: string;
  label: string;
  href: string;
  icon?: string;
  emoji?: string;
  color?: string;
  badge?: string;
};

export type SocialConnectBlockProps = {
  heading: string;
  subheading: string;
  items: SocialConnectItem[];
  layout: "grid" | "row" | "cards" | "floating";
  buttonStyle: "solid" | "outline" | "glass" | "shimmer";
  align: "left" | "center" | "right";
  backgroundColor?: string;
};

export type SocialButtonsBlockProps = {
  items: SocialConnectItem[];
  layout: "grid" | "row" | "floating";
  buttonStyle: "solid" | "outline" | "glass" | "shimmer";
  align: "left" | "center" | "right";
  size: "sm" | "md" | "lg";
  showOnlyLogos?: boolean;
};

export type TeamSocialMember = {
  id: string;
  name: string;
  role: string;
  bio?: string;
  avatar?: string;
  socials: { id: string; platform: string; href: string; icon?: string; color?: string }[];
};

export type TeamSocialBlockProps = {
  heading: string;
  subheading: string;
  layout: "grid" | "cards";
  members: TeamSocialMember[];
};

export type FooterSocialBlockProps = {
  brandName: string;
  tagline: string;
  copyright: string;
  socials: SocialConnectItem[];
  newsletterHeading?: string;
  newsletterPlaceholder?: string;
  newsletterButtonText?: string;
  backgroundColor?: string;
};

export type SocialProofFeedItem = {
  id: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  content: string;
  platform: string;
  icon?: string;
  date?: string;
  rating?: number;
};

export type SocialProofFeedBlockProps = {
  heading: string;
  subheading: string;
  mainCta?: CtaButton;
  feed: SocialProofFeedItem[];
  layout: "masonry" | "grid";
};

export type HeroBlockProps = {
  heading: string;
  subheading: string;
  description: string;
  primaryCta: CtaButton;
  secondaryCta: CtaButton;
  badgeText: string;
  backgroundType: "color" | "image" | "video";
  backgroundColor: string;
  backgroundImage: string;
  backgroundVideo: string;
  backgroundOpacity: number;
  align: "left" | "center";
  textColor: "light" | "dark";
};

export type CtaBlockProps = {
  heading: string;
  description: string;
  primaryCta: CtaButton;
  secondaryCta: CtaButton;
  backgroundColor: string;
  textColor: "light" | "dark";
};

export type FeatureItem = { icon: string; title: string; description: string };
export type FeaturesBlockProps = {
  heading: string;
  subheading: string;
  columns: 2 | 3 | 4;
  items: FeatureItem[];
};

export type BioCardItem = { name: string; role: string; bio: string; avatar: string; linkedin: string; twitter: string };
export type BioCardsBlockProps = {
  heading: string;
  subheading: string;
  items: BioCardItem[];
};

export type SlideshowItem = { title: string; description: string; image: string; badge: string; cta: CtaButton };
export type SlideshowBlockProps = {
  heading: string;
  subheading: string;
  items: SlideshowItem[];
};

export type PricingTier = { name: string; price: string; period: string; description: string; features: string[]; cta: CtaButton; highlighted: boolean };
export type PricingBlockProps = {
  heading: string;
  subheading: string;
  tiers: PricingTier[];
};

export type TestimonialItem = { quote: string; name: string; role: string; company: string; avatar: string };
export type TestimonialsBlockProps = {
  heading: string;
  items: TestimonialItem[];
};

export type FaqItem = { question: string; answer: string };
export type FaqBlockProps = {
  heading: string;
  items: FaqItem[];
};

export type StatItem = { value: string; label: string; description: string };
export type StatsBlockProps = {
  heading: string;
  items: StatItem[];
};

export type LogoItem = { name: string; url: string };
export type LogoCloudBlockProps = {
  heading: string;
  subheading: string;
  logos: LogoItem[];
};

export type TextBlockProps = {
  content: string;
  align: "left" | "center" | "right";
};

export type ImageBlockProps = {
  src: string;
  alt: string;
  width: "full" | "contained";
  caption: string;
};

export type ButtonBlockProps = {
  label: string;
  href: string;
  variant: "solid" | "outline" | "glass" | "shimmer";
  align: "left" | "center" | "right" | "full";
  size: "sm" | "md" | "lg";
  color: string;
  textColor: string;
  borderRadius: "none" | "sm" | "md" | "lg" | "full";
  icon?: string;
  emoji?: string;
  iconPosition?: "left" | "right";
};

export type SpacerBlockProps = {
  height: 16 | 32 | 48 | 64 | 96 | 128;
};

// Full-width container — the backbone of editable pre-made block compositions.
export type SectionBlockProps = {
  backgroundColor: string;
  backgroundImage: string;
  backgroundOpacity: number;
  paddingY: "none" | "sm" | "md" | "lg" | "xl";
  paddingX: "none" | "sm" | "md" | "lg" | "xl";
  maxWidth: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  align: "left" | "center" | "right";
  textColor: "light" | "dark" | "auto";
  blocks: any[];
};

export type IconBlockProps = {
  icon: string;
  size: "sm" | "md" | "lg" | "xl";
  color: string;
  align: "left" | "center" | "right";
};

export type ListBlockProps = {
  items: string[];
  ordered: boolean;
  marker: "check" | "dot" | "dash" | "number";
  iconColor: string;
  align: "left" | "center";
};

export type BadgeBlockProps = {
  text: string;
  variant: "soft" | "solid" | "outline";
  color: string;
  align: "left" | "center" | "right";
};

export type HeadingBlockProps = {
  text: string;
  level: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  align: "left" | "center" | "right";
  color: string;
};

export type ColumnItem = {
  id?: string;
  width?: string;
  mobileWidth?: string;
  colSpan?: number;   // grid-column span (default 1)
  rowSpan?: number;   // grid-row span (default 1)
  content: string;
  blocks?: any[];
};
export type ColumnsBlockProps = {
  columns: ColumnItem[];
  gridColumns?: number;  // grid track count; default = columns.length
  gap: "sm" | "md" | "lg";
  paddingY: "none" | "sm" | "md" | "lg";
  bgColor: string;
};

export type ColumnConfig = {
  id: string;
  width: string;
  mobileWidth: string;
  customWidth?: number;
  padding?: string;
  bgColor?: string;
  borderRadius?: string;
  verticalAlign?: "start" | "center" | "end" | "between";
  alignSelf?: "auto" | "start" | "center" | "end" | "stretch";
  blocks: any[];
};

export type RowBlockProps = {
  columns: ColumnConfig[];
  gap: "none" | "sm" | "md" | "lg" | "xl";
  alignItems: "start" | "center" | "end" | "stretch";
  justifyContent: "start" | "center" | "between" | "around" | "evenly";
  paddingY: "none" | "sm" | "md" | "lg" | "xl";
  paddingX: "none" | "sm" | "md" | "lg" | "xl";
  backgroundColor?: string;
  borderRadius?: "none" | "sm" | "md" | "lg" | "xl" | "2xl";
  border?: boolean;
  borderColor?: string;
  shadow?: "none" | "sm" | "md" | "lg" | "xl" | "2xl";
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  flexDirection?: "row" | "col";
  padding?: string;
  blocks?: any[];
};

export type CardBlockProps = {
  title: string;
  subtitle: string;
  image: string;
  backgroundColor: string;
  borderColor: string;
  borderRadius: "none" | "sm" | "md" | "lg";
  padding: "none" | "sm" | "md" | "lg";
  shadow: "none" | "sm" | "md" | "lg";
  blocks: any[];
};

export type AlertBlockProps = {
  type: "info" | "warning" | "success" | "error";
  title: string;
  icon: boolean;
  variant: "solid" | "subtle" | "left-accent";
  blocks: any[];
};

export type DividerBlockProps = {
  style: "solid" | "dashed" | "dotted" | "none";
  color: string;
  paddingY: 8 | 16 | 32 | 48;
};

export type NavbarLink = { label: string; href: string };
export type NavbarBlockProps = {
  logoText: string;
  logoHref: string;
  links: NavbarLink[];
  ctaLabel: string;
  ctaHref: string;
  style: "light" | "dark" | "transparent";
  sticky: boolean;
};

export type NewsletterBlockProps = {
  heading: string;
  description: string;
  placeholder: string;
  buttonLabel: string;
  collectName: boolean;
  backgroundColor: string;
  textColor: "light" | "dark";
  align: "left" | "center";
};

export type ContactBlockProps = {
  heading: string;
  subheading: string;
  email: string;
  phone: string;
  address: string;
  showForm: boolean;
  formSource: "native" | "google";
  formSlug: string;
  iframeUrl: string;
  submitLabel: string;
  backgroundColor: string;
};

// ─── Sprint 4: Animated Blocks — Wave 1 ──────────────────────────────────────

export type AnimatedHeroBlockProps = {
  heading: string;
  subheading: string;
  spotlightColor: string;
  animationType: "spotlight" | "lamp" | "aurora";
  gradientColors: string[];
  primaryCta: CtaButton;
  secondaryCta: CtaButton;
};

export type AnimatedTextBlockProps = {
  text: string;
  animation: "typewriter" | "generate" | "gradient" | "blur-in" | "fade-up";
  speed: number;
  gradientColors: string[];
  align: "left" | "center" | "right";
};

export type BentoGridItem = {
  colSpan: 1 | 2;
  rowSpan: 1 | 2;
  title: string;
  description: string;
  icon: string;
  image: string;
};
export type BentoGridBlockProps = {
  items: BentoGridItem[];
  gridCols: 3 | 4;
};

export type AnimatedCardItem = {
  title: string;
  description: string;
  image: string;
  link: string;
};
export type AnimatedCardsBlockProps = {
  items: AnimatedCardItem[];
  cardStyle: "3d-tilt" | "hover-glow" | "spotlight";
};

export type MarqueeItem = { image: string; text: string };
export type MarqueeBlockProps = {
  items: MarqueeItem[];
  speed: number;
  direction: "left" | "right";
  pauseOnHover: boolean;
};

export type LogoMarqueeBlockProps = {
  heading: string;
  logos: LogoItem[];
  speed: number;
  rows: 1 | 2;
  direction: "left" | "right";
  grayscale: boolean;
};

export type AnimatedCounterItem = { value: number; label: string; prefix: string; suffix: string };
export type AnimatedCounterBlockProps = {
  items: AnimatedCounterItem[];
  duration: number;
  triggerOnView: boolean;
};

export type CardGridItem = {
  title: string;
  description: string;
  image: string;
  link: string;
  badge: string;
};
export type CardGridBlockProps = {
  items: CardGridItem[];
  columns: 2 | 3 | 4;
  cardStyle: "default" | "bordered" | "shadow";
  hoverEffect: "none" | "lift" | "glow" | "border";
};

// ─── Sprint 5: Animated Blocks — Wave 2 ──────────────────────────────────────

export type GradientSectionBlockProps = {
  heading: string;
  description: string;
  cta: CtaButton;
  animation: "aurora" | "gradient-flow" | "meteors";
  colors: string[];
};

export type GridBackgroundBlockProps = {
  heading: string;
  description: string;
  cta: CtaButton;
  pattern: "grid" | "dots" | "lines";
  patternColor: string;
  opacity: number;
};

export type ParallaxScrollItem = { image: string; title: string; description: string };
export type ParallaxScrollBlockProps = {
  items: ParallaxScrollItem[];
  intensity: number;
};

export type FeatureShowcaseItem = { title: string; description: string; image: string };
export type FeatureShowcaseBlockProps = {
  items: FeatureShowcaseItem[];
  stickyPosition: "left" | "right";
};

export type TimelineItem = { date: string; title: string; description: string; image: string };
export type TimelineBlockProps = {
  heading: string;
  items: TimelineItem[];
  lineColor: string;
};

export type TabsContentItem = { tabLabel: string; content: string; image: string };
export type TabsContentBlockProps = {
  items: TabsContentItem[];
  tabStyle: "underline" | "pill" | "bordered";
};

export type AccordionItem = { question: string; answer: string };
export type AccordionBlockProps = {
  heading: string;
  items: AccordionItem[];
  allowMultiple: boolean;
  iconStyle: "chevron" | "plus" | "arrow";
};

export type ImageComparisonBlockProps = {
  beforeImage: string;
  afterImage: string;
  beforeLabel: string;
  afterLabel: string;
  orientation: "horizontal" | "vertical";
};

export type CtaBannerBlockProps = {
  heading: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  buttonStyle: "shimmer" | "moving-border" | "pulse-glow";
};

export type FloatingDockItem = { icon: string; label: string; href: string };
export type FloatingDockBlockProps = {
  items: FloatingDockItem[];
  position: "bottom" | "top";
  magnification: boolean;
};

// ─── Animation & shared block metadata ────────────────────────────────────────

import type { AnimationConfig } from "./animations";

export type SpacingConfig = {
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  width?: string;
  maxWidth?: string;
  alignSelf?: "auto" | "start" | "center" | "end" | "stretch";
};

export type BlockMeta = {
  animation?: AnimationConfig;
  customCSS?: string;
  spacing?: SpacingConfig;
  anchorId?: string;
};

// ─── Block union ─────────────────────────────────────────────────────────────

export type BlockType =
  | "hero" | "cta" | "features" | "bio-cards" | "slideshow" | "pricing"
  | "testimonials" | "faq" | "stats" | "logo-cloud" | "text" | "image" | "spacer"
  | "heading" | "columns" | "divider" | "row" | "card" | "alert" | "social-buttons"
  | "navbar" | "newsletter" | "contact" | "button" | "section" | "icon" | "list"
  // Sprint 4: Animated Wave 1
  | "animated-hero" | "animated-text" | "bento-grid" | "animated-cards"
  | "marquee" | "logo-marquee" | "animated-counter" | "card-grid"
  // Sprint 5: Animated Wave 2
  | "gradient-section" | "grid-background" | "parallax-scroll" | "feature-showcase"
  | "timeline" | "tabs-content" | "accordion" | "image-comparison"
  | "cta-banner" | "floating-dock" | "social-connect"
  | "team-social" | "footer-social" | "social-proof-feed";

export type Block =
  | { id: string; type: "hero"; props: HeroBlockProps; meta?: BlockMeta }
  | { id: string; type: "cta"; props: CtaBlockProps; meta?: BlockMeta }
  | { id: string; type: "features"; props: FeaturesBlockProps; meta?: BlockMeta }
  | { id: string; type: "bio-cards"; props: BioCardsBlockProps; meta?: BlockMeta }
  | { id: string; type: "slideshow"; props: SlideshowBlockProps; meta?: BlockMeta }
  | { id: string; type: "pricing"; props: PricingBlockProps; meta?: BlockMeta }
  | { id: string; type: "testimonials"; props: TestimonialsBlockProps; meta?: BlockMeta }
  | { id: string; type: "faq"; props: FaqBlockProps; meta?: BlockMeta }
  | { id: string; type: "stats"; props: StatsBlockProps; meta?: BlockMeta }
  | { id: string; type: "logo-cloud"; props: LogoCloudBlockProps; meta?: BlockMeta }
  | { id: string; type: "text"; props: TextBlockProps; meta?: BlockMeta }
  | { id: string; type: "image"; props: ImageBlockProps; meta?: BlockMeta }
  | { id: string; type: "spacer"; props: SpacerBlockProps; meta?: BlockMeta }
  | { id: string; type: "heading"; props: HeadingBlockProps; meta?: BlockMeta }
  | { id: string; type: "columns"; props: ColumnsBlockProps; meta?: BlockMeta }
  | { id: string; type: "row"; props: RowBlockProps; meta?: BlockMeta }
  | { id: string; type: "card"; props: CardBlockProps; meta?: BlockMeta }
  | { id: string; type: "alert"; props: AlertBlockProps; meta?: BlockMeta }
  | { id: string; type: "divider"; props: DividerBlockProps; meta?: BlockMeta }
  | { id: string; type: "social-buttons"; props: SocialButtonsBlockProps; meta?: BlockMeta }
  | { id: string; type: "navbar"; props: NavbarBlockProps; meta?: BlockMeta }
  | { id: string; type: "newsletter"; props: NewsletterBlockProps; meta?: BlockMeta }
  | { id: string; type: "contact"; props: ContactBlockProps; meta?: BlockMeta }
  | { id: string; type: "button"; props: ButtonBlockProps; meta?: BlockMeta }
  | { id: string; type: "section"; props: SectionBlockProps; meta?: BlockMeta }
  | { id: string; type: "icon"; props: IconBlockProps; meta?: BlockMeta }
  | { id: string; type: "list"; props: ListBlockProps; meta?: BlockMeta }
  // Sprint 4: Animated Wave 1
  | { id: string; type: "animated-hero"; props: AnimatedHeroBlockProps; meta?: BlockMeta }
  | { id: string; type: "animated-text"; props: AnimatedTextBlockProps; meta?: BlockMeta }
  | { id: string; type: "bento-grid"; props: BentoGridBlockProps; meta?: BlockMeta }
  | { id: string; type: "animated-cards"; props: AnimatedCardsBlockProps; meta?: BlockMeta }
  | { id: string; type: "marquee"; props: MarqueeBlockProps; meta?: BlockMeta }
  | { id: string; type: "logo-marquee"; props: LogoMarqueeBlockProps; meta?: BlockMeta }
  | { id: string; type: "animated-counter"; props: AnimatedCounterBlockProps; meta?: BlockMeta }
  | { id: string; type: "card-grid"; props: CardGridBlockProps; meta?: BlockMeta }
  // Sprint 5: Animated Wave 2
  | { id: string; type: "gradient-section"; props: GradientSectionBlockProps; meta?: BlockMeta }
  | { id: string; type: "grid-background"; props: GridBackgroundBlockProps; meta?: BlockMeta }
  | { id: string; type: "parallax-scroll"; props: ParallaxScrollBlockProps; meta?: BlockMeta }
  | { id: string; type: "feature-showcase"; props: FeatureShowcaseBlockProps; meta?: BlockMeta }
  | { id: string; type: "timeline"; props: TimelineBlockProps; meta?: BlockMeta }
  | { id: string; type: "tabs-content"; props: TabsContentBlockProps; meta?: BlockMeta }
  | { id: string; type: "accordion"; props: AccordionBlockProps; meta?: BlockMeta }
  | { id: string; type: "image-comparison"; props: ImageComparisonBlockProps; meta?: BlockMeta }
  | { id: string; type: "cta-banner"; props: CtaBannerBlockProps; meta?: BlockMeta }
  | { id: string; type: "floating-dock"; props: FloatingDockBlockProps; meta?: BlockMeta }
  | { id: string; type: "social-connect"; props: SocialConnectBlockProps; meta?: BlockMeta }
  | { id: string; type: "team-social"; props: TeamSocialBlockProps; meta?: BlockMeta }
  | { id: string; type: "footer-social"; props: FooterSocialBlockProps; meta?: BlockMeta }
  | { id: string; type: "social-proof-feed"; props: SocialProofFeedBlockProps; meta?: BlockMeta };


// ─── Registry ────────────────────────────────────────────────────────────────

export type BlockCategory = "Layout" | "Content" | "Basic" | "Navigation" | "Animated" | "Showcase" | "Interactive";

export type BlockRegistryEntry = {
  type: BlockType;
  label: string;
  category: BlockCategory;
  Icon: LucideIcon;
  defaultProps: Block["props"];
};

export const BLOCK_REGISTRY: BlockRegistryEntry[] = [
  {
    type: "navbar",
    label: "Navbar",
    category: "Navigation",
    Icon: Navigation,
    defaultProps: {
      logoText: "Brand",
      logoHref: "/",
      links: [{ label: "Features", href: "#features" }, { label: "Pricing", href: "#pricing" }],
      ctaLabel: "Get Started",
      ctaHref: "#",
      style: "light",
      sticky: false,
    } as NavbarBlockProps,
  },
  {
    type: "hero",
    label: "Hero",
    category: "Layout",
    Icon: Sparkles,
    defaultProps: {
      heading: "Build Something Amazing",
      subheading: "The platform for modern teams",
      description: "Start building your next great idea with our powerful tools and intuitive interface.",
      primaryCta: { label: "Get Started", href: "#" },
      secondaryCta: { label: "Learn More", href: "#" },
      badgeText: "New",
      backgroundType: "color",
      backgroundColor: "#0f172a",
      backgroundImage: "",
      backgroundVideo: "",
      backgroundOpacity: 50,
      align: "center",
      textColor: "light",
    } as HeroBlockProps,
  },
  {
    type: "cta",
    label: "Call to Action",
    category: "Layout",
    Icon: Megaphone,
    defaultProps: {
      heading: "Ready to get started?",
      description: "Join thousands of teams already using our platform.",
      primaryCta: { label: "Start Free Trial", href: "#" },
      secondaryCta: { label: "Contact Sales", href: "#" },
      backgroundColor: "#2563eb",
      textColor: "light",
    } as CtaBlockProps,
  },
  {
    type: "features",
    label: "Features",
    category: "Content",
    Icon: LayoutGrid,
    defaultProps: {
      heading: "Everything you need",
      subheading: "Powerful features for modern teams",
      columns: 3,
      items: [
        { icon: "Zap", title: "Fast", description: "Built for speed and performance." },
        { icon: "Lock", title: "Secure", description: "Enterprise-grade security out of the box." },
        { icon: "BarChart3", title: "Analytics", description: "Deep insights into your data." },
      ],
    } as FeaturesBlockProps,
  },
  {
    type: "bio-cards",
    label: "Team Cards",
    category: "Content",
    Icon: Users,
    defaultProps: {
      heading: "Meet the Team",
      subheading: "The people behind the product",
      items: [
        { name: "Jane Smith", role: "CEO", bio: "Passionate about building great products.", avatar: "", linkedin: "", twitter: "" },
      ],
    } as BioCardsBlockProps,
  },
  {
    type: "slideshow",
    label: "Slideshow",
    category: "Content",
    Icon: GalleryHorizontal,
    defaultProps: {
      heading: "Our Work",
      subheading: "Browse our latest projects",
      items: [
        { title: "Project One", description: "A wonderful project.", image: "", badge: "Featured", cta: { label: "View", href: "#" } },
      ],
    } as SlideshowBlockProps,
  },
  {
    type: "pricing",
    label: "Pricing",
    category: "Content",
    Icon: BadgeDollarSign,
    defaultProps: {
      heading: "Simple, transparent pricing",
      subheading: "No hidden fees. Cancel anytime.",
      tiers: [
        { name: "Starter", price: "$9", period: "/mo", description: "For small teams", features: ["5 projects", "10GB storage"], cta: { label: "Get Started", href: "#" }, highlighted: false },
        { name: "Pro", price: "$29", period: "/mo", description: "For growing teams", features: ["Unlimited projects", "100GB storage", "Priority support"], cta: { label: "Get Started", href: "#" }, highlighted: true },
      ],
    } as PricingBlockProps,
  },
  {
    type: "testimonials",
    label: "Testimonials",
    category: "Content",
    Icon: MessageSquare,
    defaultProps: {
      heading: "What our customers say",
      items: [
        { quote: "This product changed how we work. Highly recommend!", name: "Alex Johnson", role: "CTO", company: "Acme Corp", avatar: "" },
      ],
    } as TestimonialsBlockProps,
  },
  {
    type: "faq",
    label: "FAQ",
    category: "Content",
    Icon: CircleHelp,
    defaultProps: {
      heading: "Frequently Asked Questions",
      items: [
        { question: "What is this product?", answer: "It's a powerful tool to help you build better." },
        { question: "How do I get started?", answer: "Sign up for free and follow the onboarding guide." },
      ],
    } as FaqBlockProps,
  },
  {
    type: "stats",
    label: "Stats",
    category: "Content",
    Icon: BarChart3,
    defaultProps: {
      heading: "By the numbers",
      items: [
        { value: "10K+", label: "Users", description: "Active monthly users" },
        { value: "99.9%", label: "Uptime", description: "Guaranteed SLA" },
        { value: "24/7", label: "Support", description: "Always available" },
      ],
    } as StatsBlockProps,
  },
  {
    type: "logo-cloud",
    label: "Logo Cloud",
    category: "Content",
    Icon: Building2,
    defaultProps: {
      heading: "Trusted by",
      subheading: "Companies of all sizes",
      logos: [{ name: "Acme", url: "" }, { name: "Globex", url: "" }],
    } as LogoCloudBlockProps,
  },
  {
    type: "newsletter",
    label: "Newsletter",
    category: "Content",
    Icon: Mail,
    defaultProps: {
      heading: "Stay in the loop",
      description: "Get the latest updates, articles and resources delivered to your inbox.",
      placeholder: "Enter your email",
      buttonLabel: "Subscribe",
      collectName: false,
      backgroundColor: "#2563eb",
      textColor: "light",
      align: "center",
    } as NewsletterBlockProps,
  },
  {
    type: "contact",
    label: "Contact",
    category: "Content",
    Icon: PhoneCall,
    defaultProps: {
      heading: "Get in touch",
      subheading: "We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
      email: "hello@example.com",
      phone: "+1 (555) 000-0000",
      address: "123 Main St, San Francisco, CA 94105",
      showForm: true,
      formSource: "native",
      formSlug: "",
      iframeUrl: "",
      submitLabel: "Send Message",
      backgroundColor: "",
    } as ContactBlockProps,
  },
  {
    type: "heading",
    label: "Heading",
    category: "Basic",
    Icon: Heading1,
    defaultProps: {
      text: "Section Heading",
      level: "h2",
      align: "left",
      color: "",
    } as HeadingBlockProps,
  },
  {
    type: "text",
    label: "Text",
    category: "Basic",
    Icon: Type,
    defaultProps: {
      content: "<p>Add your text content here.</p>",
      align: "left",
    } as TextBlockProps,
  },
  {
    type: "columns",
    label: "Columns",
    category: "Basic",
    Icon: Columns2,
    defaultProps: {
      columns: [
        { id: "col-1", width: "1/2", content: "<p>First column content goes here.</p>", blocks: [] },
        { id: "col-2", width: "1/2", content: "<p>Second column content goes here.</p>", blocks: [] },
      ],
      gap: "md",
      paddingY: "md",
      bgColor: "",
    } as ColumnsBlockProps,
  },
  {
    type: "row",
    label: "Row Container",
    category: "Basic",
    Icon: SplitSquareHorizontal,
    defaultProps: {
      columns: [
        { id: "col-1", width: "1/2", mobileWidth: "full", padding: "sm", bgColor: "", borderRadius: "none", blocks: [] },
        { id: "col-2", width: "1/2", mobileWidth: "full", padding: "sm", bgColor: "", borderRadius: "none", blocks: [] },
      ],
      gap: "md",
      alignItems: "start",
      justifyContent: "start",
      paddingY: "md",
      paddingX: "md",
      backgroundColor: "",
      borderRadius: "none",
      border: false,
      borderColor: "#e5e7eb",
      shadow: "none",
      maxWidth: "full",
      flexDirection: "row",
      blocks: [],
    } as RowBlockProps,
  },
  {
    type: "card",
    label: "Card Container",
    category: "Basic",
    Icon: SquareStack,
    defaultProps: {
      title: "Card Title",
      subtitle: "Card Subtitle",
      image: "",
      backgroundColor: "#ffffff",
      borderColor: "#e5e7eb",
      borderRadius: "md",
      padding: "md",
      shadow: "sm",
      blocks: [],
    } as CardBlockProps,
  },
  {
    type: "alert",
    label: "Alert Box",
    category: "Basic",
    Icon: CircleHelp,
    defaultProps: {
      type: "info",
      title: "Important Information",
      icon: true,
      variant: "solid",
      blocks: [],
    } as AlertBlockProps,
  },
  {
    type: "image",
    label: "Image",
    category: "Basic",
    Icon: ImageIcon,
    defaultProps: {
      src: "",
      alt: "",
      width: "contained",
      caption: "",
    } as ImageBlockProps,
  },
  {
    type: "divider",
    label: "Divider",
    category: "Basic",
    Icon: Minus,
    defaultProps: {
      style: "solid",
      color: "#e5e7eb",
      paddingY: 16,
    } as DividerBlockProps,
  },
  {
    type: "section",
    label: "Section",
    category: "Basic",
    Icon: PanelTop,
    defaultProps: {
      backgroundColor: "",
      backgroundImage: "",
      backgroundOpacity: 100,
      paddingY: "lg",
      paddingX: "md",
      maxWidth: "xl",
      align: "left",
      textColor: "auto",
      blocks: [],
    } as SectionBlockProps,
  },
  {
    type: "icon",
    label: "Icon",
    category: "Basic",
    Icon: Star,
    defaultProps: {
      icon: "sparkles",
      size: "md",
      color: "",
      align: "left",
    } as IconBlockProps,
  },
  {
    type: "list",
    label: "List",
    category: "Basic",
    Icon: List,
    defaultProps: {
      items: ["First item", "Second item", "Third item"],
      ordered: false,
      marker: "check",
      iconColor: "",
      align: "left",
    } as ListBlockProps,
  },
  {
    type: "spacer",
    label: "Spacer",
    category: "Basic",
    Icon: SeparatorHorizontal,
    defaultProps: {
      height: 48,
    } as SpacerBlockProps,
  },
  {
    type: "button",
    label: "Custom Button",
    category: "Basic",
    Icon: MousePointerClick,
    defaultProps: {
      label: "Click Here",
      href: "#",
      variant: "solid",
      align: "center",
      size: "md",
      color: "#2563eb",
      textColor: "#ffffff",
      borderRadius: "md",
      icon: "",
      emoji: "",
      iconPosition: "left",
    } as ButtonBlockProps,
  },
  {
    type: "social-buttons",
    label: "Social Buttons",
    category: "Basic",
    Icon: Share2,
    defaultProps: {
      items: [
        { id: "soc-btn-1", platform: "Google", label: "Google", href: "https://google.com", icon: "Google", color: "#4285F4" },
        { id: "soc-btn-2", platform: "Facebook", label: "Facebook", href: "https://facebook.com", icon: "Facebook", color: "#1877F2" },
        { id: "soc-btn-3", platform: "Instagram", label: "Instagram", href: "https://instagram.com", icon: "Instagram", color: "#E4405F" },
        { id: "soc-btn-4", platform: "X", label: "X (Twitter)", href: "https://x.com", icon: "X", color: "#000000" },
      ],
      layout: "row",
      buttonStyle: "solid",
      align: "center",
      size: "md",
    } as SocialButtonsBlockProps,
  },
  // ─── Animated Wave 1 ─────────────────────────────────────────────────────
  {
    type: "animated-hero",
    label: "Animated Hero",
    category: "Animated",
    Icon: Wand2,
    defaultProps: {
      heading: "Build the Future",
      subheading: "With cutting-edge technology",
      spotlightColor: "#3b82f6",
      animationType: "spotlight",
      gradientColors: ["#3b82f6", "#8b5cf6", "#ec4899"],
      primaryCta: { label: "Get Started", href: "#" },
      secondaryCta: { label: "Learn More", href: "#" },
    } as AnimatedHeroBlockProps,
  },
  {
    type: "animated-text",
    label: "Animated Text",
    category: "Animated",
    Icon: TextCursorInput,
    defaultProps: {
      text: "Transform your ideas into reality",
      animation: "typewriter",
      speed: 50,
      gradientColors: ["#3b82f6", "#8b5cf6"],
      align: "center",
    } as AnimatedTextBlockProps,
  },
  {
    type: "bento-grid",
    label: "Bento Grid",
    category: "Animated",
    Icon: Grid3x3,
    defaultProps: {
      items: [
        { colSpan: 2, rowSpan: 1, title: "Feature One", description: "A powerful feature", icon: "Zap", image: "" },
        { colSpan: 1, rowSpan: 1, title: "Feature Two", description: "Another great feature", icon: "Shield", image: "" },
        { colSpan: 1, rowSpan: 1, title: "Feature Three", description: "Even more to love", icon: "Star", image: "" },
        { colSpan: 1, rowSpan: 1, title: "Feature Four", description: "The best one yet", icon: "Rocket", image: "" },
      ],
      gridCols: 3,
    } as BentoGridBlockProps,
  },
  {
    type: "animated-cards",
    label: "Animated Cards",
    category: "Animated",
    Icon: Layers,
    defaultProps: {
      items: [
        { title: "Card One", description: "Hover for 3D effect", image: "", link: "#" },
        { title: "Card Two", description: "Interactive cards", image: "", link: "#" },
        { title: "Card Three", description: "Beautiful animations", image: "", link: "#" },
      ],
      cardStyle: "3d-tilt",
    } as AnimatedCardsBlockProps,
  },
  {
    type: "marquee",
    label: "Marquee",
    category: "Animated",
    Icon: ArrowRightLeft,
    defaultProps: {
      items: [
        { image: "", text: "Item One" },
        { image: "", text: "Item Two" },
        { image: "", text: "Item Three" },
        { image: "", text: "Item Four" },
      ],
      speed: 30,
      direction: "left",
      pauseOnHover: true,
    } as MarqueeBlockProps,
  },
  {
    type: "logo-marquee",
    label: "Logo Marquee",
    category: "Animated",
    Icon: Building2,
    defaultProps: {
      heading: "Trusted by leading companies",
      logos: [{ name: "Acme", url: "" }, { name: "Globex", url: "" }, { name: "Initech", url: "" }, { name: "Umbrella", url: "" }],
      speed: 30,
      rows: 1,
      direction: "left",
      grayscale: true,
    } as LogoMarqueeBlockProps,
  },
  {
    type: "animated-counter",
    label: "Animated Counter",
    category: "Animated",
    Icon: Hash,
    defaultProps: {
      items: [
        { value: 10000, label: "Users", prefix: "", suffix: "+" },
        { value: 99.9, label: "Uptime", prefix: "", suffix: "%" },
        { value: 500, label: "Projects", prefix: "", suffix: "+" },
      ],
      duration: 2,
      triggerOnView: true,
    } as AnimatedCounterBlockProps,
  },
  {
    type: "card-grid",
    label: "Card Grid",
    category: "Animated",
    Icon: LayoutDashboard,
    defaultProps: {
      items: [
        { title: "Card One", description: "Description for card one", image: "", link: "#", badge: "New" },
        { title: "Card Two", description: "Description for card two", image: "", link: "#", badge: "" },
        { title: "Card Three", description: "Description for card three", image: "", link: "#", badge: "" },
      ],
      columns: 3,
      cardStyle: "default",
      hoverEffect: "lift",
    } as CardGridBlockProps,
  },
  // ─── Animated Wave 2 / Showcase / Interactive ────────────────────────────
  {
    type: "gradient-section",
    label: "Gradient Section",
    category: "Animated",
    Icon: Palette,
    defaultProps: {
      heading: "Something amazing is coming",
      description: "Stay tuned for our next big release",
      cta: { label: "Join Waitlist", href: "#" },
      animation: "aurora",
      colors: ["#3b82f6", "#8b5cf6", "#ec4899"],
    } as GradientSectionBlockProps,
  },
  {
    type: "grid-background",
    label: "Grid Background",
    category: "Animated",
    Icon: Grip,
    defaultProps: {
      heading: "Built for developers",
      description: "A powerful platform for building modern applications",
      cta: { label: "Get Started", href: "#" },
      pattern: "grid",
      patternColor: "#e5e7eb",
      opacity: 40,
    } as GridBackgroundBlockProps,
  },
  {
    type: "parallax-scroll",
    label: "Parallax Scroll",
    category: "Showcase",
    Icon: Scroll,
    defaultProps: {
      items: [
        { image: "", title: "Step One", description: "Begin your journey" },
        { image: "", title: "Step Two", description: "Build something great" },
        { image: "", title: "Step Three", description: "Ship to the world" },
      ],
      intensity: 50,
    } as ParallaxScrollBlockProps,
  },
  {
    type: "feature-showcase",
    label: "Feature Showcase",
    category: "Showcase",
    Icon: PanelTop,
    defaultProps: {
      items: [
        { title: "Powerful Analytics", description: "Get deep insights into your data with real-time dashboards.", image: "" },
        { title: "Team Collaboration", description: "Work together seamlessly with built-in collaboration tools.", image: "" },
        { title: "Enterprise Security", description: "Bank-grade security to keep your data safe.", image: "" },
      ],
      stickyPosition: "left",
    } as FeatureShowcaseBlockProps,
  },
  {
    type: "timeline",
    label: "Timeline",
    category: "Showcase",
    Icon: Milestone,
    defaultProps: {
      heading: "Our Journey",
      items: [
        { date: "2024 Q1", title: "Founded", description: "Started with a vision", image: "" },
        { date: "2024 Q2", title: "Launch", description: "Released our first product", image: "" },
        { date: "2024 Q3", title: "Growth", description: "Reached 10,000 users", image: "" },
      ],
      lineColor: "#3b82f6",
    } as TimelineBlockProps,
  },
  {
    type: "tabs-content",
    label: "Tabs Content",
    category: "Showcase",
    Icon: SquareStack,
    defaultProps: {
      items: [
        { tabLabel: "Features", content: "<p>Discover powerful features built for modern teams.</p>", image: "" },
        { tabLabel: "Pricing", content: "<p>Simple, transparent pricing with no hidden fees.</p>", image: "" },
        { tabLabel: "FAQ", content: "<p>Find answers to common questions.</p>", image: "" },
      ],
      tabStyle: "underline",
    } as TabsContentBlockProps,
  },
  {
    type: "accordion",
    label: "Accordion",
    category: "Showcase",
    Icon: ChevronsUpDown,
    defaultProps: {
      heading: "Frequently Asked Questions",
      items: [
        { question: "What is this product?", answer: "A powerful platform for building modern applications." },
        { question: "How do I get started?", answer: "Sign up for a free account and follow our quick start guide." },
        { question: "Is there a free plan?", answer: "Yes, we offer a generous free tier for small projects." },
      ],
      allowMultiple: false,
      iconStyle: "chevron",
    } as AccordionBlockProps,
  },
  {
    type: "image-comparison",
    label: "Image Comparison",
    category: "Showcase",
    Icon: SplitSquareHorizontal,
    defaultProps: {
      beforeImage: "",
      afterImage: "",
      beforeLabel: "Before",
      afterLabel: "After",
      orientation: "horizontal",
    } as ImageComparisonBlockProps,
  },
  {
    type: "cta-banner",
    label: "CTA Banner",
    category: "Interactive",
    Icon: Megaphone,
    defaultProps: {
      heading: "Ready to transform your workflow?",
      description: "Join thousands of teams who have already made the switch.",
      buttonText: "Get Started Free",
      buttonHref: "#",
      buttonStyle: "shimmer",
    } as CtaBannerBlockProps,
  },
  {
    type: "floating-dock",
    label: "Floating Dock",
    category: "Interactive",
    Icon: Anchor,
    defaultProps: {
      items: [
        { icon: "Home", label: "Home", href: "/" },
        { icon: "Search", label: "Search", href: "#search" },
        { icon: "Mail", label: "Contact", href: "#contact" },
        { icon: "Settings", label: "Settings", href: "#settings" },
      ],
      position: "bottom",
      magnification: true,
    } as FloatingDockBlockProps,
  },
  {
    type: "social-connect",
    label: "Social Connect",
    category: "Interactive",
    Icon: Share2,
    defaultProps: {
      heading: "Connect With Us",
      subheading: "Follow us across our social media channels for the latest updates and discussions.",
      items: [
        { id: "soc-1", platform: "Google", label: "Google", href: "https://google.com", icon: "Google", color: "#4285F4" },
        { id: "soc-2", platform: "Facebook", label: "Facebook", href: "https://facebook.com", icon: "Facebook", color: "#1877F2" },
        { id: "soc-3", platform: "Instagram", label: "Instagram", href: "https://instagram.com", icon: "Instagram", color: "#E4405F" },
        { id: "soc-4", platform: "X", label: "X (Twitter)", href: "https://x.com", icon: "X", color: "#000000" },
        { id: "soc-5", platform: "GitHub", label: "GitHub", href: "https://github.com", icon: "GitHub", color: "#333333" },
      ],
      layout: "grid",
      buttonStyle: "glass",
      align: "center",
    } as SocialConnectBlockProps,
  },
  {
    type: "team-social",
    label: "Team Social",
    category: "Interactive",
    Icon: Users,
    defaultProps: {
      heading: "Meet Our Team",
      subheading: "The dedicated leadership behind our mission, connect with them directly.",
      layout: "cards",
      members: [
        {
          id: "mem-1",
          name: "Sarah Jenkins",
          role: "Chief Executive Officer",
          bio: "Former VP of Product at major tech giants. Passionate about decentralized web technologies.",
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
          socials: [
            { id: "s-1", platform: "LinkedIn", href: "https://linkedin.com", icon: "Linkedin", color: "#0A66C2" },
            { id: "s-2", platform: "X", href: "https://x.com", icon: "X", color: "#000000" },
          ],
        },
        {
          id: "mem-2",
          name: "David Chen",
          role: "Chief Technology Officer",
          bio: "Open source contributor and AI researcher. Leading our advanced engineering division.",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
          socials: [
            { id: "s-3", platform: "GitHub", href: "https://github.com", icon: "GitHub", color: "#333333" },
            { id: "s-4", platform: "X", href: "https://x.com", icon: "X", color: "#000000" },
          ],
        },
        {
          id: "mem-3",
          name: "Elena Rostova",
          role: "Head of Design",
          bio: "Award-winning creative director specializing in premium, dynamic user experiences.",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          socials: [
            { id: "s-5", platform: "Instagram", href: "https://instagram.com", icon: "Instagram", color: "#E4405F" },
            { id: "s-6", platform: "LinkedIn", href: "https://linkedin.com", icon: "Linkedin", color: "#0A66C2" },
          ],
        },
      ],
    } as TeamSocialBlockProps,
  },
  {
    type: "footer-social",
    label: "Footer Social Dock",
    category: "Interactive",
    Icon: PanelTop,
    defaultProps: {
      brandName: "OpenWeb",
      tagline: "Empowering the next generation of dynamic, beautiful web applications.",
      copyright: "© 2026 OpenWeb Network. All rights reserved.",
      socials: [
        { id: "fs-1", platform: "Discord", label: "Discord", href: "https://discord.com", icon: "Discord", color: "#5865F2", badge: "12k Online" },
        { id: "fs-2", platform: "X", label: "X (Twitter)", href: "https://x.com", icon: "X", color: "#000000", badge: "Follow" },
        { id: "fs-3", platform: "GitHub", label: "GitHub", href: "https://github.com", icon: "GitHub", color: "#333333", badge: "Star" },
        { id: "fs-4", platform: "YouTube", label: "YouTube", href: "https://youtube.com", icon: "Youtube", color: "#FF0000", badge: "Subscribe" },
      ],
      newsletterHeading: "Subscribe to our Newsletter",
      newsletterPlaceholder: "Enter your email address",
      newsletterButtonText: "Subscribe",
    } as FooterSocialBlockProps,
  },
  {
    type: "social-proof-feed",
    label: "Social Proof Feed",
    category: "Interactive",
    Icon: MessageSquare,
    defaultProps: {
      heading: "Loved by Builders Worldwide",
      subheading: "See what our community is saying across social media platforms.",
      mainCta: { label: "Join the Conversation on X", href: "https://x.com", icon: "X", iconPosition: "left" },
      layout: "masonry",
      feed: [
        {
          id: "spf-1",
          authorName: "Alex Rivera",
          authorHandle: "@alexrivera_dev",
          authorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
          content: "OpenWeb CMS is an absolute game-changer. The glassmorphic social connect blocks are beautiful right out of the box! 🚀",
          platform: "X",
          icon: "X",
          date: "2 hours ago",
          rating: 5,
        },
        {
          id: "spf-2",
          authorName: "Marcus Vance",
          authorHandle: "marcus-vance",
          authorAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80",
          content: "We deployed our new agency portfolio using OpenWeb's Team Social blocks and our conversion rate jumped 40%. Incredible work.",
          platform: "LinkedIn",
          icon: "Linkedin",
          date: "1 day ago",
          rating: 5,
        },
        {
          id: "spf-3",
          authorName: "Sophia Martinez",
          authorHandle: "@sophiam_codes",
          authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
          content: "The level of polish in the footer social dock and newsletter integration is unmatched. Highly recommended for any serious SaaS.",
          platform: "X",
          icon: "X",
          date: "3 days ago",
          rating: 5,
        },
      ],
    } as SocialProofFeedBlockProps,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function defaultBlock(type: BlockType): Block {
  const entry = BLOCK_REGISTRY.find((r) => r.type === type)!;
  return { id: crypto.randomUUID(), type, props: structuredClone(entry.defaultProps) } as Block;
}

export function validateBlocksRequireNativeForms(blocks: Block[]): string[] {
  const errors: string[] = [];
  blocks.forEach((block, index) => {
    if (block.type === "contact") {
      const formSlug = block.props.formSlug?.trim();
      if (!formSlug) {
        errors.push(`Contact block at position ${index + 1} must be linked to a native form.`);
      }
    }
  });
  return errors;
}
