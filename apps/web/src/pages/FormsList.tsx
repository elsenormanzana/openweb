import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Inbox, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, type CmsForm, type FormResponse } from "@/lib/api";
import { onDataChange } from "@/lib/dataEvents";

export function FormsList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CmsForm[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responsesFor, setResponsesFor] = useState<CmsForm | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);

  useEffect(() => {
    const load = () => api.forms.list().then(setItems).catch(() => {});
    load();
    return onDataChange((e) => {
      if (e.path.startsWith("/api/forms") || e.path.startsWith("/api/crm/leads")) load();
    });
  }, []);

  const responseColumns = useMemo(() => {
    const set = new Set<string>();
    responses.forEach((r) => Object.keys(r.values ?? {}).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [responses]);

  async function createForm() {
    setCreating(true);
    setError(null);
    try {
      const created = await api.forms.create({ name: "Untitled form" });
      navigate(`/admin/forms/${created.id}/builder`);
    } catch (e) {
      setError((e as Error).message || "Failed to create form");
      setCreating(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this form?")) return;
    try {
      await api.forms.delete(id);
      setItems((prev) => prev.filter((f) => f.id !== id));
      if (responsesFor?.id === id) setResponsesFor(null);
    } catch (e) {
      alert((e as Error).message || "Failed to delete form");
    }
  }

  function openResponses(form: CmsForm) {
    setResponsesFor(form);
    api.forms.responses.listByFormId(form.id).then(setResponses).catch(() => setResponses([]));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Forms</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Build forms with sections and conditional logic, then share them by URL.
          </p>
        </div>
        <button
          onClick={createForm}
          disabled={creating}
          className="rounded-xl bg-foreground text-background px-3 py-2 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
        >
          <Plus className="size-4" />
          {creating ? "Creating…" : "New form"}
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <FileText className="size-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No forms yet.</p>
          <button onClick={createForm} className="mt-3 text-sm underline text-foreground">Create your first form</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((form) => (
            <div
              key={form.id}
              className="group rounded-2xl border border-border/60 bg-background p-4 hover:border-border hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => navigate(`/admin/forms/${form.id}/builder`)} className="min-w-0 text-left">
                  <p className="text-sm font-semibold truncate">{form.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">/forms/{form.slug}</p>
                </button>
                <span className={`text-[10px] rounded-full px-2 py-0.5 shrink-0 ${form.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                  {form.status}
                </span>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                {form.fields.length} field{form.fields.length === 1 ? "" : "s"} · {form.sections.length} section{form.sections.length === 1 ? "" : "s"} · {form.layout === "steps" ? "multi-step" : "single page"}
              </p>
              <div className="mt-3 flex items-center gap-1.5">
                <button
                  onClick={() => navigate(`/admin/forms/${form.id}/builder`)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
                >
                  <Pencil className="size-3.5" /> Edit
                </button>
                <button
                  onClick={() => openResponses(form)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
                >
                  <Inbox className="size-3.5" /> Responses
                </button>
                <button
                  onClick={() => remove(form.id)}
                  className="ml-auto inline-flex items-center rounded-lg border border-destructive/30 text-destructive px-2 py-1.5 text-xs opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {responsesFor && (
        <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Responses — {responsesFor.name}</h2>
            <button onClick={() => setResponsesFor(null)} className="rounded-lg p-1 hover:bg-muted">
              <X className="size-4" />
            </button>
          </div>
          {responses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No responses yet.</p>
          ) : (
            <div className="overflow-auto rounded-xl border border-border/60">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2">Date</th>
                    {responseColumns.map((col) => <th key={col} className="text-left px-3 py-2">{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((row) => (
                    <tr key={row.id} className="border-t border-border/60">
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</td>
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
    </div>
  );
}
