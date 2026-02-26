import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, type CmsForm, type FormField, type FormFieldType } from "@/lib/api";
import { onDataChange } from "@/lib/dataEvents";

const FIELD_TYPES: FormFieldType[] = ["text", "email", "textarea", "select", "checkbox"];

function emptyField(index: number): FormField {
  return {
    id: `f_${index}`,
    label: "New Field",
    name: `field_${index}`,
    type: "text",
    required: false,
    placeholder: "",
    options: [],
  };
}

function emptyForm(): Omit<CmsForm, "id" | "siteId" | "createdAt" | "updatedAt"> {
  return {
    name: "",
    slug: "",
    description: "",
    status: "active",
    submitLabel: "Submit",
    successMessage: "Thanks, we received your submission.",
    fields: [
      { id: "name", label: "Name", name: "name", type: "text", required: true, placeholder: "Jane Doe", options: [] },
      { id: "email", label: "Email", name: "email", type: "email", required: true, placeholder: "jane@example.com", options: [] },
      { id: "message", label: "Message", name: "message", type: "textarea", required: true, placeholder: "How can we help?", options: [] },
    ],
  };
}

export function FormsBuilder() {
  const [items, setItems] = useState<CmsForm[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Omit<CmsForm, "id" | "siteId" | "createdAt" | "updatedAt">>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => api.forms.list().then((rows) => {
      setItems(rows);
      if (rows.length && selectedId == null) {
        setSelectedId(rows[0].id);
      }
    }).catch(() => {});
    load();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/forms") || event.path.startsWith("/api/crm/leads")) load();
    });
  }, [selectedId]);

  useEffect(() => {
    if (selectedId == null) {
      setDraft(emptyForm());
      return;
    }
    const found = items.find((item) => item.id === selectedId);
    if (!found) return;
    const { id: _id, siteId: _siteId, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = found;
    void _id; void _siteId; void _createdAt; void _updatedAt;
    setDraft(rest);
  }, [items, selectedId]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  function updateField(index: number, patch: Partial<FormField>) {
    setDraft((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) => i === index ? { ...field, ...patch } : field),
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (selected) {
        const updated = await api.forms.update(selected.id, draft);
        setItems((prev) => prev.map((f) => f.id === updated.id ? updated : f));
      } else {
        const created = await api.forms.create(draft);
        setItems((prev) => [created, ...prev]);
        setSelectedId(created.id);
      }
    } catch (e) {
      setError((e as Error).message || "Failed to save form");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this form?")) return;
    try {
      await api.forms.delete(id);
      setItems((prev) => prev.filter((row) => row.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (e) {
      alert((e as Error).message || "Failed to delete form");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Forms Builder</h1>
        <p className="text-sm text-muted-foreground mt-1">Create CMS-native forms and connect them to blocks using form slug.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border p-3 space-y-2 h-fit">
          <button
            className="w-full rounded-xl border border-dashed px-3 py-2 text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted"
            onClick={() => { setSelectedId(null); setDraft(emptyForm()); }}
          >
            <Plus className="size-4" />
            New form
          </button>
          {items.map((item) => (
            <div key={item.id} className={`rounded-xl border p-3 cursor-pointer ${selectedId === item.id ? "border-foreground" : "border-border"}`} onClick={() => setSelectedId(item.id)}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <button className="text-destructive" onClick={(e) => { e.stopPropagation(); remove(item.id); }}><Trash2 className="size-4" /></button>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">slug: {item.slug}</p>
            </div>
          ))}
        </aside>

        <section className="rounded-2xl border p-4 space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid md:grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Name</span>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Slug</span>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))} placeholder="contact-sales" />
            </label>
          </div>

          <label className="space-y-1 text-sm block">
            <span className="text-xs text-muted-foreground">Description</span>
            <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} value={draft.description ?? ""} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
          </label>

          <div className="grid md:grid-cols-3 gap-3">
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Status</span>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as "active" | "inactive" }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Submit button</span>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={draft.submitLabel} onChange={(e) => setDraft((d) => ({ ...d, submitLabel: e.target.value }))} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Success message</span>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={draft.successMessage} onChange={(e) => setDraft((d) => ({ ...d, successMessage: e.target.value }))} />
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Fields</h2>
              <button className="rounded-lg border px-2.5 py-1 text-xs" onClick={() => setDraft((d) => ({ ...d, fields: [...d.fields, emptyField(d.fields.length + 1)] }))}>Add field</button>
            </div>
            {draft.fields.map((field, index) => (
              <div key={field.id || `${field.name}_${index}`} className="rounded-xl border p-3 space-y-2">
                <div className="grid md:grid-cols-4 gap-2">
                  <input className="rounded-lg border px-2.5 py-1.5 text-sm" placeholder="Label" value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} />
                  <input className="rounded-lg border px-2.5 py-1.5 text-sm" placeholder="Name" value={field.name} onChange={(e) => updateField(index, { name: e.target.value })} />
                  <select className="rounded-lg border px-2.5 py-1.5 text-sm" value={field.type} onChange={(e) => updateField(index, { type: e.target.value as FormFieldType })}>
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="flex items-center justify-between rounded-lg border px-2.5 py-1.5">
                    <label className="text-xs flex items-center gap-1.5">
                      <input type="checkbox" checked={field.required ?? false} onChange={(e) => updateField(index, { required: e.target.checked })} />
                      Required
                    </label>
                    <button className="text-destructive text-xs" onClick={() => setDraft((d) => ({ ...d, fields: d.fields.filter((_, i) => i !== index) }))}>Remove</button>
                  </div>
                </div>
                <input className="w-full rounded-lg border px-2.5 py-1.5 text-sm" placeholder="Placeholder" value={field.placeholder ?? ""} onChange={(e) => updateField(index, { placeholder: e.target.value })} />
                {field.type === "select" && (
                  <input className="w-full rounded-lg border px-2.5 py-1.5 text-sm" placeholder="Option 1, Option 2" value={(field.options ?? []).join(", ")} onChange={(e) => updateField(index, { options: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })} />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={save} disabled={saving} className="rounded-xl bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-60">
              {saving ? "Saving..." : selected ? "Save Form" : "Create Form"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
