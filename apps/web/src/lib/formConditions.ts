import type { Condition, ConditionRule, FormField, FormSection } from "@/lib/api";

export type FormValues = Record<string, unknown>;

function evaluateRule(rule: ConditionRule, values: FormValues): boolean {
  const raw = values[rule.field];
  const actual = raw == null ? "" : typeof raw === "boolean" ? (raw ? "true" : "false") : String(raw);
  const expected = rule.value ?? "";
  switch (rule.operator) {
    case "equals": return actual === expected;
    case "not_equals": return actual !== expected;
    case "contains": return actual.toLowerCase().includes(expected.toLowerCase());
    case "is_empty": return actual.trim() === "";
    case "is_not_empty": return actual.trim() !== "";
    default: return true;
  }
}

/**
 * True when a field/section with this condition should be visible.
 * Mirrors `evaluateCondition` in apps/api/src/index.ts — keep the two in sync.
 */
export function evaluateCondition(condition: Condition | null | undefined, values: FormValues): boolean {
  if (!condition || condition.rules.length === 0) return true;
  const results = condition.rules.map((r) => evaluateRule(r, values));
  return condition.match === "any" ? results.some(Boolean) : results.every(Boolean);
}

/** Sections currently visible given the entered values. */
export function getVisibleSections(sections: FormSection[], values: FormValues): FormSection[] {
  return sections.filter((s) => evaluateCondition(s.condition, values));
}

/** Visible fields within a section given the entered values. */
export function getVisibleFields(section: FormSection, values: FormValues): FormField[] {
  return section.fields.filter((f) => evaluateCondition(f.condition, values));
}
