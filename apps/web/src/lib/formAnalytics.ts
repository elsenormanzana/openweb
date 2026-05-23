import type { CmsForm, FormField, FormResponse } from "@/lib/api";

export type ChoiceCount = { label: string; count: number; percent: number };

export type QuestionSummary = {
  field: FormField;
  /** Responses that supplied a non-empty answer. */
  answered: number;
  kind: "choice" | "grid" | "scalar" | "text" | "file";
  choices?: ChoiceCount[];
  gridRows?: { row: string; choices: ChoiceCount[] }[];
  values?: string[];
  numberStats?: { min: number; max: number; avg: number };
};

const CHOICE_TYPES = new Set([
  "multiple_choice", "dropdown", "select", "checkboxes", "checkbox", "linear_scale", "rating",
]);

function pct(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function countCategories(categories: string[], hits: string[]): ChoiceCount[] {
  const total = hits.length;
  const counts = new Map<string, number>();
  for (const c of categories) counts.set(c, 0);
  for (const h of hits) counts.set(h, (counts.get(h) ?? 0) + 1);
  return Array.from(counts.entries()).map(([label, count]) => ({ label, count, percent: pct(count, total) }));
}

/** Display string for a single response value of any shape. */
export function formatAnswer(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value
      .map((v) => (v && typeof v === "object" && "name" in v ? String((v as { name: unknown }).name) : String(v)))
      .filter(Boolean)
      .join("; ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${formatAnswer(v)}`)
      .filter((s) => !s.endsWith(": "))
      .join("; ");
  }
  return String(value);
}

export function aggregateQuestion(field: FormField, responses: FormResponse[]): QuestionSummary {
  const raw = responses.map((r) => r.values[field.name]);
  const present = raw.filter((v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0));
  const answered = present.length;

  if (field.type === "grid_multiple_choice" || field.type === "grid_checkbox") {
    const cols = field.columns ?? [];
    const gridRows = (field.rows ?? []).map((row) => {
      const hits: string[] = [];
      for (const v of present) {
        const cell = (v as Record<string, unknown>)?.[row];
        if (Array.isArray(cell)) hits.push(...cell.map(String));
        else if (typeof cell === "string" && cell) hits.push(cell);
      }
      return { row, choices: countCategories(cols, hits) };
    });
    return { field, answered, kind: "grid", gridRows };
  }

  if (CHOICE_TYPES.has(field.type)) {
    let categories: string[];
    if (field.type === "checkbox") categories = ["Yes", "No"];
    else if (field.type === "linear_scale") {
      categories = [];
      for (let i = field.scaleMin ?? 1; i <= (field.scaleMax ?? 5); i++) categories.push(String(i));
    } else if (field.type === "rating") {
      categories = [];
      for (let i = 1; i <= (field.ratingMax ?? 5); i++) categories.push(String(i));
    } else categories = field.options ?? [];

    const hits: string[] = [];
    for (const v of present) {
      if (field.type === "checkbox") hits.push(v === true || v === "true" ? "Yes" : "No");
      else if (Array.isArray(v)) hits.push(...v.map(String));
      else hits.push(String(v));
    }
    // Surface unexpected answers (e.g. options removed since submission).
    for (const h of hits) if (!categories.includes(h)) categories.push(h);
    return { field, answered, kind: "choice", choices: countCategories(categories, hits) };
  }

  if (field.type === "number") {
    const nums = present.map((v) => Number(v)).filter((n) => Number.isFinite(n));
    const numberStats = nums.length
      ? { min: Math.min(...nums), max: Math.max(...nums), avg: nums.reduce((a, b) => a + b, 0) / nums.length }
      : undefined;
    return { field, answered, kind: "scalar", numberStats, values: present.map(formatAnswer) };
  }

  if (field.type === "file") {
    return { field, answered, kind: "file", values: present.map(formatAnswer) };
  }

  return { field, answered, kind: "text", values: present.map(formatAnswer) };
}

export function aggregateResponses(form: CmsForm, responses: FormResponse[]): QuestionSummary[] {
  return form.sections.flatMap((s) => s.fields).map((f) => aggregateQuestion(f, responses));
}

/** Average quiz score percentage across responses that carry a score, or null. */
export function quizAverage(responses: FormResponse[]): number | null {
  const scored = responses.filter((r) => r.score);
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((a, r) => a + (r.score?.percent ?? 0), 0) / scored.length);
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Download all responses for a form as a UTF-8 CSV (Excel-friendly via BOM). */
export function exportResponsesCsv(form: CmsForm, responses: FormResponse[]): void {
  const fields = form.sections.flatMap((s) => s.fields);
  const hasScores = responses.some((r) => r.score);
  const header = ["Submitted at", ...(hasScores ? ["Score"] : []), ...fields.map((f) => f.label || f.name)];
  const rows = responses.map((r) => {
    const cells = [new Date(r.createdAt).toLocaleString()];
    if (hasScores) cells.push(r.score ? `${r.score.earned}/${r.score.total}` : "");
    for (const f of fields) cells.push(formatAnswer(r.values[f.name]));
    return cells;
  });
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${form.slug || "form"}-responses.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
