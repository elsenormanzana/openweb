import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { FormField, FormLayout, FormSection, FormSettings, FormTheme, QuizScore } from "@/lib/api";
import {
  getBranchTarget, getVisibleFields, getVisibleSections, ROUTE_SUBMIT, type FormValues,
} from "@/lib/formConditions";
import { validateFieldValue } from "@/lib/formValidation";
import { FONT_PRESET_CSS } from "@/lib/formFields";
import { QuestionInput } from "@/components/form-fields/QuestionInput";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_ACCENT = "#111827";

type SubmitResult = { score?: QuizScore | null } | void;

type FormRendererProps = {
  sections: FormSection[];
  layout?: FormLayout;
  submitLabel?: string;
  successMessage?: string;
  theme?: FormTheme;
  settings?: FormSettings;
  /** Public form slug — required for file-upload questions. */
  slug?: string;
  /** When omitted the form is a no-op preview (inputs work, submit does nothing). */
  onSubmit?: (values: FormValues, meta: Record<string, unknown>) => Promise<SubmitResult>;
  className?: string;
};

function QuestionRow({
  field, value, onChange, error, slug, accent, theme, isQuiz,
}: {
  field: FormField; value: unknown; onChange: (v: unknown) => void;
  error?: string; slug?: string; accent: string; theme?: FormTheme; isQuiz: boolean;
}) {
  const labelFont = theme ? { fontFamily: FONT_PRESET_CSS[theme.questionFont] } : undefined;
  return (
    <div className="space-y-1.5">
      {field.type !== "checkbox" && (
        <label className="block text-sm font-medium text-gray-900 dark:text-neutral-100" style={labelFont}>
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
          {isQuiz && (field.points ?? 0) > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">{field.points} pt{field.points === 1 ? "" : "s"}</span>
          )}
        </label>
      )}
      {field.description && (
        <p className="text-xs text-gray-500 dark:text-neutral-400">{field.description}</p>
      )}
      <QuestionInput field={field} value={value} onChange={onChange} slug={slug} accent={accent} />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function QuizResult({ score, sections }: { score: QuizScore; sections: FormSection[] }) {
  const fieldByName = useMemo(() => {
    const map: Record<string, FormField> = {};
    for (const s of sections) for (const f of s.fields) map[f.name] = f;
    return map;
  }, [sections]);
  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">Your score</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-neutral-100">
          {score.earned} / {score.total}
        </p>
        <p className="text-sm text-gray-500">{score.percent}%</p>
      </div>
      <div className="space-y-2">
        {score.breakdown.map((b) => {
          const field = fieldByName[b.name];
          const feedback = b.correct ? field?.feedbackCorrect : field?.feedbackIncorrect;
          return (
            <div key={b.name} className="flex items-start gap-2 rounded-lg border border-gray-200 p-3 dark:border-neutral-800">
              {b.correct
                ? <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                : <XCircle className="size-4 text-red-500 shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <p className="text-sm text-gray-900 dark:text-neutral-100">{b.label}</p>
                <p className="text-xs text-gray-500">{b.earned} / {b.points} points</p>
                {feedback && <p className="text-xs text-gray-500 mt-0.5">{feedback}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Renders a fillable form from its sections — single-page or multi-step with branching —
 * evaluating conditional visibility live, applying the form theme, uploading files, and
 * (in quiz mode) showing a score. Shared by the builder preview, ContactBlock and the
 * public form page.
 */
export function FormRenderer({
  sections, layout = "single", submitLabel = "Submit",
  successMessage = "Thanks, we received your submission.",
  theme, settings, slug, onSubmit, className,
}: FormRendererProps) {
  const [values, setValues] = useState<FormValues>({});
  const [respondentEmail, setRespondentEmail] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultScore, setResultScore] = useState<QuizScore | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const accent = theme?.themeColor || DEFAULT_ACCENT;
  const visibleSections = useMemo(() => getVisibleSections(sections, values), [sections, values]);
  const isSteps = layout === "steps" && visibleSections.length > 1;

  const containerStyle = {
    ...(theme ? { fontFamily: FONT_PRESET_CSS[theme.textFont] } : {}),
    "--form-accent": accent,
  } as CSSProperties;

  // Closed state — only in live mode (preview always renders the form).
  if (onSubmit && settings && !settings.acceptingResponses) {
    return (
      <div className={className} style={containerStyle}>
        <p className="text-sm text-gray-600 dark:text-neutral-300">{settings.closedMessage}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={className} style={containerStyle}>
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{successMessage}</p>
        {resultScore && <div className="mt-4"><QuizResult score={resultScore} sections={sections} /></div>}
      </div>
    );
  }

  // `path` is the branching trail; before the first "Next" it is just the opening section.
  const path = history.length ? history : (visibleSections[0] ? [visibleSections[0].id] : []);
  const currentId = path[path.length - 1];
  const currentSection = visibleSections.find((s) => s.id === currentId) ?? visibleSections[0];
  const shownSections = isSteps && currentSection ? [currentSection] : visibleSections;

  const branchTarget = isSteps && currentSection
    ? getBranchTarget(currentSection, sections, values)
    : ROUTE_SUBMIT;
  const isLastStep = !isSteps || branchTarget === ROUTE_SUBMIT;

  const setValue = (name: string, v: unknown) => {
    setValues((prev) => ({ ...prev, [name]: v }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
  };

  function validateSections(toCheck: FormSection[]): boolean {
    const next: Record<string, string> = {};
    for (const section of toCheck) {
      for (const field of getVisibleFields(section, values)) {
        const err = validateFieldValue(field, values[field.name]);
        if (err) next[field.name] = err;
      }
    }
    if (settings?.collectEmail) {
      if (!respondentEmail.trim()) next.__email = "Email is required";
      else if (!EMAIL_RE.test(respondentEmail.trim())) next.__email = "Enter a valid email";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) { setFormError("Please fix the highlighted fields."); return false; }
    setFormError(null);
    return true;
  }

  function collectValues(visited: FormSection[]): FormValues {
    const out: FormValues = {};
    for (const s of visited) {
      for (const f of getVisibleFields(s, values)) out[f.name] = values[f.name] ?? "";
    }
    return out;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!onSubmit) return; // preview mode
    const visited = isSteps
      ? path.map((id) => sections.find((s) => s.id === id)).filter((s): s is FormSection => Boolean(s))
      : visibleSections;
    if (!validateSections(visited)) return;
    setSubmitting(true);
    try {
      const meta: Record<string, unknown> = { visitedSections: visited.map((s) => s.id) };
      if (settings?.collectEmail) meta.respondentEmail = respondentEmail.trim();
      const result = await onSubmit(collectValues(visited), meta);
      if (result && "score" in result && result.score) setResultScore(result.score);
      setSubmitted(true);
    } catch (err) {
      setFormError((err as Error).message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (!currentSection) return;
    if (!validateSections([currentSection])) return;
    if (branchTarget === ROUTE_SUBMIT) return;
    setHistory([...path, branchTarget]);
  }
  function goBack() {
    setFormError(null);
    if (path.length > 1) setHistory(path.slice(0, -1));
  }

  const buttonStyle = { backgroundColor: accent } as CSSProperties;
  const stepIndex = isSteps ? path.length - 1 : 0;
  const totalSteps = visibleSections.length;

  return (
    <form onSubmit={handleSubmit} className={`space-y-5 ${className ?? ""}`} style={containerStyle} noValidate>
      {isSteps && settings?.showProgressBar !== false && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-gray-200 dark:bg-neutral-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${((stepIndex + 1) / Math.max(1, totalSteps)) * 100}%`, backgroundColor: accent }}
            />
          </div>
          <span className="text-xs text-gray-500 shrink-0">Section {stepIndex + 1}</span>
        </div>
      )}

      {settings?.collectEmail && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-900 dark:text-neutral-100">
            Email<span className="text-red-500"> *</span>
          </label>
          <input
            type="email"
            value={respondentEmail}
            onChange={(e) => { setRespondentEmail(e.target.value); setErrors((p) => ({ ...p, __email: "" })); }}
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:border-gray-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
          {errors.__email && <p className="text-xs text-red-600">{errors.__email}</p>}
        </div>
      )}

      {shownSections.map((section) => (
        <div key={section.id} className="space-y-4">
          {(section.title || section.description) && (
            <div>
              {section.title && (
                <h3 className="text-base font-semibold text-gray-900 dark:text-neutral-100">{section.title}</h3>
              )}
              {section.description && (
                <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">{section.description}</p>
              )}
            </div>
          )}
          {getVisibleFields(section, values).map((field) => (
            <QuestionRow
              key={field.id}
              field={field}
              value={values[field.name]}
              onChange={(v) => setValue(field.name, v)}
              error={errors[field.name]}
              slug={slug}
              accent={accent}
              theme={theme}
              isQuiz={settings?.isQuiz ?? false}
            />
          ))}
        </div>
      ))}

      {formError && <p className="text-xs text-red-600">{formError}</p>}

      <div className="flex items-center gap-3 pt-1">
        {isSteps && path.length > 1 && (
          <button
            type="button"
            onClick={goBack}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Back
          </button>
        )}
        {isLastStep ? (
          <button
            type="submit"
            disabled={submitting || !onSubmit}
            style={buttonStyle}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {submitting ? "Sending…" : submitLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            style={buttonStyle}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Next
          </button>
        )}
      </div>
    </form>
  );
}
