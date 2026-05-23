import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Inbox, Pencil, Plus, Trash2 } from "lucide-react";
import { api, type CmsForm } from "@/lib/api";
import { onDataChange } from "@/lib/dataEvents";

export function FormsList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CmsForm[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => api.forms.list().then(setItems).catch(() => {});
    load();
    return onDataChange((e) => {
      if (e.path.startsWith("/api/forms") || e.path.startsWith("/api/crm/leads")) load();
    });
  }, []);

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
    } catch (e) {
      alert((e as Error).message || "Failed to delete form");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Forms</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Build forms with rich questions, themes, branching and quizzes — then share them by URL.
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
          {items.map((form) => {
            const closed = form.settings && !form.settings.acceptingResponses;
            return (
              <div
                key={form.id}
                className="group rounded-2xl border border-border/60 bg-background p-4 hover:border-border hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => navigate(`/admin/forms/${form.id}/builder`)} className="min-w-0 text-left">
                    <p className="text-sm font-semibold truncate">{form.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">/forms/{form.slug}</p>
                  </button>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] rounded-full px-2 py-0.5 ${form.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {form.status}
                    </span>
                    {closed && (
                      <span className="text-[10px] rounded-full px-2 py-0.5 bg-amber-100 text-amber-700">closed</span>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {form.fields.length} question{form.fields.length === 1 ? "" : "s"} · {form.layout === "steps" ? "multi-step" : "single page"}
                  {form.settings?.isQuiz ? " · quiz" : ""}
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  <button
                    onClick={() => navigate(`/admin/forms/${form.id}/builder`)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
                  >
                    <Pencil className="size-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => navigate(`/admin/forms/${form.id}/builder?tab=responses`)}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
