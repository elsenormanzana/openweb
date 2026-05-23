import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Globe } from "lucide-react";
import { api, type CmsForm } from "@/lib/api";
import { FormRenderer } from "@/components/FormRenderer";
import { useInitialData } from "@/lib/initialData";
import { useSeoHead } from "@/lib/useSeoHead";
import { paletteToCSS, DEFAULT_PALETTE } from "@/lib/palette";
import { applyPageTheme } from "@/lib/theme";
import { FONT_PRESET_CSS } from "@/lib/formFields";
import { applyTranslation, LANGUAGES, languageLabel } from "@/lib/formLanguages";
import type { FormValues } from "@/lib/formConditions";

/**
 * Standalone public form page at /forms/:slug — a minimal, distraction-free
 * page (logo + themed form card + language switcher), no site nav or footer.
 */
export function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const initial = useInitialData();
  const [form, setForm] = useState<CmsForm | null | undefined>(
    initial.form && initial.form.slug === slug ? initial.form : undefined
  );
  const [error, setError] = useState<string | null>(null);
  const [userLang, setUserLang] = useState<string | null>(null);
  const settings = initial.settings ?? null;

  useEffect(() => {
    applyPageTheme(null, settings?.navConfig?.defaultTheme);
  }, [settings]);

  useEffect(() => {
    if (!slug || (form && form.slug === slug)) return;
    api.forms.getBySlug(slug)
      .then(setForm)
      .catch((e) => { setForm(null); setError((e as Error).message || "This form is not available."); });
  }, [slug]);

  const availableLangs = useMemo(() => {
    if (!form) return [] as string[];
    const set = new Set<string>([form.primaryLanguage]);
    for (const code of Object.keys(form.translations)) set.add(code);
    return Array.from(set);
  }, [form]);

  // Effective language: explicit user choice wins, otherwise auto-detect from the
  // browser when the form has a matching translation, otherwise the primary language.
  const lang = useMemo(() => {
    if (!form) return null;
    if (userLang) return userLang;
    const browser = typeof navigator !== "undefined" ? navigator.language?.split("-")[0] ?? "" : "";
    return availableLangs.includes(browser) ? browser : form.primaryLanguage;
  }, [form, userLang, availableLangs]);

  const translated = useMemo(() => (form ? applyTranslation(form, lang) : null), [form, lang]);

  useSeoHead({
    title: translated?.name || form?.name || undefined,
    description: translated?.description || form?.description || undefined,
    siteName: settings?.seoConfig?.globalSiteName || settings?.seoConfig?.siteName,
  });

  const nav = settings?.navConfig ?? {};
  const palette = { ...DEFAULT_PALETTE, ...(nav.palette ?? {}) };

  if (form === undefined) return null;

  const theme = form?.theme;
  const pageStyle = theme ? { backgroundColor: theme.backgroundColor } : undefined;

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-12 bg-[var(--palette-background,#f8fafc)] dark:bg-neutral-950"
      style={pageStyle}
    >
      <style>{paletteToCSS(palette)}</style>
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          {nav.logoImage ? (
            <img src={nav.logoImage} alt={nav.logoText || "Logo"} className="h-9 mx-auto object-contain" />
          ) : nav.logoText ? (
            <span className="text-lg font-semibold text-gray-900 dark:text-neutral-100">{nav.logoText}</span>
          ) : null}
        </div>

        {form === null ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm text-gray-500 dark:text-neutral-400">{error || "This form is not available."}</p>
          </div>
        ) : translated && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-neutral-800 dark:bg-neutral-900">
            {theme?.headerImage && (
              <img src={theme.headerImage} alt="" className="w-full max-h-44 object-cover" />
            )}
            <div className="p-6 sm:p-8">
              {availableLangs.length > 1 && (
                <div className="flex justify-end mb-3">
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                    <Globe className="size-3.5" />
                    <select
                      value={lang ?? form.primaryLanguage}
                      onChange={(e) => setUserLang(e.target.value)}
                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                    >
                      {availableLangs.map((code) => (
                        <option key={code} value={code}>
                          {LANGUAGES.find((l) => l.code === code)?.nativeName ?? languageLabel(code)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {(translated.name || translated.description) && (
                <div className="mb-6">
                  {translated.name && (
                    <h1
                      className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-neutral-100"
                      style={theme ? { fontFamily: FONT_PRESET_CSS[theme.headerFont] } : undefined}
                    >
                      {translated.name}
                    </h1>
                  )}
                  {theme && (
                    <div className="mt-2 h-1 w-10 rounded-full" style={{ backgroundColor: theme.themeColor }} />
                  )}
                  {translated.description && (
                    <p className="text-sm text-gray-500 dark:text-neutral-400 mt-3">{translated.description}</p>
                  )}
                </div>
              )}
              <FormRenderer
                sections={translated.sections}
                layout={form.layout}
                submitLabel={translated.submitLabel}
                successMessage={translated.successMessage}
                theme={form.theme}
                settings={{ ...form.settings, closedMessage: translated.closedMessage }}
                slug={form.slug}
                labelOverrides={translated.labelOverrides}
                onSubmit={async (values: FormValues, meta) => {
                  const res = await api.forms.submit(form.slug, {
                    values,
                    meta: { ...meta, source: "public_form", language: translated.appliedLang },
                  });
                  return { score: res.score };
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
