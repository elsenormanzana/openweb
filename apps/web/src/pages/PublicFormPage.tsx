import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type CmsForm } from "@/lib/api";
import { FormRenderer } from "@/components/FormRenderer";
import { useInitialData } from "@/lib/initialData";
import { useSeoHead } from "@/lib/useSeoHead";
import { paletteToCSS, DEFAULT_PALETTE } from "@/lib/palette";
import type { FormValues } from "@/lib/formConditions";

/**
 * Standalone public form page at /forms/:slug — a minimal, distraction-free
 * page (logo + form), no site nav or footer.
 */
export function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const initial = useInitialData();
  const [form, setForm] = useState<CmsForm | null | undefined>(
    initial.form && initial.form.slug === slug ? initial.form : undefined
  );
  const [error, setError] = useState<string | null>(null);
  const settings = initial.settings ?? null;

  useEffect(() => {
    if (!slug || (form && form.slug === slug)) return;
    api.forms.getBySlug(slug)
      .then(setForm)
      .catch((e) => { setForm(null); setError((e as Error).message || "This form is not available."); });
  }, [slug]);

  useSeoHead({
    title: form?.name || undefined,
    description: form?.description || undefined,
    siteName: settings?.seoConfig?.globalSiteName || settings?.seoConfig?.siteName,
  });

  const nav = settings?.navConfig ?? {};
  const palette = { ...DEFAULT_PALETTE, ...(nav.palette ?? {}) };

  if (form === undefined) return null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--palette-background, #f8fafc)" }}
    >
      <style>{paletteToCSS(palette)}</style>
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          {nav.logoImage ? (
            <img src={nav.logoImage} alt={nav.logoText || "Logo"} className="h-9 mx-auto object-contain" />
          ) : nav.logoText ? (
            <span className="text-lg font-semibold" style={{ color: "var(--palette-text, #111827)" }}>{nav.logoText}</span>
          ) : null}
        </div>

        {form === null ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">{error || "This form is not available."}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            {(form.name || form.description) && (
              <div className="mb-5">
                {form.name && <h1 className="text-xl font-semibold text-gray-900">{form.name}</h1>}
                {form.description && <p className="text-sm text-gray-500 mt-1">{form.description}</p>}
              </div>
            )}
            <FormRenderer
              sections={form.sections}
              layout={form.layout}
              submitLabel={form.submitLabel}
              successMessage={form.successMessage}
              onSubmit={async (values: FormValues) => {
                await api.forms.submit(form.slug, { values, meta: { source: "public_form" } });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
