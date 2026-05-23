import {
  AlignLeft, Calendar, ChevronDownSquare, CircleDot, Clock, Grid3x3,
  Hash, LayoutGrid, ListChecks, Mail, SlidersHorizontal, SquareCheck, Star, Type,
  Upload, type LucideIcon,
} from "lucide-react";
import type { FontPreset, FormField, FormFieldType, FormSettings, FormTheme } from "@/lib/api";

/** Short unique id generator for fields/sections. */
export const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export type QuestionCapabilities = {
  /** Uses the `options` array (choice questions). */
  hasOptions: boolean;
  /** Uses `rows`/`columns` (grid questions). */
  hasGrid: boolean;
  /** Single-choice — supports per-option "go to section" branching. */
  canBranch: boolean;
  /** Supports response validation rules. */
  canValidate: boolean;
  /** Can be graded in quiz mode. */
  quizGradable: boolean;
  /** Shows a placeholder input in the editor. */
  hasPlaceholder: boolean;
};

export type QuestionGroup = "Text" | "Choice" | "Scale" | "Advanced";

export type QuestionTypeDef = {
  type: FormFieldType;
  label: string;
  icon: LucideIcon;
  group: QuestionGroup;
  caps: QuestionCapabilities;
  /** Type-specific default props merged into a fresh field. */
  defaults: () => Partial<FormField>;
};

const caps = (over: Partial<QuestionCapabilities>): QuestionCapabilities => ({
  hasOptions: false, hasGrid: false, canBranch: false,
  canValidate: false, quizGradable: false, hasPlaceholder: false, ...over,
});

export const QUESTION_TYPES: Record<FormFieldType, QuestionTypeDef> = {
  text: {
    type: "text", label: "Short answer", icon: Type, group: "Text",
    caps: caps({ canValidate: true, quizGradable: true, hasPlaceholder: true }),
    defaults: () => ({}),
  },
  textarea: {
    type: "textarea", label: "Paragraph", icon: AlignLeft, group: "Text",
    caps: caps({ canValidate: true, quizGradable: true, hasPlaceholder: true }),
    defaults: () => ({}),
  },
  email: {
    type: "email", label: "Email", icon: Mail, group: "Text",
    caps: caps({ canValidate: true, hasPlaceholder: true }),
    defaults: () => ({}),
  },
  number: {
    type: "number", label: "Number", icon: Hash, group: "Text",
    caps: caps({ canValidate: true, quizGradable: true, hasPlaceholder: true }),
    defaults: () => ({}),
  },
  multiple_choice: {
    type: "multiple_choice", label: "Multiple choice", icon: CircleDot, group: "Choice",
    caps: caps({ hasOptions: true, canBranch: true, quizGradable: true }),
    defaults: () => ({ options: ["Option 1"] }),
  },
  checkboxes: {
    type: "checkboxes", label: "Checkboxes", icon: ListChecks, group: "Choice",
    caps: caps({ hasOptions: true, quizGradable: true }),
    defaults: () => ({ options: ["Option 1"] }),
  },
  dropdown: {
    type: "dropdown", label: "Dropdown", icon: ChevronDownSquare, group: "Choice",
    caps: caps({ hasOptions: true, canBranch: true, quizGradable: true, hasPlaceholder: true }),
    defaults: () => ({ options: ["Option 1"] }),
  },
  checkbox: {
    type: "checkbox", label: "Checkbox (yes/no)", icon: SquareCheck, group: "Choice",
    caps: caps({ hasPlaceholder: true }),
    defaults: () => ({}),
  },
  select: {
    // Legacy alias of dropdown — kept for older forms, not in the add menu.
    type: "select", label: "Dropdown", icon: ChevronDownSquare, group: "Choice",
    caps: caps({ hasOptions: true, canBranch: true, quizGradable: true, hasPlaceholder: true }),
    defaults: () => ({ options: ["Option 1"] }),
  },
  date: {
    type: "date", label: "Date", icon: Calendar, group: "Scale",
    caps: caps({ quizGradable: true }),
    defaults: () => ({}),
  },
  time: {
    type: "time", label: "Time", icon: Clock, group: "Scale",
    caps: caps({ quizGradable: true }),
    defaults: () => ({}),
  },
  linear_scale: {
    type: "linear_scale", label: "Linear scale", icon: SlidersHorizontal, group: "Scale",
    caps: caps({ quizGradable: true }),
    defaults: () => ({ scaleMin: 1, scaleMax: 5, scaleMinLabel: "", scaleMaxLabel: "" }),
  },
  rating: {
    type: "rating", label: "Rating", icon: Star, group: "Scale",
    caps: caps({ quizGradable: true }),
    defaults: () => ({ ratingMax: 5, ratingIcon: "star" }),
  },
  file: {
    type: "file", label: "File upload", icon: Upload, group: "Advanced",
    caps: caps({}),
    defaults: () => ({ fileAccept: "", fileMaxMB: 10, fileMaxCount: 1 }),
  },
  grid_multiple_choice: {
    type: "grid_multiple_choice", label: "Multiple choice grid", icon: Grid3x3, group: "Advanced",
    caps: caps({ hasGrid: true, quizGradable: true }),
    defaults: () => ({ rows: ["Row 1"], columns: ["Column 1"] }),
  },
  grid_checkbox: {
    type: "grid_checkbox", label: "Checkbox grid", icon: LayoutGrid, group: "Advanced",
    caps: caps({ hasGrid: true, quizGradable: true }),
    defaults: () => ({ rows: ["Row 1"], columns: ["Column 1"] }),
  },
};

/** Ordered list shown in the "add question" menu (excludes the legacy `select`). */
export const QUESTION_TYPE_LIST: QuestionTypeDef[] = [
  "text", "textarea", "multiple_choice", "checkboxes", "dropdown", "checkbox",
  "number", "date", "time", "linear_scale", "rating", "email",
  "file", "grid_multiple_choice", "grid_checkbox",
].map((t) => QUESTION_TYPES[t as FormFieldType]);

/** Build a fresh field of the given type with sane defaults. */
export function emptyField(type: FormFieldType): FormField {
  const def = QUESTION_TYPES[type] ?? QUESTION_TYPES.text;
  return {
    id: uid("f"),
    name: uid("field"),
    label: def.label,
    type,
    required: false,
    placeholder: "",
    description: "",
    options: [],
    condition: null,
    validation: null,
    points: 0,
    ...def.defaults(),
  };
}

/** Change a field's type, resetting type-specific props to defaults. */
export function retypeField(field: FormField, type: FormFieldType): FormField {
  const def = QUESTION_TYPES[type] ?? QUESTION_TYPES.text;
  return {
    ...field,
    type,
    options: def.caps.hasOptions ? (field.options?.length ? field.options : ["Option 1"]) : [],
    optionRouting: undefined,
    correctAnswers: undefined,
    correctGrid: undefined,
    ...def.defaults(),
  };
}

export const isChoiceType = (t: FormFieldType) => QUESTION_TYPES[t]?.caps.hasOptions ?? false;
export const isGridType = (t: FormFieldType) => QUESTION_TYPES[t]?.caps.hasGrid ?? false;

export const FONT_PRESET_CSS: Record<FontPreset, string> = {
  default: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace',
  rounded: '"Nunito", "Quicksand", "Varela Round", ui-rounded, "Segoe UI", sans-serif',
  playful: '"Comic Sans MS", "Chalkboard SE", "Baloo 2", "Segoe Print", cursive',
};

export const FONT_PRESET_OPTIONS: { value: FontPreset; label: string }[] = [
  { value: "default", label: "Default (sans-serif)" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Monospace" },
  { value: "rounded", label: "Rounded" },
  { value: "playful", label: "Playful" },
];

export function defaultTheme(): FormTheme {
  return {
    headerImage: "",
    themeColor: "#673ab7",
    backgroundColor: "#f0ebf8",
    headerFont: "default",
    questionFont: "default",
    textFont: "default",
  };
}

export function defaultSettings(): FormSettings {
  return {
    acceptingResponses: true,
    closedMessage: "This form is no longer accepting responses.",
    responseLimit: 0,
    isQuiz: false,
    showScoreImmediately: true,
    collectEmail: false,
    showProgressBar: true,
  };
}
