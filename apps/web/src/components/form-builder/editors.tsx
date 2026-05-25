import { useState } from "react";
import { GripVertical, Plus, Search, X } from "lucide-react";
import type {
  Condition, ConditionOperator, FormField, FormSection,
} from "@/lib/api";
import { ROUTE_SUBMIT } from "@/lib/formConditions";
import { Field, inputCls } from "@/components/form-builder/ui";
import { US_STATES, PR_MUNICIPALITIES, US_STATE_COUNTIES } from "@/lib/usGeoData";

export type FieldEditorProps = {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
};

// ── Options (choice questions) ───────────────────────────────────────────────

export function OptionsEditor({ field, onChange, sections }: FieldEditorProps & { sections?: FormSection[] }) {
  const options = field.options ?? [];
  const isDropdown = field.type === "dropdown" || field.type === "select";

  const otherDropdownFields = (sections ?? [])
    .flatMap((s) => s.fields)
    .filter((f) => f.id !== field.id && (f.type === "dropdown" || f.type === "select"));

  const prefill = field.selectPrefill || "";
  const parentId = field.parentFieldId || "";
  const prefillState = field.prefillState || "";
  const prefillFilter = field.prefillFilter || [];

  const [filterSearch, setFilterSearch] = useState("");

  function handlePrefillChange(val: string) {
    const nextPrefill = val === "" ? null : (val as FormField["selectPrefill"]);
    onChange({
      selectPrefill: nextPrefill,
      options: nextPrefill ? [] : ["Option 1"],
      parentFieldId: nextPrefill === "us_state_counties" ? (otherDropdownFields[0]?.id || null) : null,
      prefillState: nextPrefill === "us_state_counties_static" ? "Alabama" : null,
      prefillFilter: null
    });
  }

  function rename(i: number, value: string) {
    const old = options[i];
    const patch: Partial<FormField> = { options: options.map((o, idx) => (idx === i ? value : o)) };
    if (field.optionRouting && old in field.optionRouting) {
      const r = { ...field.optionRouting };
      r[value] = r[old]; delete r[old];
      patch.optionRouting = r;
    }
    if (field.correctAnswers?.includes(old)) {
      patch.correctAnswers = field.correctAnswers.map((a) => (a === old ? value : a));
    }
    onChange(patch);
  }
  function remove(i: number) {
    const old = options[i];
    const patch: Partial<FormField> = { options: options.filter((_, idx) => idx !== i) };
    if (field.optionRouting && old in field.optionRouting) {
      const r = { ...field.optionRouting }; delete r[old];
      patch.optionRouting = r;
    }
    if (field.correctAnswers?.includes(old)) {
      patch.correctAnswers = field.correctAnswers.filter((a) => a !== old);
    }
    onChange(patch);
  }

  const baseList = (() => {
    if (prefill === "us_states") return US_STATES;
    if (prefill === "pr_municipalities") return PR_MUNICIPALITIES;
    if (prefill === "us_state_counties_static" && prefillState) {
      return US_STATE_COUNTIES[prefillState] || [];
    }
    return [];
  })();

  const filteredList = baseList.filter((item) =>
    item.toLowerCase().includes(filterSearch.toLowerCase())
  );

  return (
    <div className="space-y-3.5">
      {isDropdown && (
        <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-2.5">
          <label className="text-xs font-semibold block text-muted-foreground">Dropdown Options Source</label>
          <select
            className={inputCls}
            value={prefill}
            onChange={(e) => handlePrefillChange(e.target.value)}
          >
            <option value="">Custom List (defined below)</option>
            <option value="us_states">Prefill: USA States</option>
            <option value="pr_municipalities">Prefill: Puerto Rico Municipalities</option>
            <option value="us_state_counties">Dynamic: US Counties (linked to State dropdown)</option>
            <option value="us_state_counties_static">Prefill: US Counties for a specific State</option>
          </select>

          {prefill === "us_state_counties" && (
            <div className="space-y-1 pt-2 border-t border-border/50">
              <label className="text-[11px] font-semibold text-muted-foreground block">Linked Parent State Dropdown</label>
              {otherDropdownFields.length === 0 ? (
                <p className="text-[10px] text-destructive leading-normal">
                  To link this to a state dropdown, first add another dropdown field in your form to act as the USA State selector.
                </p>
              ) : (
                <select
                  className={inputCls}
                  value={parentId}
                  onChange={(e) => onChange({ parentFieldId: e.target.value })}
                >
                  <option value="" disabled>-- Select State Field --</option>
                  {otherDropdownFields.map((f) => (
                    <option key={f.id} value={f.id}>{f.label || f.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {prefill === "us_state_counties_static" && (
            <div className="space-y-1 pt-2 border-t border-border/50">
              <label className="text-[11px] font-semibold text-muted-foreground block">Select Target US State</label>
              <select
                className={inputCls}
                value={prefillState}
                onChange={(e) => {
                  onChange({
                    prefillState: e.target.value,
                    prefillFilter: null
                  });
                }}
              >
                <option value="" disabled>-- Select State --</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {prefill && baseList.length > 0 && (
        <div className="space-y-2 border-t pt-3 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-muted-foreground">Filter Allowed Options</span>
            <span className="text-[10px] text-muted-foreground">
              {prefillFilter.length ? `${prefillFilter.length} selected` : "All allowed"}
            </span>
          </div>

          <div className="relative flex items-center">
            <Search className="size-3 text-muted-foreground/60 absolute left-2.5" />
            <input
              type="text"
              placeholder="Search options..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className={`${inputCls} pl-7 h-7 text-xs`}
            />
            {filterSearch && (
              <button
                type="button"
                onClick={() => setFilterSearch("")}
                className="absolute right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-indigo-500 font-medium">
            <button
              type="button"
              onClick={() => {
                const next = Array.from(new Set([...prefillFilter, ...filteredList]));
                onChange({ prefillFilter: next });
              }}
              className="hover:underline"
            >
              Select All Visible
            </button>
            <span className="text-muted-foreground/30">|</span>
            <button
              type="button"
              onClick={() => {
                const next = prefillFilter.filter(item => !filteredList.includes(item));
                onChange({ prefillFilter: next.length ? next : null });
              }}
              className="hover:underline"
            >
              Clear Visible
            </button>
            {prefillFilter.length > 0 && (
              <>
                <span className="text-muted-foreground/30">|</span>
                <button
                  type="button"
                  onClick={() => onChange({ prefillFilter: null })}
                  className="hover:underline text-destructive"
                >
                  Reset (Allow All)
                </button>
              </>
            )}
          </div>

          <div className="max-h-36 overflow-y-auto border border-border rounded-md p-1.5 space-y-0.5 bg-muted/10">
            {filteredList.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-2">No matching options found.</p>
            ) : (
              filteredList.map((opt) => {
                const checked = prefillFilter.includes(opt);
                return (
                  <label
                    key={opt}
                    className="flex items-center gap-2 text-[11px] py-0.5 px-1 rounded hover:bg-muted/40 cursor-pointer text-foreground/80"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? prefillFilter.filter((x) => x !== opt)
                          : [...prefillFilter, opt];
                        onChange({ prefillFilter: next.length ? next : null });
                      }}
                      className="size-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="truncate">{opt}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {!prefill ? (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold block text-muted-foreground">Options List</label>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <GripVertical className="size-3.5 text-muted-foreground/50 shrink-0" />
              <input
                className={inputCls}
                value={opt}
                onChange={(e) => rename(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={options.length <= 1}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-30"
                aria-label="Remove option"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ options: [...options, `Option ${options.length + 1}`] })}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3.5" /> Add option
          </button>
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground italic bg-muted/40 p-2 rounded-lg text-center">
          Options will be automatically prefilled at runtime from the {
            prefill === "us_states" ? "USA States" :
            prefill === "pr_municipalities" ? "Puerto Rico Municipalities" :
            prefill === "us_state_counties_static" ? `US Counties for ${prefillState}` :
            "US Counties (linked dynamically)"
          } database.
        </div>
      )}
    </div>
  );
}

// ── Scale / rating ───────────────────────────────────────────────────────────

export function ScaleEditor({ field, onChange }: FieldEditorProps) {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Start">
          <select
            className={inputCls}
            value={field.scaleMin ?? 1}
            onChange={(e) => onChange({ scaleMin: Number(e.target.value) })}
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
          </select>
        </Field>
        <Field label="End">
          <select
            className={inputCls}
            value={field.scaleMax ?? 5}
            onChange={(e) => onChange({ scaleMax: Number(e.target.value) })}
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Start label">
          <input className={inputCls} value={field.scaleMinLabel ?? ""} onChange={(e) => onChange({ scaleMinLabel: e.target.value })} />
        </Field>
        <Field label="End label">
          <input className={inputCls} value={field.scaleMaxLabel ?? ""} onChange={(e) => onChange({ scaleMaxLabel: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

export function RatingEditor({ field, onChange }: FieldEditorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label="Stars">
        <select
          className={inputCls}
          value={field.ratingMax ?? 5}
          onChange={(e) => onChange({ ratingMax: Number(e.target.value) })}
        >
          {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </Field>
      <Field label="Icon">
        <select
          className={inputCls}
          value={field.ratingIcon ?? "star"}
          onChange={(e) => onChange({ ratingIcon: e.target.value as "star" | "heart" })}
        >
          <option value="star">Star</option>
          <option value="heart">Heart</option>
        </select>
      </Field>
    </div>
  );
}

// ── Grid (rows × columns) ────────────────────────────────────────────────────

function StringListEditor({
  label, items, onChange,
}: { label: string; items: string[]; onChange: (next: string[]) => void }) {
  return (
    <Field label={label}>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              className={inputCls}
              value={it}
              onChange={(e) => onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              disabled={items.length <= 1}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-30"
              aria-label="Remove"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, `${label.replace(/s$/, "")} ${items.length + 1}`])}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" /> Add
        </button>
      </div>
    </Field>
  );
}

export function GridEditor({ field, onChange }: FieldEditorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StringListEditor label="Rows" items={field.rows ?? []} onChange={(rows) => onChange({ rows })} />
      <StringListEditor label="Columns" items={field.columns ?? []} onChange={(columns) => onChange({ columns })} />
    </div>
  );
}

// ── File settings ────────────────────────────────────────────────────────────

export function FileSettingsEditor({ field, onChange }: FieldEditorProps) {
  return (
    <div className="space-y-2.5">
      <Field label="Accepted file types" hint="e.g. image/*,.pdf — leave blank for any">
        <input className={inputCls} value={field.fileAccept ?? ""} onChange={(e) => onChange({ fileAccept: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Max size (MB)">
          <input
            type="number" min={1} max={10}
            className={inputCls}
            value={field.fileMaxMB ?? 10}
            onChange={(e) => onChange({ fileMaxMB: Math.min(10, Math.max(1, Number(e.target.value) || 10)) })}
          />
        </Field>
        <Field label="Max files">
          <input
            type="number" min={1} max={10}
            className={inputCls}
            value={field.fileMaxCount ?? 1}
            onChange={(e) => onChange({ fileMaxCount: Math.max(1, Number(e.target.value) || 1) })}
          />
        </Field>
      </div>
    </div>
  );
}

// ── Validation ───────────────────────────────────────────────────────────────

export function ValidationEditor({ field, onChange }: FieldEditorProps) {
  const v = field.validation ?? { kind: "none" as const };
  const set = (patch: Partial<NonNullable<FormField["validation"]>>) => {
    const next = { ...v, ...patch };
    onChange({ validation: next.kind === "none" ? null : next });
  };
  return (
    <div className="space-y-2.5 rounded-lg border border-border p-2.5">
      <Field label="Response validation">
        <select className={inputCls} value={v.kind} onChange={(e) => set({ kind: e.target.value as typeof v.kind })}>
          <option value="none">None</option>
          <option value="regex">Matches pattern (regex)</option>
          <option value="number">Number range</option>
          <option value="length">Text length</option>
        </select>
      </Field>
      {v.kind === "regex" && (
        <Field label="Pattern">
          <input className={inputCls} value={v.pattern ?? ""} onChange={(e) => set({ pattern: e.target.value })} placeholder="^[A-Z]+$" />
        </Field>
      )}
      {(v.kind === "number" || v.kind === "length") && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Min">
            <input
              type="number" className={inputCls}
              value={v.min ?? ""}
              onChange={(e) => set({ min: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </Field>
          <Field label="Max">
            <input
              type="number" className={inputCls}
              value={v.max ?? ""}
              onChange={(e) => set({ max: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </Field>
        </div>
      )}
      {v.kind !== "none" && (
        <Field label="Error message">
          <input className={inputCls} value={v.message ?? ""} onChange={(e) => set({ message: e.target.value })} placeholder="Custom error text" />
        </Field>
      )}
    </div>
  );
}

// ── Display condition (show/hide) ────────────────────────────────────────────

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];
const needsValue = (op: ConditionOperator) => op !== "is_empty" && op !== "is_not_empty";

export type ConditionRefField = { name: string; label: string; type: string; options?: string[] };

export function ConditionEditor({
  value, onChange, fields,
}: {
  value: Condition | null | undefined;
  onChange: (c: Condition | null) => void;
  fields: ConditionRefField[];
}) {
  if (!value) {
    return (
      <button
        type="button"
        onClick={() => onChange({ match: "all", rules: [{ field: fields[0]?.name ?? "", operator: "equals", value: "" }] })}
        disabled={fields.length === 0}
        className="text-xs rounded-lg border border-dashed border-border px-2.5 py-1.5 hover:bg-muted disabled:opacity-50"
      >
        + Add display condition
      </button>
    );
  }
  const setRule = (i: number, patch: Partial<Condition["rules"][number]>) =>
    onChange({ ...value, rules: value.rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  return (
    <div className="space-y-2 rounded-lg border border-border p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Show this when</span>
        <button type="button" onClick={() => onChange(null)} className="text-xs text-destructive hover:underline">Remove</button>
      </div>
      <select
        value={value.match}
        onChange={(e) => onChange({ ...value, match: e.target.value as "all" | "any" })}
        className={inputCls}
      >
        <option value="all">all rules match</option>
        <option value="any">any rule matches</option>
      </select>
      {value.rules.map((rule, i) => {
        const ref = fields.find((f) => f.name === rule.field);
        return (
          <div key={i} className="space-y-1.5 rounded-md bg-muted/40 p-2">
            <select value={rule.field} onChange={(e) => setRule(i, { field: e.target.value })} className={inputCls}>
              {fields.map((f) => <option key={f.name} value={f.name}>{f.label || f.name}</option>)}
            </select>
            <div className="flex gap-1.5">
              <select
                value={rule.operator}
                onChange={(e) => setRule(i, { operator: e.target.value as ConditionOperator })}
                className={inputCls}
              >
                {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button
                type="button"
                onClick={() => onChange({ ...value, rules: value.rules.filter((_, idx) => idx !== i) })}
                className="rounded-lg border border-border px-2 hover:bg-muted"
                aria-label="Remove rule"
              >
                <X className="size-3.5" />
              </button>
            </div>
            {needsValue(rule.operator) && (
              ref && (ref.type === "select" || ref.type === "dropdown" || ref.type === "multiple_choice") ? (
                <select value={rule.value ?? ""} onChange={(e) => setRule(i, { value: e.target.value })} className={inputCls}>
                  <option value="">—</option>
                  {(ref.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : ref?.type === "checkbox" ? (
                <select value={rule.value ?? ""} onChange={(e) => setRule(i, { value: e.target.value })} className={inputCls}>
                  <option value="true">checked</option>
                  <option value="false">unchecked</option>
                </select>
              ) : (
                <input
                  value={rule.value ?? ""}
                  onChange={(e) => setRule(i, { value: e.target.value })}
                  placeholder="Value"
                  className={inputCls}
                />
              )
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onChange({ ...value, rules: [...value.rules, { field: fields[0]?.name ?? "", operator: "equals", value: "" }] })}
        className="text-xs rounded-lg border border-dashed border-border px-2.5 py-1 hover:bg-muted"
      >
        + Add rule
      </button>
    </div>
  );
}

// ── Branching: routing target options shared by section + per-option editors ──

function routingOptions(sections: FormSection[], currentSectionId: string) {
  const opts: { value: string; label: string }[] = [
    { value: "", label: "Continue to next section" },
  ];
  sections.forEach((s, i) => {
    if (s.id === currentSectionId) return;
    opts.push({ value: s.id, label: `Go to: ${s.title || `Section ${i + 1}`}` });
  });
  opts.push({ value: ROUTE_SUBMIT, label: "Submit form" });
  return opts;
}

export function BranchingEditor({
  field, sections, currentSectionId, onChange,
}: FieldEditorProps & { sections: FormSection[]; currentSectionId: string }) {
  const routing = field.optionRouting ?? {};
  const opts = routingOptions(sections, currentSectionId);
  return (
    <div className="space-y-2 rounded-lg border border-border p-2.5">
      <p className="text-xs font-medium">Go to section based on answer</p>
      {(field.options ?? []).map((opt) => (
        <div key={opt} className="flex items-center gap-2">
          <span className="w-28 shrink-0 truncate text-xs text-muted-foreground" title={opt}>{opt}</span>
          <select
            className={inputCls}
            value={routing[opt] ?? ""}
            onChange={(e) => {
              const next = { ...routing };
              if (e.target.value) next[opt] = e.target.value;
              else delete next[opt];
              onChange({ optionRouting: Object.keys(next).length ? next : undefined });
            }}
          >
            {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

export function SectionRoutingEditor({
  section, sections, onChange,
}: {
  section: FormSection;
  sections: FormSection[];
  onChange: (patch: Partial<FormSection>) => void;
}) {
  const after = section.afterSection;
  const current = after?.kind === "submit" ? ROUTE_SUBMIT : after?.kind === "goto" ? (after.targetSectionId ?? "") : "";
  const opts = routingOptions(sections, section.id);
  return (
    <Field label="After this section">
      <select
        className={inputCls}
        value={current}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) onChange({ afterSection: null });
          else if (v === ROUTE_SUBMIT) onChange({ afterSection: { kind: "submit" } });
          else onChange({ afterSection: { kind: "goto", targetSectionId: v } });
        }}
      >
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

// ── Quiz answer key ──────────────────────────────────────────────────────────

function quizCategories(field: FormField): string[] {
  if (field.type === "linear_scale") {
    const out: string[] = [];
    for (let i = field.scaleMin ?? 1; i <= (field.scaleMax ?? 5); i++) out.push(String(i));
    return out;
  }
  if (field.type === "rating") {
    const out: string[] = [];
    for (let i = 1; i <= (field.ratingMax ?? 5); i++) out.push(String(i));
    return out;
  }
  return field.options ?? [];
}

export function QuizFieldEditor({ field, onChange }: FieldEditorProps) {
  const correct = field.correctAnswers ?? [];
  const isGrid = field.type === "grid_multiple_choice" || field.type === "grid_checkbox";
  const isMulti = field.type === "checkboxes" || field.type === "grid_checkbox";
  const choiceLike =
    field.type === "multiple_choice" || field.type === "dropdown" || field.type === "select" ||
    field.type === "checkboxes" || field.type === "linear_scale" || field.type === "rating";

  return (
    <div className="space-y-2.5 rounded-lg border border-amber-300/60 bg-amber-50/40 p-2.5 dark:bg-amber-900/10">
      <Field label="Points">
        <input
          type="number" min={0}
          className={inputCls}
          value={field.points ?? 0}
          onChange={(e) => onChange({ points: Math.max(0, Number(e.target.value) || 0) })}
        />
      </Field>

      {choiceLike && (
        <Field label="Correct answer">
          <div className="space-y-1">
            {quizCategories(field).map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={`quiz-${field.id}`}
                  checked={correct.includes(opt)}
                  onChange={() => {
                    if (isMulti) {
                      onChange({ correctAnswers: correct.includes(opt) ? correct.filter((a) => a !== opt) : [...correct, opt] });
                    } else {
                      onChange({ correctAnswers: [opt] });
                    }
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
        </Field>
      )}

      {isGrid && (
        <Field label="Correct answers per row">
          <div className="space-y-1.5">
            {(field.rows ?? []).map((row) => {
              const rowCorrect = field.correctGrid?.[row] ?? [];
              return (
                <div key={row} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">{row}</span>
                  <div className="flex flex-wrap gap-2">
                    {(field.columns ?? []).map((col) => (
                      <label key={col} className="flex items-center gap-1 text-xs">
                        <input
                          type={field.type === "grid_checkbox" ? "checkbox" : "radio"}
                          name={`quiz-${field.id}-${row}`}
                          checked={rowCorrect.includes(col)}
                          onChange={() => {
                            const cg = { ...(field.correctGrid ?? {}) };
                            if (field.type === "grid_checkbox") {
                              cg[row] = rowCorrect.includes(col) ? rowCorrect.filter((c) => c !== col) : [...rowCorrect, col];
                            } else {
                              cg[row] = [col];
                            }
                            onChange({ correctGrid: cg });
                          }}
                        />
                        {col}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Field>
      )}

      {!choiceLike && !isGrid && (
        <Field label="Accepted answer" hint="Comma-separate multiple accepted answers">
          <input
            className={inputCls}
            value={correct.join(", ")}
            onChange={(e) => onChange({
              correctAnswers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            })}
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Feedback if correct">
          <input className={inputCls} value={field.feedbackCorrect ?? ""} onChange={(e) => onChange({ feedbackCorrect: e.target.value })} />
        </Field>
        <Field label="Feedback if wrong">
          <input className={inputCls} value={field.feedbackIncorrect ?? ""} onChange={(e) => onChange({ feedbackIncorrect: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}
