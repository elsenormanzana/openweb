import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, Languages, Palette, Pencil, Save } from "lucide-react";
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
  const [preview, setPreview] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.forms.get(Number(id))
      .then((f) => { setForm(f); setDraft(draftFromForm(f)); })
      .catch((e) => setError((e as Error).message || "Form not found"));
  }, [id]);

  function patchDraft(patch: Partial<FormDraft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  async function save() {
    if (!draft || !id) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.forms.update(Number(id), {
        name: draft.name, slug: draft.slug, description: draft.description, status: draft.status,
        submitLabel: draft.submitLabel, successMessage: draft.successMessage,
        layout: draft.layout, sections: draft.sections, theme: draft.theme, settings: draft.settings,
        primaryLanguage: draft.primaryLanguage, translations: draft.translations,
      });
      setForm(updated);
      setDraft(draftFromForm(updated));
    } catch (e) {
      setError((e as Error).message || "Failed to save");
    } finally {
      setSaving(false);
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
        <div className="ml-auto flex items-center gap-1.5">
          {error && <span className="text-xs text-destructive mr-1">{error}</span>}
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
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-3 py-1.5 text-sm font-medium disabled:opacity-60"
          >
            <Save className="size-4" /> {saving ? "Saving…" : "Save"}
          </button>
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
