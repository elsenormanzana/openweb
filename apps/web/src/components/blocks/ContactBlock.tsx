import { useEffect, useState, type FormEvent } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { api, type FormField } from "@/lib/api";
import type { ContactBlockProps } from "@/lib/blocks";

const DEFAULT_FIELDS: FormField[] = [
  { id: "name", name: "name", label: "Name", type: "text", required: true, placeholder: "John Doe" },
  { id: "email", name: "email", label: "Email", type: "email", required: true, placeholder: "john@example.com" },
  { id: "subject", name: "subject", label: "Subject", type: "text", required: false, placeholder: "How can we help?" },
  { id: "message", name: "message", label: "Message", type: "textarea", required: true, placeholder: "Tell us more..." },
];

export function ContactBlock({ props }: { props: ContactBlockProps }) {
  const { heading, subheading, email, phone, address, showForm, formSlug, submitLabel, backgroundColor } = props;
  const [fields, setFields] = useState<FormField[]>(formSlug ? [] : DEFAULT_FIELDS);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formSlug) {
      setFields(DEFAULT_FIELDS);
      return;
    }
    api.forms.getBySlug(formSlug)
      .then((form) => setFields(form.fields.length ? form.fields : DEFAULT_FIELDS))
      .catch(() => setFields(DEFAULT_FIELDS));
  }, [formSlug]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      if (formSlug) {
        const res = await api.forms.submit(formSlug, { values, meta: { source: "contact_block" } });
        setSuccess(res.message || "Message sent.");
      } else {
        await api.crm.publicLead({
          channelSlug: "contact",
          name: values.name,
          email: values.email,
          phone: values.phone,
          company: values.company,
          notes: values.message || values.subject || undefined,
          payload: values,
        });
        setSuccess("Message sent.");
      }
      setValues({});
    } catch (err) {
      setError((err as Error).message || "Failed to submit form");
    } finally {
      setLoading(false);
    }
  }

  const visibleFields = fields.length ? fields : DEFAULT_FIELDS;

  return (
    <section
      className="w-full py-20 px-4"
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

          {showForm && (
            <form className="space-y-5 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm" onSubmit={onSubmit}>
              {visibleFields.map((field) => (
                <div key={field.id || field.name}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                    {field.label}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      rows={5}
                      value={values[field.name] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                      required={field.required}
                      placeholder={field.placeholder || ""}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
                    />
                  ) : (
                    <input
                      type={field.type === "email" ? "email" : "text"}
                      value={values[field.name] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                      required={field.required}
                      placeholder={field.placeholder || ""}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  )}
                </div>
              ))}
              {success && <p className="text-xs text-emerald-700">{success}</p>}
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold text-sm hover:bg-gray-700 transition-colors disabled:opacity-60"
              >
                {loading ? "Sending..." : submitLabel || "Send Message"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
