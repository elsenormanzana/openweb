import { useState } from "react";
import { ChevronDown, Languages, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { api, type FormSection, type FormTranslations } from "@/lib/api";
import { LANGUAGES, languageLabel, languageName } from "@/lib/formLanguages";
import { Field, inputCls } from "@/components/form-builder/ui";

type LanguagesPanelProps = {
  formId: number;
  /** Primary-language strings, shown side-by-side with the translation inputs. */
  primary: {
    name: string;
    description: string;
    submitLabel: string;
    successMessage: string;
    closedMessage: string;
    sections: FormSection[];
  };
  primaryLanguage: string;
  translations: Record<string, FormTranslations>;
  onPrimaryLanguage: (lang: string) => void;
  onTranslations: (next: Record<string, FormTranslations>) => void;
  onClose: () => void;
};

// ── Pure helpers to set deep keys on a FormTranslations object ─────────────────

type FormProp = "name" | "description" | "submitLabel" | "successMessage" | "closedMessage";
type SectionProp = "title" | "description";
type FieldProp = "label" | "description" | "placeholder" | "scaleMinLabel" | "scaleMaxLabel";
type FieldArrProp = "options" | "rows" | "columns";

function setFormProp(t: FormTranslations, key: FormProp, value: string): FormTranslations {
  return { ...t, [key]: value };
}
function setSectionProp(t: FormTranslations, id: string, key: SectionProp, value: string): FormTranslations {
  const sections = { ...(t.sections ?? {}) };
  sections[id] = { ...(sections[id] ?? {}), [key]: value };
  return { ...t, sections };
}
function setFieldProp(t: FormTranslations, id: string, key: FieldProp, value: string): FormTranslations {
  const fields = { ...(t.fields ?? {}) };
  fields[id] = { ...(fields[id] ?? {}), [key]: value };
  return { ...t, fields };
}
function setFieldArr(t: FormTranslations, id: string, key: FieldArrProp, index: number, value: string, length: number): FormTranslations {
  const fields = { ...(t.fields ?? {}) };
  const cur = { ...(fields[id] ?? {}) };
  const arr = (cur[key] ?? []).slice();
  while (arr.length < length) arr.push("");
  arr[index] = value;
  cur[key] = arr;
  fields[id] = cur;
  return { ...t, fields };
}

// ── Panel ────────────────────────────────────────────────────────────────────

export function LanguagesPanel(props: LanguagesPanelProps) {
  const { formId, primary, primaryLanguage, translations, onPrimaryLanguage, onTranslations, onClose } = props;
  const [newLang, setNewLang] = useState(() => LANGUAGES.find((l) => l.code !== primaryLanguage)?.code ?? "es");
  const [translating, setTranslating] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const addedLangs = Object.keys(translations).filter((l) => l !== primaryLanguage);
  const availableToAdd = LANGUAGES.filter((l) => l.code !== primaryLanguage && !translations[l.code]);

  async function translateFor(lang: string) {
    setTranslating(lang);
    setWarning(null);
    try {
      const res = await api.forms.translate(formId, lang, languageName(lang));
      onTranslations({ ...translations, [lang]: res.translations });
      if (res.warning) setWarning(res.warning);
      setExpanded(lang);
    } catch (e) {
      setWarning((e as Error).message || "Translate failed");
    } finally {
      setTranslating(null);
    }
  }

  async function regenerate(lang: string) {
    if (!confirm(`Re-translate ${languageName(lang)}? Existing edits will be replaced.`)) return;
    await translateFor(lang);
  }

  function removeLanguage(lang: string) {
    if (!confirm(`Remove ${languageName(lang)} translation?`)) return;
    const next = { ...translations };
    delete next[lang];
    onTranslations(next);
    if (expanded === lang) setExpanded(null);
  }

  return (
    <div className="absolute inset-0 z-20 flex justify-end">
      <button className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Close languages panel" />
      <div className="relative w-[28rem] max-w-full bg-background border-l border-border h-full overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold inline-flex items-center gap-1.5">
            <Languages className="size-4" /> Languages
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <Field label="Primary language" hint="The language you author the form in.">
          <select
            className={inputCls}
            value={primaryLanguage}
            onChange={(e) => onPrimaryLanguage(e.target.value)}
          >
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{languageLabel(l.code)}</option>)}
          </select>
        </Field>

        {warning && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-900/20">
            {warning}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Translations</p>
          {addedLangs.length === 0 && (
            <p className="text-xs text-muted-foreground">No translations yet — add one below.</p>
          )}
          {addedLangs.map((lang) => (
            <div key={lang} className="rounded-xl border border-border bg-background">
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  onClick={() => setExpanded((e) => (e === lang ? null : lang))}
                  className="flex items-center gap-2 flex-1 text-left text-sm"
                >
                  <ChevronDown className={`size-4 text-muted-foreground transition-transform ${expanded === lang ? "rotate-0" : "-rotate-90"}`} />
                  <span className="font-medium">{languageLabel(lang)}</span>
                </button>
                <button
                  onClick={() => regenerate(lang)}
                  disabled={translating === lang}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-50"
                  title="Re-translate from primary"
                  aria-label="Re-translate"
                >
                  {translating === lang ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                </button>
                <button
                  onClick={() => removeLanguage(lang)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                  title="Remove"
                  aria-label="Remove"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {expanded === lang && (
                <div className="border-t border-border/60 p-3">
                  <TranslationEditor
                    primary={primary}
                    t={translations[lang] ?? {}}
                    onChange={(next) => onTranslations({ ...translations, [lang]: next })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">Add another language</p>
          <div className="flex gap-2">
            <select
              className={inputCls}
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
              disabled={availableToAdd.length === 0}
            >
              {availableToAdd.map((l) => <option key={l.code} value={l.code}>{languageLabel(l.code)}</option>)}
            </select>
            <button
              onClick={() => translateFor(newLang)}
              disabled={translating !== null || availableToAdd.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-3 py-2 text-sm font-medium disabled:opacity-60 shrink-0"
            >
              {translating === newLang ? <Loader2 className="size-4 animate-spin" /> : <Languages className="size-4" />}
              Translate
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Auto-translation uses the Anthropic API (set <code>ANTHROPIC_API_KEY</code>). Without a key, the source text is copied so you can edit manually.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Editor ───────────────────────────────────────────────────────────────────

function TranslationEditor({
  primary, t, onChange,
}: {
  primary: LanguagesPanelProps["primary"];
  t: FormTranslations;
  onChange: (next: FormTranslations) => void;
}) {
  const getF = (k: FormProp) => t[k] ?? "";
  const getS = (id: string, k: SectionProp) => t.sections?.[id]?.[k] ?? "";
  const getFld = (id: string, k: FieldProp) => t.fields?.[id]?.[k] ?? "";
  const getArr = (id: string, k: FieldArrProp, i: number) => t.fields?.[id]?.[k]?.[i] ?? "";

  return (
    <div className="space-y-4 text-xs">
      <Group title="General">
        <RowEditor label="Title" primary={primary.name} value={getF("name")} onChange={(v) => onChange(setFormProp(t, "name", v))} />
        {primary.description && (
          <RowEditor label="Description" primary={primary.description} value={getF("description")} onChange={(v) => onChange(setFormProp(t, "description", v))} multiline />
        )}
        <RowEditor label="Submit button" primary={primary.submitLabel} value={getF("submitLabel")} onChange={(v) => onChange(setFormProp(t, "submitLabel", v))} />
        <RowEditor label="Success message" primary={primary.successMessage} value={getF("successMessage")} onChange={(v) => onChange(setFormProp(t, "successMessage", v))} multiline />
        {primary.closedMessage && (
          <RowEditor label="Closed message" primary={primary.closedMessage} value={getF("closedMessage")} onChange={(v) => onChange(setFormProp(t, "closedMessage", v))} multiline />
        )}
      </Group>

      {primary.sections.map((s, si) => (
        <Group key={s.id} title={`Section ${si + 1}${s.title ? ` — ${s.title}` : ""}`}>
          {s.title && (
            <RowEditor label="Section title" primary={s.title} value={getS(s.id, "title")} onChange={(v) => onChange(setSectionProp(t, s.id, "title", v))} />
          )}
          {s.description && (
            <RowEditor label="Section description" primary={s.description} value={getS(s.id, "description")} onChange={(v) => onChange(setSectionProp(t, s.id, "description", v))} multiline />
          )}
          {s.fields.map((f, fi) => (
            <div key={f.id} className="rounded-md bg-muted/30 p-2 space-y-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Q{fi + 1}</p>
              <RowEditor label="Label" primary={f.label} value={getFld(f.id, "label")} onChange={(v) => onChange(setFieldProp(t, f.id, "label", v))} />
              {f.description && (
                <RowEditor label="Description" primary={f.description} value={getFld(f.id, "description")} onChange={(v) => onChange(setFieldProp(t, f.id, "description", v))} multiline />
              )}
              {f.placeholder && (
                <RowEditor label="Placeholder" primary={f.placeholder} value={getFld(f.id, "placeholder")} onChange={(v) => onChange(setFieldProp(t, f.id, "placeholder", v))} />
              )}
              {f.scaleMinLabel && (
                <RowEditor label="Scale min label" primary={f.scaleMinLabel} value={getFld(f.id, "scaleMinLabel")} onChange={(v) => onChange(setFieldProp(t, f.id, "scaleMinLabel", v))} />
              )}
              {f.scaleMaxLabel && (
                <RowEditor label="Scale max label" primary={f.scaleMaxLabel} value={getFld(f.id, "scaleMaxLabel")} onChange={(v) => onChange(setFieldProp(t, f.id, "scaleMaxLabel", v))} />
              )}
              {(f.options ?? []).map((opt, i) => (
                <RowEditor key={`opt-${i}`} label={`Option ${i + 1}`} primary={opt} value={getArr(f.id, "options", i)} onChange={(v) => onChange(setFieldArr(t, f.id, "options", i, v, (f.options ?? []).length))} />
              ))}
              {(f.rows ?? []).map((r, i) => (
                <RowEditor key={`row-${i}`} label={`Row ${i + 1}`} primary={r} value={getArr(f.id, "rows", i)} onChange={(v) => onChange(setFieldArr(t, f.id, "rows", i, v, (f.rows ?? []).length))} />
              ))}
              {(f.columns ?? []).map((c, i) => (
                <RowEditor key={`col-${i}`} label={`Column ${i + 1}`} primary={c} value={getArr(f.id, "columns", i)} onChange={(v) => onChange(setFieldArr(t, f.id, "columns", i, v, (f.columns ?? []).length))} />
              ))}
            </div>
          ))}
        </Group>
      ))}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RowEditor({
  label, primary, value, onChange, multiline,
}: {
  label: string; primary: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 items-start">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        {primary ? (
          <div
            className="text-xs text-foreground/70 break-words prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: primary }}
          />
        ) : (
          <p className="text-xs text-muted-foreground italic">—</p>
        )}
      </div>
      {multiline ? (
        <textarea
          className={`${inputCls} resize-y`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="Translation"
        />
      ) : (
        <input
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Translation"
        />
      )}
    </div>
  );
}
