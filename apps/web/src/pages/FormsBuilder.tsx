import { useEffect, useMemo, useState } from "react";
import { Eye, FileText, Plus, Save, Settings2, Trash2 } from "lucide-react";
import { api, type CmsForm, type FormField, type FormFieldType, type FormResponse } from "@/lib/api";
import { onDataChange } from "@/lib/dataEvents";

type EditorTab = "fields" | "settings" | "responses";
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

function renderPreviewField(field: FormField) {
  const common = "w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm";
  if (field.type === "textarea") {
    return <textarea className={common} rows={3} placeholder={field.placeholder || field.label} disabled />;
  }
  if (field.type === "select") {
    return (
      <select className={common} disabled>
        <option>{field.placeholder || `Select ${field.label}`}</option>
        {(field.options ?? []).map((opt) => <option key={opt}>{opt}</option>)}
      </select>
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" disabled />
        {field.label}
      </label>
    );
  }
  return <input className={common} type={field.type === "email" ? "email" : "text"} placeholder={field.placeholder || field.label} disabled />;
}

export function FormsBuilder() {
  const [items, setItems] = useState<CmsForm[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Omit<CmsForm, "id" | "siteId" | "createdAt" | "updatedAt">>(emptyForm());
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [tab, setTab] = useState<EditorTab>("fields");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const responseColumns = useMemo(() => {
    const set = new Set<string>();
    responses.forEach((r) => Object.keys(r.values ?? {}).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [responses]);

  useEffect(() => {
    const load = () => api.forms.list().then((rows) => {
      setItems(rows);
      setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
    }).catch(() => {});
    load();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/forms") || event.path.startsWith("/api/forms/submit") || event.path.startsWith("/api/crm/leads")) load();
    });
  }, []);

  useEffect(() => {
    if (selectedId == null) {
      setDraft(emptyForm());
      setResponses([]);
      return;
    }
    const found = items.find((item) => item.id === selectedId);
    if (!found) return;
    const { id: _id, siteId: _siteId, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = found;
    void _id; void _siteId; void _createdAt; void _updatedAt;
    setDraft(rest);
    api.forms.responses.listByFormId(found.id).then(setResponses).catch(() => setResponses([]));
  }, [items, selectedId]);

  function updateField(index: number, patch: Partial<FormField>) {
    setDraft((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) => i === index ? { ...field, ...patch } : field),
    }));
  }

  function addField(type: FormFieldType) {
    setDraft((prev) => ({
      ...prev,
      fields: [...prev.fields, { ...emptyField(prev.fields.length + 1), type, label: `${type} field`, name: `${type}_${prev.fields.length + 1}` }],
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
      if (selectedId === id) {
        setSelectedId(null);
        setTab("fields");
      }
    } catch (e) {
      alert((e as Error).message || "Failed to delete form");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Form Editor</h1>
          <p className="text-sm text-muted-foreground mt-1">Build forms visually, tune settings, and review responses from one workspace.</p>
        </div>
        <button
          className="rounded-xl border border-dashed px-3 py-2 text-sm font-medium inline-flex items-center gap-2 hover:bg-muted"
          onClick={() => { setSelectedId(null); setDraft(emptyForm()); setResponses([]); setTab("fields"); }}
        >
          <Plus className="size-4" />
          New form
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <aside className="rounded-2xl border border-border/60 bg-background p-3 space-y-2 h-fit xl:sticky xl:top-4">
          <p className="px-1 text-xs uppercase tracking-wide text-muted-foreground">Forms</p>
          {items.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">No forms yet.</p>}
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => { setSelectedId(item.id); setTab("fields"); }}
              className={`w-full text-left rounded-xl border p-3 transition-colors ${selectedId === item.id ? "border-foreground bg-muted/40" : "border-border hover:bg-muted/20"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">/{item.slug}</p>
                </div>
                <span className={`text-[10px] rounded-full px-2 py-0.5 ${item.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{item.status}</span>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">{item.fields.length} fields</div>
            </button>
          ))}
        </aside>

        <section className="rounded-2xl border border-border/60 bg-background p-4 lg:p-5 space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
            <button onClick={() => setTab("fields")} className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${tab === "fields" ? "bg-foreground text-background" : "border border-border hover:bg-muted"}`}><FileText className="size-4" /> Fields</button>
            <button onClick={() => setTab("settings")} className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${tab === "settings" ? "bg-foreground text-background" : "border border-border hover:bg-muted"}`}><Settings2 className="size-4" /> Settings</button>
            <button onClick={() => setTab("responses")} className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${tab === "responses" ? "bg-foreground text-background" : "border border-border hover:bg-muted"}`}><Eye className="size-4" /> Responses ({responses.length})</button>
            <div className="ml-auto flex items-center gap-2">
              {selected && (
                <button onClick={() => remove(selected.id)} className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 text-destructive px-3 py-1.5 text-sm hover:bg-destructive/10">
                  <Trash2 className="size-4" /> Delete
                </button>
              )}
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-3 py-1.5 text-sm font-medium disabled:opacity-60">
                <Save className="size-4" /> {saving ? "Saving..." : selected ? "Save form" : "Create form"}
              </button>
            </div>
          </div>

          {tab === "fields" && (
            <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <div className="space-y-3">
                <div className="rounded-xl border border-border/60 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Field palette</p>
                  <div className="flex flex-wrap gap-2">
                    {FIELD_TYPES.map((type) => (
                      <button key={type} onClick={() => addField(type)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs capitalize hover:bg-muted">+ {type}</button>
                    ))}
                  </div>
                </div>

                {draft.fields.map((field, index) => (
                  <div key={`${field.id}_${index}`} className="rounded-xl border border-border/70 p-3 space-y-2">
                    <div className="grid md:grid-cols-2 gap-2">
                      <input className="rounded-lg border px-2.5 py-2 text-sm" placeholder="Label" value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} />
                      <input className="rounded-lg border px-2.5 py-2 text-sm" placeholder="Name" value={field.name} onChange={(e) => updateField(index, { name: e.target.value })} />
                    </div>
                    <div className="grid md:grid-cols-[1fr_auto_auto] gap-2 items-center">
                      <select className="rounded-lg border px-2.5 py-2 text-sm" value={field.type} onChange={(e) => updateField(index, { type: e.target.value as FormFieldType, options: e.target.value === "select" ? (field.options ?? ["Option 1", "Option 2"]) : [] })}>
                        {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground px-2">
                        <input type="checkbox" checked={field.required ?? false} onChange={(e) => updateField(index, { required: e.target.checked })} /> Required
                      </label>
                      <button onClick={() => setDraft((d) => ({ ...d, fields: d.fields.filter((_, i) => i !== index) }))} className="text-xs text-destructive rounded-lg border border-destructive/30 px-2.5 py-2 hover:bg-destructive/10">Remove</button>
                    </div>
                    {field.type !== "checkbox" && (
                      <input className="w-full rounded-lg border px-2.5 py-2 text-sm" placeholder="Placeholder" value={field.placeholder ?? ""} onChange={(e) => updateField(index, { placeholder: e.target.value })} />
                    )}
                    {field.type === "select" && (
                      <input className="w-full rounded-lg border px-2.5 py-2 text-sm" placeholder="Option 1, Option 2" value={(field.options ?? []).join(", ")} onChange={(e) => updateField(index, { options: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })} />
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border/60 p-4 h-fit space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Live preview</p>
                <div className="space-y-3">
                  {draft.fields.map((field, idx) => (
                    <div key={`preview_${field.id}_${idx}`} className="space-y-1">
                      <p className="text-xs text-muted-foreground">{field.label}{field.required ? " *" : ""}</p>
                      {renderPreviewField(field)}
                    </div>
                  ))}
                  <button className="w-full rounded-lg bg-foreground text-background px-3 py-2 text-sm font-medium" disabled>
                    {draft.submitLabel || "Submit"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "settings" && (
            <div className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">Form name</span>
                  <input className="w-full rounded-lg border px-3 py-2 text-sm" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">Slug</span>
                  <input className="w-full rounded-lg border px-3 py-2 text-sm" value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))} placeholder="contact-sales" />
                </label>
              </div>
              <label className="space-y-1 text-sm block">
                <span className="text-xs text-muted-foreground">Description</span>
                <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={3} value={draft.description ?? ""} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
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
                  <span className="text-xs text-muted-foreground">Submit button label</span>
                  <input className="w-full rounded-lg border px-3 py-2 text-sm" value={draft.submitLabel} onChange={(e) => setDraft((d) => ({ ...d, submitLabel: e.target.value }))} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">Success message</span>
                  <input className="w-full rounded-lg border px-3 py-2 text-sm" value={draft.successMessage} onChange={(e) => setDraft((d) => ({ ...d, successMessage: e.target.value }))} />
                </label>
              </div>
            </div>
          )}

          {tab === "responses" && (
            <div className="space-y-3">
              {responses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No responses yet for this form.</p>
              ) : (
                <div className="overflow-auto rounded-xl border border-border/60">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left px-3 py-2">Date</th>
                        <th className="text-left px-3 py-2">Name</th>
                        <th className="text-left px-3 py-2">Email</th>
                        {responseColumns.map((col) => <th key={col} className="text-left px-3 py-2">{col}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map((row) => (
                        <tr key={row.id} className="border-t border-border/60">
                          <td className="px-3 py-2 whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</td>
                          <td className="px-3 py-2">{row.name ?? "-"}</td>
                          <td className="px-3 py-2">{row.email ?? "-"}</td>
                          {responseColumns.map((col) => {
                            const value = row.values?.[col];
                            const output = typeof value === "boolean" ? (value ? "true" : "false") : (value ?? "-");
                            return <td key={`${row.id}_${col}`} className="px-3 py-2">{String(output)}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
