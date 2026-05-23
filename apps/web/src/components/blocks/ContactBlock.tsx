import { useEffect, useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { api, type CmsForm, type FormSection } from "@/lib/api";
import type { ContactBlockProps } from "@/lib/blocks";
import { FormRenderer } from "@/components/FormRenderer";
import type { FormValues } from "@/lib/formConditions";

// Fallback used when a contact block is linked to a form that has no fields yet.
const DEFAULT_SECTIONS: FormSection[] = [{
  id: "default", title: "", description: "", condition: null,
  fields: [
    { id: "name", name: "name", label: "Name", type: "text", required: true, placeholder: "John Doe", options: [], condition: null },
    { id: "email", name: "email", label: "Email", type: "email", required: true, placeholder: "john@example.com", options: [], condition: null },
    { id: "subject", name: "subject", label: "Subject", type: "text", required: false, placeholder: "How can we help?", options: [], condition: null },
    { id: "message", name: "message", label: "Message", type: "textarea", required: true, placeholder: "Tell us more...", options: [], condition: null },
  ],
}];

export function ContactBlock({ props }: { props: ContactBlockProps }) {
  const { heading, subheading, email, phone, address, showForm, formSource, iframeUrl, formSlug, submitLabel, backgroundColor } = props;
  const [form, setForm] = useState<CmsForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (formSource === "google") { setForm(null); setError(null); return; }
    if (!formSlug) { setForm(null); setError("This contact block is not linked to a native form."); return; }
    setError(null);
    api.forms.getBySlug(formSlug)
      .then(setForm)
      .catch(() => { setForm(null); setError("Linked form not found or inactive."); });
  }, [formSlug, formSource]);

  const canRenderNativeForm = Boolean(showForm && formSource === "native" && formSlug);
  const canRenderGoogleForm = Boolean(showForm && formSource === "google" && iframeUrl);
  const sections = form && form.sections.length ? form.sections : DEFAULT_SECTIONS;

  return (
    <section
      className="w-full ow-section px-4"
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <div className="max-w-5xl mx-auto">
        <div className={`grid gap-12 ${showForm ? "lg:grid-cols-2" : "max-w-2xl"}`}>
          <div className="space-y-8">
            {heading && (
              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{heading}</h2>
                {subheading && <p className="text-gray-500 leading-relaxed">{subheading}</p>}
              </div>
            )}
            <div className="space-y-5">
              {email && (
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 shrink-0">
                    <Mail className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Email</p>
                    <a href={`mailto:${email}`} className="text-gray-700 hover:text-blue-600 transition-colors">{email}</a>
                  </div>
                </div>
              )}
              {phone && (
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-50 shrink-0">
                    <Phone className="size-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Phone</p>
                    <a href={`tel:${phone}`} className="text-gray-700 hover:text-green-600 transition-colors">{phone}</a>
                  </div>
                </div>
              )}
              {address && (
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 shrink-0">
                    <MapPin className="size-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Office</p>
                    <p className="text-gray-700 whitespace-pre-line">{address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {canRenderNativeForm && (
            error ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            ) : form ? (
              <FormRenderer
                sections={sections}
                layout={form.layout}
                submitLabel={submitLabel || form.submitLabel}
                successMessage={form.successMessage}
                settings={form.settings}
                slug={formSlug as string}
                onSubmit={async (values: FormValues, meta) => {
                  await api.forms.submit(formSlug as string, { values, meta: { ...meta, source: "contact_block" } });
                }}
                className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm"
              />
            ) : null
          )}

          {canRenderGoogleForm && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[600px] flex">
              <iframe
                src={iframeUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                marginHeight={0}
                marginWidth={0}
                className="w-full h-full min-h-[600px]"
                title="Google Form"
              >
                Loading…
              </iframe>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
