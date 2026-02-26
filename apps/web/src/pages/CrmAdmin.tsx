import { useEffect, useState } from "react";
import { api, type CrmChannel, type CrmLead } from "@/lib/api";
import { onDataChange } from "@/lib/dataEvents";

const LEAD_STATUSES: CrmLead["status"][] = ["new", "contacted", "qualified", "lost"];

export function CrmAdmin() {
  const [channels, setChannels] = useState<CrmChannel[]>([]);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [newChannel, setNewChannel] = useState({ name: "", slug: "", description: "" });

  useEffect(() => {
    const load = () => {
      api.crm.channels.list().then(setChannels).catch(() => {});
      api.crm.leads.list().then(setLeads).catch(() => {});
    };
    load();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/crm") || event.path.startsWith("/api/forms/submit") || event.path.startsWith("/api/newsletter")) load();
    });
  }, []);

  async function createChannel() {
    if (!newChannel.name.trim()) return;
    const created = await api.crm.channels.create({
      name: newChannel.name,
      slug: newChannel.slug || undefined,
      description: newChannel.description || undefined,
    });
    setChannels((prev) => [...prev, created]);
    setNewChannel({ name: "", slug: "", description: "" });
  }

  async function updateLeadStatus(lead: CrmLead, status: CrmLead["status"]) {
    const updated = await api.crm.leads.update(lead.id, { status });
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, ...updated } : l));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
        <p className="text-sm text-muted-foreground mt-1">Unified leads from forms, newsletter, and custom channels.</p>
      </div>

      <section className="rounded-2xl border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Channels</h2>
        <div className="grid md:grid-cols-4 gap-2">
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Name" value={newChannel.name} onChange={(e) => setNewChannel((s) => ({ ...s, name: e.target.value }))} />
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Slug (optional)" value={newChannel.slug} onChange={(e) => setNewChannel((s) => ({ ...s, slug: e.target.value }))} />
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Description" value={newChannel.description} onChange={(e) => setNewChannel((s) => ({ ...s, description: e.target.value }))} />
          <button className="rounded-lg bg-foreground text-background text-sm font-medium" onClick={() => void createChannel()}>Add Channel</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {channels.map((channel) => (
            <span key={channel.id} className="inline-flex rounded-full border px-2.5 py-1 text-xs">
              {channel.name} ({channel.slug})
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Channel</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t align-top">
                <td className="px-3 py-2">{lead.name || "-"}</td>
                <td className="px-3 py-2">{lead.email || "-"}</td>
                <td className="px-3 py-2">{lead.source}</td>
                <td className="px-3 py-2">{lead.channel?.name || "-"}</td>
                <td className="px-3 py-2">
                  <select className="rounded border px-2 py-1 text-xs" value={lead.status} onChange={(e) => void updateLeadStatus(lead, e.target.value as CrmLead["status"])}>
                    {LEAD_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {leads.length === 0 ? <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No leads yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
