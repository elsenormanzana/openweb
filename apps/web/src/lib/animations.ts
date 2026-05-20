export type EntranceAnimation =
  | "fade-up"
  | "fade-in"
  | "slide-left"
  | "slide-right"
  | "scale"
  | "blur"
  | "flip-up"
  | "flip-down"
  | "rotate-in"
  | "none";

export type EasingType = "easeOut" | "easeInOut" | "linear" | "backOut";

export type AnimationConfig = {
  entrance: EntranceAnimation;
  duration: number;    // seconds, e.g. 0.5
  delay: number;       // seconds
  stagger: number;     // seconds between child items
  easing: EasingType;  // animation curve
  triggerOnView: boolean;
  once: boolean;       // only animate once (don't re-trigger)
};

export const DEFAULT_ANIMATION: AnimationConfig = {
  entrance: "none",
  duration: 0.6,
  delay: 0,
  stagger: 0.1,
  easing: "easeOut",
  triggerOnView: true,
  once: true,
};

export const ENTRANCE_OPTIONS: { value: EntranceAnimation; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fade-up", label: "Fade Up" },
  { value: "fade-in", label: "Fade In" },
  { value: "slide-left", label: "Slide from Left" },
  { value: "slide-right", label: "Slide from Right" },
  { value: "scale", label: "Scale Up" },
  { value: "blur", label: "Blur In" },
  { value: "flip-up", label: "Flip Up" },
  { value: "flip-down", label: "Flip Down" },
  { value: "rotate-in", label: "Rotate In" },
];

export const EASING_OPTIONS: { value: EasingType; label: string }[] = [
  { value: "easeOut", label: "Ease Out" },
  { value: "easeInOut", label: "Ease In Out" },
  { value: "linear", label: "Linear" },
  { value: "backOut", label: "Back Out (Bouncy)" },
];

export function getAnimationVariants(entrance: EntranceAnimation) {
  switch (entrance) {
    case "fade-up":
      return {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0 },
      };
    case "fade-in":
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      };
    case "slide-left":
      return {
        hidden: { opacity: 0, x: -60 },
        visible: { opacity: 1, x: 0 },
      };
    case "slide-right":
      return {
        hidden: { opacity: 0, x: 60 },
        visible: { opacity: 1, x: 0 },
      };
    case "scale":
      return {
        hidden: { opacity: 0, scale: 0.85 },
        visible: { opacity: 1, scale: 1 },
      };
    case "blur":
      return {
        hidden: { opacity: 0, filter: "blur(10px)" },
        visible: { opacity: 1, filter: "blur(0px)" },
      };
    case "flip-up":
      return {
        hidden: { opacity: 0, rotateX: -90, perspective: 1000 },
        visible: { opacity: 1, rotateX: 0, perspective: 1000 },
      };
    case "flip-down":
      return {
        hidden: { opacity: 0, rotateX: 90, perspective: 1000 },
        visible: { opacity: 1, rotateX: 0, perspective: 1000 },
      };
    case "rotate-in":
      return {
        hidden: { opacity: 0, rotate: -15, scale: 0.95 },
        visible: { opacity: 1, rotate: 0, scale: 1 },
      };
    case "none":
    default:
      return {
        hidden: {},
        visible: {},
      };
  }
}

export function getEasing(easing: EasingType): any {
  switch (easing) {
    case "backOut": return [0.34, 1.56, 0.64, 1];
    case "easeInOut": return "easeInOut";
    case "linear": return "linear";
    case "easeOut":
    default:
      return "easeOut";
  }
}
