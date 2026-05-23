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

/** Sentinel section id meaning "submit the form now" (branching target). */
export const ROUTE_SUBMIT = "__submit__";

/**
 * Resolve where to go after `section`, given the entered values. Precedence:
 *  1. per-option routing on a single-choice question (last one with a matched route wins)
 *  2. the section's `afterSection` routing
 *  3. the next visible section — or ROUTE_SUBMIT when there is none.
 */
export function getBranchTarget(
  section: FormSection,
  sections: FormSection[],
  values: FormValues,
): string {
  for (let i = section.fields.length - 1; i >= 0; i--) {
    const f = section.fields[i];
    if (!f.optionRouting) continue;
    const v = values[f.name];
    if (typeof v === "string" && v && f.optionRouting[v]) return f.optionRouting[v];
  }
  const after = section.afterSection;
  if (after) {
    if (after.kind === "submit") return ROUTE_SUBMIT;
    if (after.kind === "goto" && after.targetSectionId) return after.targetSectionId;
  }
  const visible = getVisibleSections(sections, values);
  const idx = visible.findIndex((s) => s.id === section.id);
  if (idx >= 0 && idx < visible.length - 1) return visible[idx + 1].id;
  return ROUTE_SUBMIT;
}
