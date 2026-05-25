import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Check, Cloud, Eye, Languages, Loader2, Palette, Pencil, Save, Send } from "lucide-react";
import {
  api, type CmsForm, type FormLayout, type FormSection, type FormSettings, type FormTheme,
  type FormTranslations,
} from "@/lib/api";
import { defaultSettings, defaultTheme, FONT_PRESET_CSS, uid } from "@/lib/formFields";
import { FormRenderer } from "@/components/FormRenderer";
import { QuestionsTab } from "@/components/form-builder/QuestionsTab";
import { SettingsTab } from "@/components/form-builder/SettingsTab";
import { ResponsesTab } from "@/components/form-builder/ResponsesTab";
import { ThemePanel } from "@/components/form-builder/ThemePanel";
import { LanguagesPanel } from "@/components/form-builder/LanguagesPanel";

type FormDraft = {
  name: string;
  slug: string;
  description: string;
  status: "active" | "inactive";
  submitLabel: string;
  successMessage: string;
  layout: FormLayout;
  sections: FormSection[];
  theme: FormTheme;
  settings: FormSettings;
  primaryLanguage: string;
  translations: Record<string, FormTranslations>;
};

function isEquivalent(val1: any, val2: any): boolean {
  if (val1 === val2) return true;
  
  const v1 = val1 === undefined ? null : val1;
  const v2 = val2 === undefined ? null : val2;
  if (v1 === v2) return true;
  
  if (v1 === null || v2 === null) return false;
  
  if (Array.isArray(v1) && Array.isArray(v2)) {
    if (v1.length !== v2.length) return false;
    return v1.every((x, i) => isEquivalent(x, v2[i]));
  }
  
  if (typeof v1 === "object" && typeof v2 === "object") {
    const keys = new Set([...Object.keys(v1), ...Object.keys(v2)]);
    for (const key of keys) {
      if (!isEquivalent(v1[key], v2[key])) return false;
    }
    return true;
  }
  
  return false;
}

function isDraftDifferent(a: FormDraft | null, b: FormDraft | null): boolean {
  if (!a || !b) return false;
  return (
    a.name !== b.name ||
    a.slug !== b.slug ||
    a.description !== b.description ||
    a.status !== b.status ||
    a.submitLabel !== b.submitLabel ||
    a.successMessage !== b.successMessage ||
    a.layout !== b.layout ||
    a.primaryLanguage !== b.primaryLanguage ||
    !isEquivalent(a.sections, b.sections) ||
    !isEquivalent(a.theme, b.theme) ||
    !isEquivalent(a.settings, b.settings) ||
    !isEquivalent(a.translations, b.translations)
  );
}

function hasUnpublishedChanges(d: FormDraft | null, f: CmsForm | null): boolean {
  if (!f) return false;
  if (!f.publishedAt) return true; // Never published
  if (!d) return false;
  
  const publishedDraft: FormDraft = {
    name: f.publishedName ?? "",
    slug: f.slug,
    description: f.publishedDescription ?? "",
    status: f.status,
    submitLabel: f.publishedSubmitLabel ?? "Submit",
    successMessage: f.publishedSuccessMessage ?? "Thanks, we received your submission.",
    layout: f.publishedLayout ?? "single",
    sections: f.publishedSections ?? [],
    theme: f.publishedTheme ?? defaultTheme(),
    settings: f.publishedSettings ?? defaultSettings(),
    primaryLanguage: f.publishedPrimaryLanguage ?? "en",
    translations: f.publishedTranslations ?? {},
  };

  return (
    d.name !== publishedDraft.name ||
    d.description !== publishedDraft.description ||
    d.submitLabel !== publishedDraft.submitLabel ||
    d.successMessage !== publishedDraft.successMessage ||
    d.layout !== publishedDraft.layout ||
    d.primaryLanguage !== publishedDraft.primaryLanguage ||
    !isEquivalent(d.sections, publishedDraft.sections) ||
    !isEquivalent(d.theme, publishedDraft.theme) ||
    !isEquivalent(d.settings, publishedDraft.settings) ||
    !isEquivalent(d.translations, publishedDraft.translations)
  );
}

type BuilderTab = "questions" | "responses" | "settings";

function draftFromForm(form: CmsForm): FormDraft {
  return {
    name: form.name,
    slug: form.slug,
    description: form.description ?? "",
    status: form.status,
    submitLabel: form.submitLabel,
    successMessage: form.successMessage,
    layout: form.layout,
    sections: form.sections.length
      ? form.sections
      : [{ id: uid("s"), title: "", description: "", condition: null, afterSection: null, fields: form.fields }],
    theme: form.theme ?? defaultTheme(),
    settings: form.settings ?? defaultSettings(),
    primaryLanguage: form.primaryLanguage || "en",
    translations: form.translations ?? {},
  };
}

/** Full-screen Google-Forms-style builder: Questions / Responses / Settings. */
export function FormBuilderShell() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<CmsForm | null>(null);
  const [draft, setDraft] = useState<FormDraft | null>(null);
  const [tab, setTab] = useState<BuilderTab>(
    searchParams.get("tab") === "responses" ? "responses"
      : searchParams.get("tab") === "settings" ? "settings" : "questions",
  );
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [languagesOpen, setLanguagesOpen] = useState(false);

  const isSavingRef = useRef(false);
  const draftRef = useRef<FormDraft | null>(null);
  draftRef.current = draft;
  const formRef = useRef<CmsForm | null>(null);
  formRef.current = form;

  useEffect(() => {
    if (!id) return;
    api.forms.get(Number(id))
      .then((f) => { setForm(f); setDraft(draftFromForm(f)); })
      .catch((e) => setError((e as Error).message || "Form not found"));
  }, [id]);

  function patchDraft(patch: Partial<FormDraft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  // Auto-save logic
  useEffect(() => {
    if (!draft || !form) return;

    const savedDraft = draftFromForm(form);
    const hasChanges = isDraftDifferent(draft, savedDraft);

    if (!hasChanges) {
      setSaveStatus((prev) => (prev === "saving" ? "saving" : "saved"));
      return;
    }

    setSaveStatus("unsaved");

    const timer = setTimeout(() => {
      autoSave();
    }, 1500);

    return () => clearTimeout(timer);
  }, [draft, form]);

  // Unload warning logic
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      const savedDraft = form ? draftFromForm(form) : null;
      if (draft && savedDraft && isDraftDifferent(draft, savedDraft)) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [draft, form]);

  async function autoSave() {
    if (isSavingRef.current || !draftRef.current || !id) return;
    isSavingRef.current = true;
    setSaveStatus("saving");
    try {
      const currentDraft = draftRef.current;
      const updated = await api.forms.update(Number(id), {
        name: currentDraft.name, slug: currentDraft.slug, description: currentDraft.description, status: currentDraft.status,
        submitLabel: currentDraft.submitLabel, successMessage: currentDraft.successMessage,
        layout: currentDraft.layout, sections: currentDraft.sections, theme: currentDraft.theme, settings: currentDraft.settings,
        primaryLanguage: currentDraft.primaryLanguage, translations: currentDraft.translations,
      });
      setForm(updated);
      setSaveStatus("saved");
    } catch (e) {
      console.error("Auto-save error:", e);
      setError((e as Error).message || "Auto-save failed");
      setSaveStatus("error");
    } finally {
      isSavingRef.current = false;
    }
  }

  async function saveImmediately(): Promise<CmsForm | null> {
    if (!draftRef.current || !id) return null;
    
    if (isSavingRef.current) {
      const savedDraft = draftFromForm(formRef.current!);
      if (!isDraftDifferent(draftRef.current, savedDraft)) {
        return formRef.current;
      }
    }

    setSaveStatus("saving");
    isSavingRef.current = true;
    try {
      const currentDraft = draftRef.current;
      const updated = await api.forms.update(Number(id), {
        name: currentDraft.name, slug: currentDraft.slug, description: currentDraft.description, status: currentDraft.status,
        submitLabel: currentDraft.submitLabel, successMessage: currentDraft.successMessage,
        layout: currentDraft.layout, sections: currentDraft.sections, theme: currentDraft.theme, settings: currentDraft.settings,
        primaryLanguage: currentDraft.primaryLanguage, translations: currentDraft.translations,
      });
      setForm(updated);
      setSaveStatus("saved");
      return updated;
    } catch (e) {
      console.error("Manual save error:", e);
      setError((e as Error).message || "Save failed");
      setSaveStatus("error");
      throw e;
    } finally {
      isSavingRef.current = false;
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      const savedForm = await saveImmediately();
      const targetForm = savedForm || form;
      if (!targetForm) throw new Error("No form to publish");

      const updated = await api.forms.publish(targetForm.id);
      setForm(updated);
      setDraft(draftFromForm(updated));
    } catch (e) {
      console.error("Publish error:", e);
      setError((e as Error).message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  }

  if (!draft || !form) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{error || "Loading form…"}</p>
      </div>
    );
  }

  const tabs: { id: BuilderTab; label: string }[] = [
    { id: "questions", label: "Questions" },
    { id: "responses", label: "Responses" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Toolbar */}
      <div className="h-14 shrink-0 flex items-center gap-2 px-3 border-b border-border bg-background">
        <button onClick={() => navigate("/admin/forms")} className="rounded-lg p-2 hover:bg-muted" aria-label="Back to forms">
          <ArrowLeft className="size-4" />
        </button>
        <input
          value={draft.name}
          onChange={(e) => patchDraft({ name: e.target.value })}
          className="font-semibold bg-transparent px-1 py-1 rounded outline-none focus:bg-muted/60 min-w-0"
          placeholder="Form title"
        />

        {/* Save Status Indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2">
          {saveStatus === "saving" && (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Cloud className="size-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-500">Saved to cloud</span>
            </>
          )}
          {saveStatus === "unsaved" && (
            <>
              <Cloud className="size-3.5 text-amber-500" />
              <span className="text-amber-600 dark:text-amber-500">Unsaved changes</span>
            </>
          )}
          {saveStatus === "error" && (
            <>
              <AlertCircle className="size-3.5 text-destructive" />
              <span className="text-destructive font-medium">Failed to save</span>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {error && <span className="text-xs text-destructive mr-1">{error}</span>}

          {/* Draft/Published Status Badge */}
          {form.publishedAt ? (
            hasUnpublishedChanges(draft, form) && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400">
                Unpublished Draft
              </span>
            )
          ) : (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-800 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-400">
              Not Published
            </span>
          )}

          <button
            onClick={() => setThemeOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
          >
            <Palette className="size-4" /> Theme
          </button>
          <button
            onClick={() => setLanguagesOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
          >
            <Languages className="size-4" />
            Languages
            {Object.keys(draft.translations).length > 0 && (
              <span className="ml-0.5 rounded-full bg-foreground text-background text-[10px] px-1.5">{Object.keys(draft.translations).length}</span>
            )}
          </button>
          {tab === "questions" && (
            <button
              onClick={() => setPreview((p) => !p)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm ${preview ? "bg-foreground text-background" : "border border-border hover:bg-muted"}`}
            >
              {preview ? <Pencil className="size-4" /> : <Eye className="size-4" />}
              {preview ? "Edit" : "Preview"}
            </button>
          )}
          {/* Save Draft Button */}
          <button
            onClick={() => saveImmediately()}
            disabled={saveStatus === "saving" || saveStatus === "saved"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted disabled:opacity-50 transition-colors"
          >
            <Save className="size-4" />
            {saveStatus === "saving" ? "Saving..." : "Save Draft"}
          </button>

          {/* Publish / Published Button */}
          {hasUnpublishedChanges(draft, form) ? (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-sm font-medium transition-colors shadow-sm disabled:opacity-60"
            >
              <Send className="size-4" />
              {publishing ? "Publishing..." : "Publish"}
            </button>
          ) : (
            <button
              disabled
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-1.5 text-sm font-medium dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400"
            >
              <Check className="size-4" />
              Published
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="h-11 shrink-0 flex items-center gap-1 px-3 border-b border-border bg-background">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setPreview(false); }}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${tab === t.id ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-muted/20 p-6">
        {tab === "questions" && !preview && (
          <QuestionsTab
            name={draft.name}
            description={draft.description}
            theme={draft.theme}
            layout={draft.layout}
            isQuiz={draft.settings.isQuiz}
            sections={draft.sections}
            onName={(v) => patchDraft({ name: v })}
            onDescription={(v) => patchDraft({ description: v })}
            onSections={(next) => patchDraft({ sections: next })}
          />
        )}
        {tab === "questions" && preview && (
          <div
            className="max-w-xl mx-auto rounded-2xl"
            style={{ backgroundColor: draft.theme.backgroundColor }}
          >
            <div className="bg-white m-4 rounded-2xl border border-border overflow-hidden">
              {draft.theme.headerImage && <img src={draft.theme.headerImage} alt="" className="w-full max-h-36 object-cover" />}
              <div className="p-6">
                <h1
                  className="text-2xl font-semibold tracking-tight text-gray-900"
                  style={{ fontFamily: FONT_PRESET_CSS[draft.theme.headerFont] }}
                >
                  {draft.name || "Untitled form"}
                </h1>
                <div className="mt-2 h-1 w-10 rounded-full" style={{ backgroundColor: draft.theme.themeColor }} />
                {draft.description && (
                  <div
                    className="text-sm text-gray-500 mt-3 prose prose-sm max-w-none prose-p:my-0.5"
                    dangerouslySetInnerHTML={{ __html: draft.description }}
                  />
                )}
                <div className="mt-5">
                  <FormRenderer
                    sections={draft.sections}
                    layout={draft.layout}
                    submitLabel={draft.submitLabel}
                    successMessage={draft.successMessage}
                    theme={draft.theme}
                    settings={draft.settings}
                    slug={draft.slug}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === "responses" && <ResponsesTab form={form} />}
        {tab === "settings" && (
          <SettingsTab
            slug={draft.slug}
            status={draft.status}
            layout={draft.layout}
            submitLabel={draft.submitLabel}
            successMessage={draft.successMessage}
            settings={draft.settings}
            onField={(patch) => patchDraft(patch)}
            onSettings={(patch) => patchDraft({ settings: { ...draft.settings, ...patch } })}
          />
        )}
      </div>

      {themeOpen && (
        <ThemePanel
          theme={draft.theme}
          onChange={(patch) => patchDraft({ theme: { ...draft.theme, ...patch } })}
          onClose={() => setThemeOpen(false)}
        />
      )}

      {languagesOpen && (
        <LanguagesPanel
          formId={form.id}
          primary={{
            name: draft.name,
            description: draft.description,
            submitLabel: draft.submitLabel,
            successMessage: draft.successMessage,
            closedMessage: draft.settings.closedMessage,
            sections: draft.sections,
          }}
          primaryLanguage={draft.primaryLanguage}
          translations={draft.translations}
          onPrimaryLanguage={(lang) => patchDraft({ primaryLanguage: lang })}
          onTranslations={(next) => patchDraft({ translations: next })}
          onClose={() => setLanguagesOpen(false)}
        />
      )}
    </div>
  );
}
