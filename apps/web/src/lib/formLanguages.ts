import type { CmsForm, FormSection } from "@/lib/api";

export type LanguageDef = { code: string; name: string; nativeName: string };

/** Common languages offered in the language picker. ISO 639-1 codes. */
export const LANGUAGES: LanguageDef[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "no", name: "Norwegian", nativeName: "Norsk" },
  { code: "da", name: "Danish", nativeName: "Dansk" },
  { code: "fi", name: "Finnish", nativeName: "Suomi" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "he", name: "Hebrew", nativeName: "עברית" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
];

export function languageLabel(code: string): string {
  const l = LANGUAGES.find((x) => x.code === code);
  return l ? `${l.name} (${l.nativeName})` : code;
}

export function languageName(code: string): string {
  return LANGUAGES.find((x) => x.code === code)?.name ?? code;
}

/** Display-only label overrides for choice/grid questions (values stay primary-language). */
export type LabelOverrides = Record<string, { options?: string[]; rows?: string[]; columns?: string[] }>;

export type TranslatedForm = {
  name: string;
  description: string | null;
  submitLabel: string;
  successMessage: string;
  closedMessage: string;
  sections: FormSection[];
  labelOverrides: LabelOverrides;
  /** The active language code that was applied (primary if no translation). */
  appliedLang: string;
};

/**
 * Return the form's content in the requested language, falling back to primary text
 * field-by-field. Choice/grid OPTION arrays stay in the primary language (they're the
 * stored response values); their translated display strings come back as `labelOverrides`.
 */
export function applyTranslation(form: CmsForm, lang: string | null | undefined): TranslatedForm {
  const useLang = lang && lang !== form.primaryLanguage ? lang : form.primaryLanguage;
  const t = useLang !== form.primaryLanguage ? form.translations[useLang] : null;

  if (!t) {
    return {
      name: form.name,
      description: form.description,
      submitLabel: form.submitLabel,
      successMessage: form.successMessage,
      closedMessage: form.settings.closedMessage,
      sections: form.sections,
      labelOverrides: {},
      appliedLang: form.primaryLanguage,
    };
  }

  const labelOverrides: LabelOverrides = {};
  const sections = form.sections.map((s) => {
    const st = t.sections?.[s.id] ?? {};
    return {
      ...s,
      title: st.title || s.title,
      description: st.description ?? s.description,
      fields: s.fields.map((f) => {
        const ft = t.fields?.[f.id] ?? {};
        const ov: LabelOverrides[string] = {};
        if (ft.options && f.options) ov.options = f.options.map((o, i) => ft.options?.[i] || o);
        if (ft.rows && f.rows) ov.rows = f.rows.map((r, i) => ft.rows?.[i] || r);
        if (ft.columns && f.columns) ov.columns = f.columns.map((c, i) => ft.columns?.[i] || c);
        if (ov.options || ov.rows || ov.columns) labelOverrides[f.id] = ov;
        return {
          ...f,
          label: ft.label || f.label,
          description: ft.description ?? f.description,
          placeholder: ft.placeholder ?? f.placeholder,
          scaleMinLabel: ft.scaleMinLabel ?? f.scaleMinLabel,
          scaleMaxLabel: ft.scaleMaxLabel ?? f.scaleMaxLabel,
        };
      }),
    };
  });

  return {
    name: t.name || form.name,
    description: t.description ?? form.description,
    submitLabel: t.submitLabel || form.submitLabel,
    successMessage: t.successMessage || form.successMessage,
    closedMessage: t.closedMessage || form.settings.closedMessage,
    sections,
    labelOverrides,
    appliedLang: useLang,
  };
}
