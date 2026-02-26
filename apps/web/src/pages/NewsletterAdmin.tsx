import { useEffect, useState } from "react";
import { api, type NewsletterSubscriber } from "@/lib/api";
import { onDataChange } from "@/lib/dataEvents";

export function NewsletterAdmin() {
  const [rows, setRows] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => api.newsletter.subscribers.list().then(setRows).catch(() => {}).finally(() => setLoading(false));
    load();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/newsletter") || event.path.startsWith("/api/forms/submit")) load();
    });
  }, []);

  async function toggle(row: NewsletterSubscriber) {
    const next = row.status === "subscribed" ? "unsubscribed" : "subscribed";
    const updated = await api.newsletter.subscribers.update(row.id, { status: next });
    setRows((prev) => prev.map((r) => r.id === updated.id ? updated : r));
  }

  async function remove(id: number) {
    if (!confirm("Delete subscriber?")) return;
    await api.newsletter.subscribers.delete(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Newsletter</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage subscriber records captured by native newsletter forms.</p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{row.email}</td>
                <td className="px-3 py-2">{row.name || "-"}</td>
                <td className="px-3 py-2">{row.source}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${row.status === "subscribed" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{row.status}</span>
                </td>
                <td className="px-3 py-2 text-right space-x-2">
                  <button className="rounded-lg border px-2 py-1 text-xs" onClick={() => void toggle(row)}>{row.status === "subscribed" ? "Unsubscribe" : "Subscribe"}</button>
                  <button className="rounded-lg border border-destructive/30 text-destructive px-2 py-1 text-xs" onClick={() => void remove(row.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr><td className="px-3 py-10 text-center text-muted-foreground" colSpan={5}>No subscribers yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
