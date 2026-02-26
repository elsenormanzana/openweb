import type { LucideIcon } from "lucide-react";
import {
  Sparkles, Megaphone, LayoutGrid, Users, GalleryHorizontal,
  BadgeDollarSign, MessageSquare, CircleHelp, BarChart3, Building2,
  Type, ImageIcon, SeparatorHorizontal, Heading1, Columns2, Minus,
  Navigation, Mail, PhoneCall,
  Zap, Shield, Star, Globe, Heart, Clock, Settings, Check,
  Award, Code2, Smartphone, Database, Cloud, Rocket, Lock,
} from "lucide-react";

// Icons available for the Features block icon picker
export const FEATURE_ICON_MAP = {
  Zap, Lock, Shield, BarChart3, Star, Globe, Heart, Clock, Users,
  Settings, Check, Award, Code2, Smartphone, Database, Cloud, Rocket,
  Sparkles, Mail,
} as const;
export type FeatureIconName = keyof typeof FEATURE_ICON_MAP;

// ─── Block prop types ────────────────────────────────────────────────────────

export type CtaButton = { label: string; href: string };

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

export type SpacerBlockProps = {
  height: 16 | 32 | 48 | 64 | 96 | 128;
};

export type HeadingBlockProps = {
  text: string;
  level: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  align: "left" | "center" | "right";
  color: string;
};

export type ColumnItem = { content: string };
export type ColumnsBlockProps = {
  columns: ColumnItem[];
  gap: "sm" | "md" | "lg";
  paddingY: "sm" | "md" | "lg";
  bgColor: string;
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
  formSlug: string;
  submitLabel: string;
  backgroundColor: string;
};

// ─── Block union ─────────────────────────────────────────────────────────────

export type BlockType =
  | "hero" | "cta" | "features" | "bio-cards" | "slideshow" | "pricing"
  | "testimonials" | "faq" | "stats" | "logo-cloud" | "text" | "image" | "spacer"
  | "heading" | "columns" | "divider"
  | "navbar" | "newsletter" | "contact";

export type Block =
  | { id: string; type: "hero"; props: HeroBlockProps }
  | { id: string; type: "cta"; props: CtaBlockProps }
  | { id: string; type: "features"; props: FeaturesBlockProps }
  | { id: string; type: "bio-cards"; props: BioCardsBlockProps }
  | { id: string; type: "slideshow"; props: SlideshowBlockProps }
  | { id: string; type: "pricing"; props: PricingBlockProps }
  | { id: string; type: "testimonials"; props: TestimonialsBlockProps }
  | { id: string; type: "faq"; props: FaqBlockProps }
  | { id: string; type: "stats"; props: StatsBlockProps }
  | { id: string; type: "logo-cloud"; props: LogoCloudBlockProps }
  | { id: string; type: "text"; props: TextBlockProps }
  | { id: string; type: "image"; props: ImageBlockProps }
  | { id: string; type: "spacer"; props: SpacerBlockProps }
  | { id: string; type: "heading"; props: HeadingBlockProps }
  | { id: string; type: "columns"; props: ColumnsBlockProps }
  | { id: string; type: "divider"; props: DividerBlockProps }
  | { id: string; type: "navbar"; props: NavbarBlockProps }
  | { id: string; type: "newsletter"; props: NewsletterBlockProps }
  | { id: string; type: "contact"; props: ContactBlockProps };

// ─── Registry ────────────────────────────────────────────────────────────────

export type BlockCategory = "Layout" | "Content" | "Basic" | "Navigation";

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
      formSlug: "",
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
        { content: "<p>First column content goes here.</p>" },
        { content: "<p>Second column content goes here.</p>" },
      ],
      gap: "md",
      paddingY: "md",
      bgColor: "",
    } as ColumnsBlockProps,
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
    type: "spacer",
    label: "Spacer",
    category: "Basic",
    Icon: SeparatorHorizontal,
    defaultProps: {
      height: 48,
    } as SpacerBlockProps,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function defaultBlock(type: BlockType): Block {
  const entry = BLOCK_REGISTRY.find((r) => r.type === type)!;
  return { id: crypto.randomUUID(), type, props: structuredClone(entry.defaultProps) } as Block;
}

export function parseBlocks(content: string | null): Block[] | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.every((b) => b.id && b.type && b.props !== undefined)) {
      return parsed as Block[];
    }
  } catch {
    // fall through
  }
  return null;
}
