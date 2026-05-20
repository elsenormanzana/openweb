import {
  Zap, Lock, Shield, BarChart3, Star, Globe, Heart, Clock, Users,
  Settings, Check, Award, Code2, Smartphone, Database, Cloud, Rocket,
  Sparkles, Mail,
} from "lucide-react";

// Icons available for the Features block icon picker.
// Kept in its own module so public block components (FeaturesBlock,
// BentoGridBlock) can import it without pulling the full BLOCK_REGISTRY.
export const FEATURE_ICON_MAP = {
  Zap, Lock, Shield, BarChart3, Star, Globe, Heart, Clock, Users,
  Settings, Check, Award, Code2, Smartphone, Database, Cloud, Rocket,
  Sparkles, Mail,
} as const;

export type FeatureIconName = keyof typeof FEATURE_ICON_MAP;
