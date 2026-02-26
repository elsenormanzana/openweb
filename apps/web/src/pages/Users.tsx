import { useEffect, useState } from "react";
import { Users2, Plus, Pencil, Trash2 } from "lucide-react";
import { api, type User, type SiteContext } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { onDataChange } from "@/lib/dataEvents";

const ROLES = ["admin", "blogger_admin", "blogger", "page_developer", "subscriber"] as const;
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  blogger_admin: "Blogger Admin",
  blogger: "Blogger",
  page_developer: "Page Developer",
  subscriber: "Subscriber",
};
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-foreground text-background",
  blogger_admin: "bg-emerald-100 text-emerald-800",
  blogger: "bg-purple-100 text-purple-800",
  page_developer: "bg-blue-100 text-blue-800",
  subscriber: "bg-muted text-muted-foreground",
};

type FormState = {
  email: string;
  password: string;
  role: string;
};

const emptyForm = (): FormState => ({ email: "", password: "", role: "subscriber" });

export function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [siteContext, setSiteContext] = useState<SiteContext | null>(null);
  const [dialog, setDialog] = useState<null | { mode: "create" | "edit"; user?: User }>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUsers = () => api.users.list().then(setUsers).catch(() => {});
    const loadCtx = () => api.siteContext.get().then(setSiteContext).catch(() => {});
    loadUsers();
    loadCtx();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/users") || event.path.startsWith("/api/sites")) {
        loadUsers();
        loadCtx();
      }
    });
  }, []);
  const allowedRoles = user?.role === "blogger_admin"
    ? ROLES.filter((r) => ["blogger_admin", "blogger", "subscriber"].includes(r))
    : ROLES;

  function openCreate() {
    setForm(emptyForm());
    setError("");
    setDialog({ mode: "create" });
  }

  function openEdit(u: User) {
    setForm({
      email: u.email,
      password: "",
      role: u.role,
    });
    setError("");
    setDialog({ mode: "edit", user: u });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (dialog?.mode === "create") {
        const created = await api.users.create({
          email: form.email, password: form.password,
          role: form.role,
        });
        setUsers((prev) => [...prev, created]);
      } else if (dialog?.user) {
        const body: Parameters<typeof api.users.update>[1] = {
          email: form.email,
          role: form.role,
        };
        if (form.password) body.password = form.password;
        const updated = await api.users.update(dialog.user.id, body);
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      }
      setDialog(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(u: User) {
    if (!confirm(`Delete user ${u.email}?`)) return;
    try {
      await api.users.delete(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage users for one site at a time.</p>
          {siteContext && (
            <p className="text-xs text-muted-foreground mt-1">
              Current scope: <span className="font-medium text-foreground">{siteContext.site.name}</span>
            </p>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" />
          Add user
        </button>
      </div>

      {users.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
            <Users2 className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No users yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="group rounded-2xl border border-border/60 bg-background p-4 hover:border-border hover:shadow-sm transition-all flex items-center gap-4">
              <div className="size-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Users2 className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.email}</p>
                <p className="text-xs text-muted-foreground">Site user</p>
              </div>
              <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${ROLE_COLORS[u.role] ?? ""}`}>
                {ROLE_LABELS[u.role] ?? u.role}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Edit">
                  <Pencil className="size-4 text-muted-foreground" />
                </button>
                <button onClick={() => handleDelete(u)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Delete">
                  <Trash2 className="size-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-background rounded-2xl border border-border shadow-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">{dialog.mode === "create" ? "Add user" : "Edit user"}</h2>
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{dialog.mode === "edit" ? "New password (leave blank to keep)" : "Password"}</label>
              <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full text-sm rounded-lg border border-border/60 bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                {allowedRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              {siteContext && (
                <p className="text-xs text-muted-foreground">This user will be scoped to {siteContext.site.name}.</p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setDialog(null)} className="flex-1 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 rounded-xl bg-foreground text-background py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
