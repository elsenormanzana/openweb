import { useMemo, useState, type FormEvent } from "react";
import type { FormField, FormLayout, FormSection } from "@/lib/api";
import { getVisibleFields, getVisibleSections, type FormValues } from "@/lib/formConditions";

const INPUT_CLASS =
  "w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormRendererProps = {
  sections: FormSection[];
  layout?: FormLayout;
  submitLabel?: string;
  successMessage?: string;
  /** When omitted the form is a no-op preview (inputs work, submit does nothing). */
  onSubmit?: (values: FormValues) => Promise<void>;
  className?: string;
};

function FieldInput({
  field, value, onChange,
}: { field: FormField; value: unknown; onChange: (v: unknown) => void }) {
  const str = typeof value === "string" ? value : "";
  if (field.type === "textarea") {
    return (
      <textarea
        rows={5} value={str} onChange={(e) => onChange(e.target.value)}
        required={field.required} placeholder={field.placeholder || ""}
        className={`${INPUT_CLASS} resize-none`}
      />
    );
  }
  if (field.type === "select") {
    return (
      <select value={str} onChange={(e) => onChange(e.target.value)} required={field.required} className={INPUT_CLASS}>
        <option value="">{field.placeholder || "Select…"}</option>
        {(field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-neutral-300">
        <input
          type="checkbox" checked={value === true || value === "true"}
          onChange={(e) => onChange(e.target.checked)} required={field.required}
          className="size-4 rounded border-gray-300"
        />
        {field.placeholder || field.label}
      </label>
    );
  }
  return (
    <input
      type={field.type === "email" ? "email" : "text"} value={str}
      onChange={(e) => onChange(e.target.value)} required={field.required}
      placeholder={field.placeholder || ""} className={INPUT_CLASS}
    />
  );
}

function FieldRow({
  field, value, onChange,
}: { field: FormField; value: unknown; onChange: (v: unknown) => void }) {
  return (
    <div>
      {field.type !== "checkbox" && (
        <label className="block text-xs font-semibold text-gray-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
          {field.label}{field.required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <FieldInput field={field} value={value} onChange={onChange} />
    </div>
  );
}

function StepProgress({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= current ? "bg-gray-900 dark:bg-neutral-100" : "bg-gray-200 dark:bg-neutral-700"}`} />
      ))}
      <span className="text-xs text-gray-500 dark:text-neutral-400 ml-1 shrink-0">{current + 1}/{total}</span>
    </div>
  );
}

/**
 * Renders a fillable form from its sections — single-page or multi-step — evaluating
 * conditional visibility live. Shared by the builder preview, ContactBlock and the
 * public form page.
 */
export function FormRenderer({
  sections, layout = "single", submitLabel = "Submit",
  successMessage = "Thanks, we received your submission.", onSubmit, className,
}: FormRendererProps) {
  const [values, setValues] = useState<FormValues>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleSections = useMemo(() => getVisibleSections(sections, values), [sections, values]);

  if (submitted) {
    return <p className={`text-sm text-emerald-700 ${className ?? ""}`}>{successMessage}</p>;
  }

  const isSteps = layout === "steps" && visibleSections.length > 1;
  const currentStep = isSteps ? Math.min(step, visibleSections.length - 1) : 0;
  const shownSections = isSteps ? [visibleSections[currentStep]] : visibleSections;
  const isLastStep = !isSteps || currentStep === visibleSections.length - 1;

  const setValue = (name: string, v: unknown) => setValues((prev) => ({ ...prev, [name]: v }));

  function validateSection(section: FormSection): string | null {
    for (const f of getVisibleFields(section, values)) {
      const v = values[f.name];
      if (f.required && (v == null || v === "" || v === false)) {
        return `${f.label || f.name} is required`;
      }
      if (f.type === "email" && typeof v === "string" && v.trim() && !EMAIL_RE.test(v.trim())) {
        return `${f.label || f.name} must be a valid email`;
      }
    }
    return null;
  }

  // Payload contains only currently-visible fields — hidden fields are dropped.
  function collectValues(): FormValues {
    const out: FormValues = {};
    for (const s of getVisibleSections(sections, values)) {
      for (const f of getVisibleFields(s, values)) out[f.name] = values[f.name] ?? "";
    }
    return out;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!onSubmit) return; // preview mode — no submission
    setError(null);
    for (const s of visibleSections) {
      const err = validateSection(s);
      if (err) { setError(err); return; }
    }
    setSubmitting(true);
    try {
      await onSubmit(collectValues());
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    const err = validateSection(visibleSections[currentStep]);
    if (err) { setError(err); return; }
    setError(null);
    setStep(currentStep + 1);
  }
  function goBack() {
    setError(null);
    setStep(Math.max(0, currentStep - 1));
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-5 ${className ?? ""}`} noValidate>
      {isSteps && <StepProgress total={visibleSections.length} current={currentStep} />}

      {shownSections.map((section) => (
        <div key={section.id} className="space-y-4">
          {(section.title || section.description) && (
            <div>
              {section.title && <h3 className="text-base font-semibold text-gray-900 dark:text-neutral-100">{section.title}</h3>}
              {section.description && <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">{section.description}</p>}
            </div>
          )}
          {getVisibleFields(section, values).map((field) => (
            <FieldRow key={field.id} field={field} value={values[field.name]} onChange={(v) => setValue(field.name, v)} />
          ))}
        </div>
      ))}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        {isSteps && currentStep > 0 && (
          <button
            type="button" onClick={goBack}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Back
          </button>
        )}
        {isLastStep ? (
          <button
            type="submit" disabled={submitting}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? "Sending…" : submitLabel}
          </button>
        ) : (
          <button
            type="button" onClick={goNext}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-colors"
          >
            Next
          </button>
        )}
      </div>
    </form>
  );
}
