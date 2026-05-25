import { useRef, useState } from "react";
import { Heart, Loader2, Star, Upload, X } from "lucide-react";
import { api, type FormField, type FormFile, type FormSection } from "@/lib/api";
import { US_STATES, PR_MUNICIPALITIES, US_STATE_COUNTIES } from "@/lib/usGeoData";

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm bg-white text-gray-900 " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--form-accent)]/30 focus:border-[var(--form-accent)] " +
  "transition-colors disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export type QuestionInputProps = {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  /** Required for file-upload questions to function. */
  slug?: string;
  accent: string;
  /** Builder preview — inputs render but uploads are disabled. */
  disabled?: boolean;
  /**
   * Display-only label overrides for choice/grid questions. Underlying field.options /
   * rows / columns stay as stored values; only the rendered label changes. Used by the
   * multilingual translator so branching/grading/analytics keep working in any language.
   */
  labels?: { options?: string[]; rows?: string[]; columns?: string[] };
  sections?: FormSection[];
  formValues?: Record<string, unknown>;
};

export function QuestionInput(props: QuestionInputProps) {
  const { field } = props;
  switch (field.type) {
    case "textarea": return <TextareaInput {...props} />;
    case "select":
    case "dropdown": return <DropdownInput {...props} />;
    case "checkbox": return <SingleCheckboxInput {...props} />;
    case "multiple_choice": return <MultipleChoiceInput {...props} />;
    case "checkboxes": return <CheckboxesInput {...props} />;
    case "linear_scale": return <LinearScaleInput {...props} />;
    case "rating": return <RatingInput {...props} />;
    case "file": return <FileInput {...props} />;
    case "grid_multiple_choice":
    case "grid_checkbox": return <GridInput {...props} />;
    case "number": return <BasicInput {...props} inputType="number" />;
    case "date": return <BasicInput {...props} inputType="date" />;
    case "time": return <BasicInput {...props} inputType="time" />;
    case "email": return <BasicInput {...props} inputType="email" />;
    default: return <BasicInput {...props} inputType="text" />;
  }
}

function BasicInput({ field, value, onChange, disabled, inputType }: QuestionInputProps & { inputType: string }) {
  return (
    <input
      type={inputType}
      value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder || ""}
      disabled={disabled}
      className={INPUT_CLASS}
    />
  );
}

function TextareaInput({ field, value, onChange, disabled }: QuestionInputProps) {
  return (
    <textarea
      rows={4}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder || ""}
      disabled={disabled}
      className={`${INPUT_CLASS} resize-y`}
    />
  );
}

function DropdownInput({ field, value, onChange, disabled, labels, sections, formValues }: QuestionInputProps) {
  let opts = field.options ?? [];

  if (field.selectPrefill === "us_states") {
    opts = US_STATES;
  } else if (field.selectPrefill === "pr_municipalities") {
    opts = PR_MUNICIPALITIES;
  } else if (field.selectPrefill === "us_state_counties_static" && field.prefillState) {
    opts = US_STATE_COUNTIES[field.prefillState] || [];
  } else if (field.selectPrefill === "us_state_counties") {
    const parentFieldId = field.parentFieldId;
    const parentField = parentFieldId && sections
      ?.flatMap((s) => s.fields)
      .find((f) => f.id === parentFieldId);

    const parentVal = parentField && formValues ? String(formValues[parentField.name] || "") : "";
    if (parentVal && US_STATE_COUNTIES[parentVal]) {
      opts = US_STATE_COUNTIES[parentVal];
    } else {
      opts = [];
    }
  }

  // Filter options based on allowed list
  if (field.prefillFilter && field.prefillFilter.length > 0) {
    opts = opts.filter((opt) => field.prefillFilter?.includes(opt));
  }

  const valString = typeof value === "string" ? value : "";
  const isValValid = valString === "" || opts.includes(valString);

  if (valString && !isValValid && !disabled) {
    setTimeout(() => onChange(""), 0);
  }

  const placeholder = field.selectPrefill === "us_state_counties" && !opts.length
    ? "Select State first…"
    : (field.placeholder || "Select…");

  return (
    <select
      value={isValValid ? valString : ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || (field.selectPrefill === "us_state_counties" && !opts.length)}
      className={INPUT_CLASS}
    >
      <option value="">{placeholder}</option>
      {opts.map((opt, i) => <option key={opt} value={opt}>{labels?.options?.[i] || opt}</option>)}
    </select>
  );
}

function SingleCheckboxInput({ field, value, onChange, accent, disabled }: QuestionInputProps) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-neutral-300 cursor-pointer">
      <input
        type="checkbox"
        checked={value === true || value === "true"}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="size-4 rounded border-gray-300"
        style={{ accentColor: accent }}
      />
      {field.placeholder || field.label}
    </label>
  );
}

function MultipleChoiceInput({ field, value, onChange, accent, disabled, labels }: QuestionInputProps) {
  const opts = field.options ?? [];
  return (
    <div className="space-y-2">
      {opts.map((opt, i) => (
        <label key={opt} className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-neutral-200 cursor-pointer">
          <input
            type="radio"
            name={field.id}
            checked={value === opt}
            onChange={() => onChange(opt)}
            disabled={disabled}
            className="size-4"
            style={{ accentColor: accent }}
          />
          {labels?.options?.[i] || opt}
        </label>
      ))}
    </div>
  );
}

function CheckboxesInput({ field, value, onChange, accent, disabled, labels }: QuestionInputProps) {
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const opts = field.options ?? [];
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]);
  };
  return (
    <div className="space-y-2">
      {opts.map((opt, i) => (
        <label key={opt} className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-neutral-200 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            disabled={disabled}
            className="size-4 rounded"
            style={{ accentColor: accent }}
          />
          {labels?.options?.[i] || opt}
        </label>
      ))}
    </div>
  );
}

function LinearScaleInput({ field, value, onChange, accent, disabled }: QuestionInputProps) {
  const min = field.scaleMin ?? 1;
  const max = field.scaleMax ?? 5;
  const steps: number[] = [];
  for (let i = min; i <= max; i++) steps.push(i);
  return (
    <div className="flex items-end gap-1 flex-wrap">
      {field.scaleMinLabel && <span className="text-xs text-gray-500 mr-1 self-center">{field.scaleMinLabel}</span>}
      {steps.map((n) => (
        <label key={n} className="flex flex-col items-center gap-1 cursor-pointer px-1.5">
          <span className="text-xs text-gray-600 dark:text-neutral-400">{n}</span>
          <input
            type="radio"
            name={field.id}
            checked={String(value) === String(n)}
            onChange={() => onChange(String(n))}
            disabled={disabled}
            className="size-4"
            style={{ accentColor: accent }}
          />
        </label>
      ))}
      {field.scaleMaxLabel && <span className="text-xs text-gray-500 ml-1 self-center">{field.scaleMaxLabel}</span>}
    </div>
  );
}

function RatingInput({ field, value, onChange, accent, disabled }: QuestionInputProps) {
  const max = field.ratingMax ?? 5;
  const [hover, setHover] = useState(0);
  const current = Number(value) || 0;
  const Icon = field.ratingIcon === "heart" ? Heart : Star;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => {
        const n = i + 1;
        const active = (hover || current) >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onMouseEnter={() => !disabled && setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(String(n))}
            className="p-0.5 transition-transform hover:scale-110 disabled:cursor-default"
            aria-label={`${n} of ${max}`}
          >
            <Icon
              className="size-7"
              style={{ color: active ? accent : "#d1d5db", fill: active ? accent : "transparent" }}
            />
          </button>
        );
      })}
      {current > 0 && <span className="ml-2 text-sm text-gray-500">{current}/{max}</span>}
    </div>
  );
}

function FileInput({ field, value, onChange, slug, disabled }: QuestionInputProps) {
  const files = Array.isArray(value) ? (value as FormFile[]) : [];
  const maxCount = field.fileMaxCount ?? 1;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(list: FileList | null) {
    if (!list || !slug) return;
    setError(null);
    const maxBytes = (field.fileMaxMB ?? 10) * 1_000_000;
    const next: FormFile[] = [...files];
    setUploading(true);
    try {
      for (const file of Array.from(list)) {
        if (next.length >= maxCount) break;
        if (file.size > maxBytes) { setError(`${file.name} exceeds ${field.fileMaxMB ?? 10}MB`); continue; }
        const uploaded = await api.forms.uploadFile(slug, file);
        next.push(uploaded);
      }
      onChange(next);
    } catch (e) {
      setError((e as Error).message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {files.length < maxCount && (
        <button
          type="button"
          disabled={disabled || uploading || !slug}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? "Uploading…" : "Add file"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={field.fileAccept || undefined}
        multiple={maxCount > 1}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {!slug && <p className="text-xs text-gray-400">File upload is unavailable in preview.</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {files.map((f, i) => (
        <div key={`${f.url}-${i}`} className="flex items-center gap-2 text-sm rounded-lg bg-gray-50 px-3 py-1.5 dark:bg-neutral-800">
          <span className="truncate flex-1">{f.name}</span>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(files.filter((_, idx) => idx !== i))}
              className="text-gray-400 hover:text-red-600"
              aria-label="Remove file"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function GridInput({ field, value, onChange, accent, disabled, labels }: QuestionInputProps) {
  const rows = field.rows ?? [];
  const cols = field.columns ?? [];
  const isCheckbox = field.type === "grid_checkbox";
  const grid = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const rowLabels = labels?.rows;
  const colLabels = labels?.columns;

  function setCell(row: string, col: string) {
    if (isCheckbox) {
      const cur = Array.isArray(grid[row]) ? (grid[row] as string[]) : [];
      const next = cur.includes(col) ? cur.filter((c) => c !== col) : [...cur, col];
      onChange({ ...grid, [row]: next });
    } else {
      onChange({ ...grid, [row]: col });
    }
  }
  function isChecked(row: string, col: string) {
    return isCheckbox
      ? Array.isArray(grid[row]) && (grid[row] as string[]).includes(col)
      : grid[row] === col;
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-sm border-collapse">
        <thead>
          <tr>
            <th />
            {cols.map((c, i) => (
              <th key={c} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-neutral-400 text-center">{colLabels?.[i] || c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r} className="border-t border-gray-100 dark:border-neutral-800">
              <td className="px-3 py-2 text-gray-800 dark:text-neutral-200 whitespace-nowrap">{rowLabels?.[ri] || r}</td>
              {cols.map((c) => (
                <td key={c} className="px-3 py-2 text-center">
                  <input
                    type={isCheckbox ? "checkbox" : "radio"}
                    name={`${field.id}-${r}`}
                    checked={isChecked(r, c)}
                    onChange={() => setCell(r, c)}
                    disabled={disabled}
                    className="size-4"
                    style={{ accentColor: accent }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
