import type { FormField } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * True when a field has no meaningful answer — shape-aware per field type.
 * Mirrors `isFieldValueEmpty` in apps/api/src/index.ts — keep the two in sync.
 */
export function isFieldValueEmpty(field: FormField, value: unknown): boolean {
  switch (field.type) {
    case "checkbox":
      return value !== true && value !== "true";
    case "checkboxes":
    case "file":
      return !Array.isArray(value) || value.length === 0;
    case "grid_multiple_choice":
    case "grid_checkbox": {
      if (!value || typeof value !== "object") return true;
      const v = value as Record<string, unknown>;
      const rows = field.rows ?? [];
      if (rows.length === 0) return true;
      return rows.some((r) => {
        const cell = v[r];
        return field.type === "grid_checkbox"
          ? !Array.isArray(cell) || cell.length === 0
          : typeof cell !== "string" || cell === "";
      });
    }
    default:
      return value == null || value === "";
  }
}

/**
 * Returns an error message, or null when the value is acceptable.
 * Mirrors `validateFieldValue` in apps/api/src/index.ts — keep the two in sync.
 */
export function validateFieldValue(field: FormField, value: unknown): string | null {
  const label = field.label || field.name;
  const empty = isFieldValueEmpty(field, value);
  if (field.required && empty) return `${label} is required`;
  if (empty) return null;
  if (field.type === "email" && typeof value === "string" && !EMAIL_RE.test(value.trim())) {
    return `${label} must be a valid email`;
  }
  if (field.type === "number" && !Number.isFinite(Number(value))) {
    return `${label} must be a number`;
  }
  if (field.type === "file" && Array.isArray(value)) {
    if ((field.fileMaxCount ?? 1) > 0 && value.length > (field.fileMaxCount ?? 1)) {
      return `${label}: too many files`;
    }
  }
  const rule = field.validation;
  if (rule && rule.kind !== "none") {
    const str = typeof value === "string" ? value : String(value ?? "");
    if (rule.kind === "regex" && rule.pattern) {
      try {
        if (!new RegExp(rule.pattern).test(str)) return rule.message || `${label} is invalid`;
      } catch { /* ignore malformed pattern */ }
    }
    if (rule.kind === "length") {
      if (rule.min != null && str.length < rule.min) return rule.message || `${label} must be at least ${rule.min} characters`;
      if (rule.max != null && str.length > rule.max) return rule.message || `${label} must be at most ${rule.max} characters`;
    }
    if (rule.kind === "number") {
      const n = Number(str);
      if (!Number.isFinite(n)) return rule.message || `${label} must be a number`;
      if (rule.min != null && n < rule.min) return rule.message || `${label} must be ≥ ${rule.min}`;
      if (rule.max != null && n > rule.max) return rule.message || `${label} must be ≤ ${rule.max}`;
    }
  }
  return null;
}
