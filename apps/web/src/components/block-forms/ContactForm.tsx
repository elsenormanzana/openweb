import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { api, type CmsForm } from "@/lib/api";
import type { ContactBlockProps } from "@/lib/blocks";
import { Field, Textarea, ColorField } from "./shared";

export function ContactForm({ props, onChange }: { props: ContactBlockProps; onChange: (p: ContactBlockProps) => void }) {
  const set = <K extends keyof ContactBlockProps>(k: K, v: ContactBlockProps[K]) => onChange({ ...props, [k]: v });
  const [forms, setForms] = useState<CmsForm[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.forms.list()
      .then((rows) => {
        if (!mounted) return;
        const active = rows.filter((f) => f.status === "active");
        setForms(active);
      })
      .catch(() => {
        if (!mounted) return;
        setForms([]);
      })
      .finally(() => {
        if (mounted) setFormsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!props.showForm) set("showForm", true);
  }, [props.showForm]);

  useEffect(() => {
    if (forms.length === 0) return;
    if (!props.formSlug || !forms.some((f) => f.slug === props.formSlug)) {
      set("formSlug", forms[0].slug);
    }
  }, [forms, props.formSlug]);

  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Subheading"><Textarea value={props.subheading} onChange={(v) => set("subheading", v)} rows={2} /></Field>
      <Field label="Email"><Input type="email" value={props.email} onChange={(e) => set("email", e.target.value)} placeholder="hello@example.com" /></Field>
      <Field label="Phone"><Input value={props.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 (555) 000-0000" /></Field>
      <Field label="Address"><Textarea value={props.address} onChange={(v) => set("address", v)} rows={2} /></Field>
      <Field label="Form Source">
        <select
          value={props.formSource}
          onChange={(e) => set("formSource", e.target.value as "native" | "google")}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="native">Native Form</option>
          <option value="google">Google Form Embed</option>
        </select>
      </Field>

      {props.formSource === "native" && (
        <>
          <Field label="Linked native form">
            <select
              value={props.formSlug}
              onChange={(e) => set("formSlug", e.target.value)}
              disabled={formsLoading || forms.length === 0}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {formsLoading && <option value="">Loading forms...</option>}
              {!formsLoading && forms.length === 0 && <option value="">No active forms found</option>}
              {!formsLoading && forms.map((form) => (
                <option key={form.id} value={form.slug}>{form.name} ({form.slug})</option>
              ))}
            </select>
          </Field>
          {!formsLoading && forms.length === 0 && (
            <p className="text-xs text-destructive">Create and publish an active form in Forms Builder before using the Contact block.</p>
          )}
          <Field label="Submit button label"><Input value={props.submitLabel} onChange={(e) => set("submitLabel", e.target.value)} placeholder="Send Message" /></Field>
        </>
      )}

      {props.formSource === "google" && (
        <Field label="Google Form Embed URL (src)">
          <Input 
            value={props.iframeUrl} 
            onChange={(e) => set("iframeUrl", e.target.value)} 
            placeholder="https://docs.google.com/forms/d/e/.../viewform?embedded=true" 
          />
        </Field>
      )}
      <ColorField label="Background (blank for white)" value={props.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
    </div>
  );
}
