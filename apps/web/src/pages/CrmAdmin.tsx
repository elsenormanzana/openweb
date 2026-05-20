import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, type CrmChannel, type CrmChannelType, type CrmLead, type CrmLeadActivity, type CrmAnalytics } from "@/lib/api";
import { onDataChange } from "@/lib/dataEvents";
import {
  Facebook, Linkedin, Instagram, Youtube, MessageCircle, Twitter,
  Globe, Mail, FileText, Users, TrendingUp, Archive, Plus, Search,
  X, MoreHorizontal, Phone, Building2, Tag, Star,
  Calendar, BarChart3, Bot, Check, Pencil, Trash2,
  RefreshCw, Download,
} from "lucide-react";

// ─── Channel type metadata ───────────────────────────────────────────────────

const CHANNEL_META: Record<CrmChannelType, { label: string; icon: ReactNode; color: string }> = {
  newsletter: { label: "Newsletter", icon: <Mail className="size-3.5" />, color: "bg-violet-100 text-violet-700" },
  form:        { label: "Forms",      icon: <FileText className="size-3.5" />, color: "bg-blue-100 text-blue-700" },
  facebook:    { label: "Facebook",   icon: <Facebook className="size-3.5" />, color: "bg-blue-100 text-blue-800" },
  linkedin:    { label: "LinkedIn",   icon: <Linkedin className="size-3.5" />, color: "bg-sky-100 text-sky-700" },
  instagram:   { label: "Instagram",  icon: <Instagram className="size-3.5" />, color: "bg-pink-100 text-pink-700" },
  tiktok:      { label: "TikTok",     icon: <Globe className="size-3.5" />, color: "bg-slate-100 text-slate-700" },
  twitter:     { label: "X / Twitter", icon: <Twitter className="size-3.5" />, color: "bg-slate-100 text-slate-800" },
  youtube:     { label: "YouTube",    icon: <Youtube className="size-3.5" />, color: "bg-red-100 text-red-700" },
  whatsapp:    { label: "WhatsApp",   icon: <MessageCircle className="size-3.5" />, color: "bg-emerald-100 text-emerald-700" },
  custom:      { label: "Custom",     icon: <Globe className="size-3.5" />, color: "bg-muted text-muted-foreground" },
};

const CHANNEL_TYPES = Object.entries(CHANNEL_META) as [CrmChannelType, (typeof CHANNEL_META)[CrmChannelType]][];

const STATUS_META = {
  new:       { label: "New",       color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500" },
  contacted: { label: "Contacted", color: "bg-amber-100 text-amber-700",  dot: "bg-amber-500" },
  qualified: { label: "Qualified", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  lost:      { label: "Lost",      color: "bg-rose-100 text-rose-700",    dot: "bg-rose-400" },
};

const ACTIVITY_TYPES: CrmLeadActivity["type"][] = ["note", "call", "email", "meeting", "status_change"];
const ACTIVITY_META: Record<CrmLeadActivity["type"], { label: string; color: string }> = {
  note:          { label: "Note",          color: "bg-muted text-muted-foreground" },
  call:          { label: "Call",          color: "bg-blue-100 text-blue-700" },
  email:         { label: "Email",         color: "bg-violet-100 text-violet-700" },
  meeting:       { label: "Meeting",       color: "bg-amber-100 text-amber-700" },
  status_change: { label: "Status Change", color: "bg-emerald-100 text-emerald-700" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel?: CrmChannel | null }) {
  if (!channel) return <span className="text-xs text-muted-foreground">—</span>;
  const meta = CHANNEL_META[channel.channelType as CrmChannelType] ?? CHANNEL_META.custom;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
      {meta.icon} {channel.name}
    </span>
  );
}

function StatusBadge({ status }: { status: CrmLead["status"] }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct}</span>
    </div>
  );
}

function useDebounce<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// ─── Lead Drawer ─────────────────────────────────────────────────────────────

function LeadDrawer({
  lead,
  channels,
  onClose,
  onUpdate,
  onArchive,
}: {
  lead: CrmLead;
  channels: CrmChannel[];
  onClose: () => void;
  onUpdate: (updated: CrmLead) => void;
  onArchive: (id: number, archived: boolean) => void;
}) {
  const [activities, setActivities] = useState<CrmLeadActivity[]>([]);
  const [activityType, setActivityType] = useState<CrmLeadActivity["type"]>("note");
  const [activityContent, setActivityContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: lead.name ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    company: lead.company ?? "",
    notes: lead.notes ?? "",
    score: lead.score,
    status: lead.status,
    channelId: lead.channelId ?? "",
    tags: lead.tags.join(", "),
    customFields: JSON.stringify(lead.customFields, null, 2),
  });
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldVal, setNewFieldVal] = useState("");

  useEffect(() => {
    api.crm.leads.activities.list(lead.id).then(setActivities).catch(() => {});
  }, [lead.id]);

  async function saveEdit() {
    let customFields = lead.customFields;
    try { customFields = JSON.parse(form.customFields) as Record<string, string>; } catch { /* keep */ }
    const updated = await api.crm.leads.update(lead.id, {
      name: form.name || null,
      email: form.email || null,
      phone: form.phone || null,
      company: form.company || null,
      notes: form.notes || null,
      score: Number(form.score),
      status: form.status as CrmLead["status"],
      channelId: form.channelId ? Number(form.channelId) : null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      customFields,
    });
    onUpdate(updated);
    setEditing(false);
  }

  async function addCustomField() {
    if (!newFieldKey.trim()) return;
    const updated = await api.crm.leads.update(lead.id, {
      customFields: { ...lead.customFields, [newFieldKey.trim()]: newFieldVal.trim() },
    });
    onUpdate(updated);
    setNewFieldKey("");
    setNewFieldVal("");
  }

  async function addActivity() {
    if (!activityContent.trim()) return;
    const act = await api.crm.leads.activities.create(lead.id, { type: activityType, content: activityContent });
    setActivities((prev) => [act, ...prev]);
    setActivityContent("");
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/20 backdrop-blur-sm" />
      <div
        className="w-full max-w-lg bg-background border-l border-border overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Lead</p>
            <h2 className="text-base font-semibold truncate">{lead.name ?? lead.email ?? `Lead #${lead.id}`}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={lead.status} />
              <ChannelBadge channel={lead.channel} />
              <ScoreBar score={lead.score} />
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              className="rounded-lg border px-2 py-1 text-xs hover:bg-muted"
              onClick={() => setEditing(!editing)}
            >
              {editing ? "Cancel" : <span className="flex items-center gap-1"><Pencil className="size-3" /> Edit</span>}
            </button>
            <button
              className="rounded-lg border px-2 py-1 text-xs hover:bg-muted"
              onClick={() => { onArchive(lead.id, !lead.archived); onClose(); }}
            >
              {lead.archived ? <span className="flex items-center gap-1"><RefreshCw className="size-3" /> Restore</span> : <span className="flex items-center gap-1"><Archive className="size-3" /> Archive</span>}
            </button>
            <button className="rounded-lg p-1.5 hover:bg-muted" onClick={onClose}><X className="size-4" /></button>
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {editing ? (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edit Lead</h3>
              <div className="grid grid-cols-2 gap-2">
                {(["name", "email", "phone", "company"] as const).map((f) => (
                  <div key={f}>
                    <label className="text-xs text-muted-foreground capitalize">{f}</label>
                    <input className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm" value={form[f]} onChange={(e) => setForm((s) => ({ ...s, [f]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <select className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm" value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as CrmLead["status"] }))}>
                    {Object.keys(STATUS_META).map((s) => <option key={s} value={s}>{STATUS_META[s as CrmLead["status"]].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Channel</label>
                  <select className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm" value={String(form.channelId)} onChange={(e) => setForm((s) => ({ ...s, channelId: e.target.value }))}>
                    <option value="">None</option>
                    {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Score (0–100)</label>
                <input type="number" min={0} max={100} className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm" value={form.score} onChange={(e) => setForm((s) => ({ ...s, score: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tags (comma-separated)</label>
                <input className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm" value={form.tags} onChange={(e) => setForm((s) => ({ ...s, tags: e.target.value }))} placeholder="e.g. hot, enterprise, follow-up" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <textarea rows={3} className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm resize-none" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Custom Fields (JSON)</label>
                <textarea rows={3} className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm font-mono text-xs resize-none" value={form.customFields} onChange={(e) => setForm((s) => ({ ...s, customFields: e.target.value }))} />
              </div>
              <button className="w-full rounded-xl bg-foreground text-background py-2 text-sm font-medium" onClick={() => void saveEdit()}>Save Changes</button>
            </section>
          ) : (
            <>
              {/* Contact info */}
              <section className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</h3>
                {[
                  { icon: <Mail className="size-3.5 text-muted-foreground" />, value: lead.email },
                  { icon: <Phone className="size-3.5 text-muted-foreground" />, value: lead.phone },
                  { icon: <Building2 className="size-3.5 text-muted-foreground" />, value: lead.company },
                ].map(({ icon, value }, i) =>
                  value ? (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {icon} <span>{value}</span>
                    </div>
                  ) : null
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  Created {new Date(lead.createdAt).toLocaleDateString()}
                </div>
              </section>

              {/* Tags */}
              {lead.tags.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                        <Tag className="size-2.5" />{tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Custom fields */}
              {Object.keys(lead.customFields).length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Custom Fields</h3>
                  <div className="rounded-xl border border-border/60 divide-y divide-border/60 overflow-hidden text-sm">
                    {Object.entries(lead.customFields).map(([k, v]) => (
                      <div key={k} className="flex px-3 py-2 gap-3">
                        <span className="text-muted-foreground capitalize w-28 shrink-0">{k}</span>
                        <span className="font-medium truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Add custom field inline */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Add Custom Field</h3>
                <div className="flex gap-2">
                  <input className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm" placeholder="Field name" value={newFieldKey} onChange={(e) => setNewFieldKey(e.target.value)} />
                  <input className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm" placeholder="Value" value={newFieldVal} onChange={(e) => setNewFieldVal(e.target.value)} />
                  <button className="rounded-lg bg-foreground text-background px-3 py-1.5 text-sm" onClick={() => void addCustomField()}><Plus className="size-4" /></button>
                </div>
              </section>

              {/* Notes */}
              {lead.notes && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl px-3 py-2 whitespace-pre-wrap">{lead.notes}</p>
                </section>
              )}
            </>
          )}

          {/* Activities timeline */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Activity Timeline</h3>
            <div className="space-y-2 mb-3">
              <div className="flex gap-2">
                <select className="rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-xs" value={activityType} onChange={(e) => setActivityType(e.target.value as CrmLeadActivity["type"])}>
                  {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{ACTIVITY_META[t].label}</option>)}
                </select>
                <input className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm" placeholder="Add a note, call log, etc." value={activityContent} onChange={(e) => setActivityContent(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void addActivity(); } }} />
                <button className="rounded-lg bg-foreground text-background px-3 text-sm" onClick={() => void addActivity()}><Plus className="size-4" /></button>
              </div>
            </div>
            <div className="space-y-2">
              {activities.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No activities yet</p>}
              {activities.map((act) => (
                <div key={act.id} className="flex gap-2.5">
                  <div className="mt-1 size-1.5 rounded-full bg-border shrink-0 mt-2" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${ACTIVITY_META[act.type as CrmLeadActivity["type"]]?.color ?? "bg-muted text-muted-foreground"}`}>{ACTIVITY_META[act.type as CrmLeadActivity["type"]]?.label ?? act.type}</span>
                      <span className="text-xs text-muted-foreground">{new Date(act.createdAt).toLocaleString()}</span>
                      {act.createdByEmail && <span className="text-xs text-muted-foreground">{act.createdByEmail}</span>}
                    </div>
                    {act.content && <p className="mt-1 text-sm text-foreground/80">{act.content}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline Kanban ─────────────────────────────────────────────────────────

function PipelineView({
  leads,
  onStatusChange,
  onSelectLead,
}: {
  leads: CrmLead[];
  onStatusChange: (lead: CrmLead, status: CrmLead["status"]) => void;
  onSelectLead: (lead: CrmLead) => void;
}) {
  const columns: CrmLead["status"][] = ["new", "contacted", "qualified", "lost"];

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 min-h-[500px]">
      {columns.map((col) => {
        const colLeads = leads.filter((l) => l.status === col);
        const meta = STATUS_META[col];
        return (
          <div key={col} className="flex-none w-72 flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${meta.dot}`} />
                <span className="text-sm font-medium">{meta.label}</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{colLeads.length}</span>
            </div>
            <div className="flex flex-col gap-2 rounded-xl bg-muted/30 p-2 flex-1 min-h-[200px]">
              {colLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-xl bg-background border border-border/60 p-3 shadow-sm hover:border-border hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => onSelectLead(lead)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium truncate">{lead.name ?? lead.email ?? `Lead #${lead.id}`}</p>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      <MoreHorizontal className="size-4 text-muted-foreground" />
                    </button>
                  </div>
                  {lead.email && <p className="text-xs text-muted-foreground truncate mb-1">{lead.email}</p>}
                  {lead.company && <p className="text-xs text-muted-foreground truncate mb-2">{lead.company}</p>}
                  <div className="flex items-center justify-between gap-2">
                    <ChannelBadge channel={lead.channel} />
                    <ScoreBar score={lead.score} />
                  </div>
                  {lead.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {lead.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  )}
                  {/* Move controls */}
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {columns.filter((c) => c !== col).map((target) => (
                      <button
                        key={target}
                        className={`rounded-full px-2 py-0.5 text-xs ${STATUS_META[target].color}`}
                        onClick={(e) => { e.stopPropagation(); onStatusChange(lead, target); }}
                      >
                        → {STATUS_META[target].label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {colLeads.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">No leads</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Leads Table ─────────────────────────────────────────────────────────────

function LeadsTable({
  leads,
  onStatusChange,
  onSelectLead,
  onArchive,
  onDelete,
  showArchived,
}: {
  leads: CrmLead[];
  onStatusChange: (lead: CrmLead, status: CrmLead["status"]) => void;
  onSelectLead: (lead: CrmLead) => void;
  onArchive: (id: number, archived: boolean) => void;
  onDelete: (id: number) => void;
  showArchived: boolean;
}) {
  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Users className="size-8 opacity-40" />
        <p className="text-sm">{showArchived ? "No archived leads" : "No leads found"}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Contact</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Channel</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Score</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Tags</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Created</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-border/40 hover:bg-muted/20 group cursor-pointer" onClick={() => onSelectLead(lead)}>
                <td className="px-4 py-2.5">
                  <p className="font-medium truncate max-w-[140px]">{lead.name ?? `Lead #${lead.id}`}</p>
                  {lead.company && <p className="text-xs text-muted-foreground truncate max-w-[140px]">{lead.company}</p>}
                </td>
                <td className="px-4 py-2.5">
                  {lead.email && <p className="text-xs truncate max-w-[160px]">{lead.email}</p>}
                  {lead.phone && <p className="text-xs text-muted-foreground">{lead.phone}</p>}
                </td>
                <td className="px-4 py-2.5"><ChannelBadge channel={lead.channel} /></td>
                <td className="px-4 py-2.5">
                  <select
                    className="rounded-lg border border-transparent bg-transparent text-xs hover:border-border px-1 py-0.5"
                    value={lead.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => { e.stopPropagation(); onStatusChange(lead, e.target.value as CrmLead["status"]); }}
                  >
                    {Object.keys(STATUS_META).map((s) => <option key={s} value={s}>{STATUS_META[s as CrmLead["status"]].label}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2.5"><ScoreBar score={lead.score} /></td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {lead.tags.slice(0, 2).map((t) => (
                      <span key={t} className="rounded-full bg-muted px-1.5 py-0.5 text-xs">{t}</span>
                    ))}
                    {lead.tags.length > 2 && <span className="text-xs text-muted-foreground">+{lead.tags.length - 2}</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"
                      onClick={() => onArchive(lead.id, !lead.archived)}
                    >
                      {lead.archived ? <RefreshCw className="size-3" /> : <Archive className="size-3" />}
                    </button>
                    <button
                      className="rounded-lg border border-destructive/30 text-destructive px-2 py-1 text-xs hover:bg-destructive/10"
                      onClick={() => onDelete(lead.id)}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Analytics ───────────────────────────────────────────────────────────────

function AnalyticsView({ analytics }: { analytics: CrmAnalytics | null }) {
  if (!analytics) return <div className="py-20 text-center text-muted-foreground text-sm">Loading analytics…</div>;
  const { totals, byChannel, trend30d } = analytics;

  const maxLeads = Math.max(1, ...byChannel.map((c) => Number(c.leads)));
  const maxDay = Math.max(1, ...trend30d.map((d) => Number(d.leads)));
  const convRate = totals.activeLeads > 0 ? Math.round((totals.qualifiedLeads / totals.activeLeads) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Leads", value: totals.activeLeads, icon: <Users className="size-4 text-blue-500" />, color: "text-blue-600" },
          { label: "Qualified", value: totals.qualifiedLeads, icon: <Check className="size-4 text-emerald-500" />, color: "text-emerald-600" },
          { label: "Conversion Rate", value: `${convRate}%`, icon: <TrendingUp className="size-4 text-amber-500" />, color: "text-amber-600" },
          { label: "Avg Score", value: totals.avgScore.toFixed(0), icon: <Star className="size-4 text-violet-500" />, color: "text-violet-600" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="rounded-2xl border border-border/60 bg-background p-4 hover:border-border hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* By channel bar chart */}
        <div className="rounded-2xl border border-border/60 bg-background p-5">
          <h3 className="text-sm font-semibold mb-4">Leads by Channel</h3>
          <div className="space-y-3">
            {byChannel.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
            {byChannel.map((ch) => {
              const pct = (Number(ch.leads) / maxLeads) * 100;
              const qpct = Number(ch.leads) > 0 ? (Number(ch.qualified) / Number(ch.leads)) * 100 : 0;
              const meta = CHANNEL_META[ch.channel_type as CrmChannelType] ?? CHANNEL_META.custom;
              return (
                <div key={ch.slug}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`flex items-center gap-1.5 ${meta.color} rounded-full px-2 py-0.5`}>{meta.icon}{ch.channel_name}</span>
                    <span className="text-muted-foreground">{ch.leads} leads · {Math.round(qpct)}% qualified</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-foreground/20" style={{ width: `${pct}%` }}>
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${qpct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 30d trend */}
        <div className="rounded-2xl border border-border/60 bg-background p-5">
          <h3 className="text-sm font-semibold mb-4">New Leads — Last 30 Days</h3>
          {trend30d.length === 0 ? (
            <div className="flex items-end justify-center gap-1 h-28">
              <p className="text-sm text-muted-foreground">No data yet</p>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-px h-28">
              {trend30d.map((d) => {
                const h = (Number(d.leads) / maxDay) * 100;
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-foreground text-background rounded px-1.5 py-0.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {new Date(d.day).toLocaleDateString(undefined, { month: "short", day: "numeric" })}: {d.leads}
                    </div>
                    <div className="w-full rounded-t bg-foreground/70 hover:bg-foreground transition-colors" style={{ height: `${h}%`, minHeight: "2px" }} />
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              {trend30d.length > 0 ? new Date(trend30d[0].day).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
            </span>
            <span className="text-xs text-muted-foreground">
              {trend30d.length > 0 ? new Date(trend30d[trend30d.length - 1].day).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline breakdown */}
      <div className="rounded-2xl border border-border/60 bg-background p-5">
        <h3 className="text-sm font-semibold mb-4">Pipeline Breakdown</h3>
        <div className="flex rounded-full overflow-hidden h-4 mb-3">
          {Object.entries({
            new: totals.newLeads,
            contacted: totals.contactedLeads,
            qualified: totals.qualifiedLeads,
            lost: totals.lostLeads,
          }).map(([key, val]) => {
            const pct = totals.activeLeads > 0 ? (val / totals.activeLeads) * 100 : 0;
            const dotColor = STATUS_META[key as CrmLead["status"]].dot;
            return pct > 0 ? <div key={key} className={`${dotColor} h-full`} style={{ width: `${pct}%` }} title={`${STATUS_META[key as CrmLead["status"]].label}: ${val}`} /> : null;
          })}
        </div>
        <div className="flex flex-wrap gap-4">
          {Object.entries(STATUS_META).map(([key, meta]) => {
            const val = { new: totals.newLeads, contacted: totals.contactedLeads, qualified: totals.qualifiedLeads, lost: totals.lostLeads }[key as CrmLead["status"]];
            return (
              <div key={key} className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${meta.dot}`} />
                <span className="text-sm">{meta.label}</span>
                <span className="text-sm font-semibold">{val}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Channels Manager ─────────────────────────────────────────────────────────

function ChannelsManager({
  channels,
  onCreate,
  onUpdate,
  onDelete,
}: {
  channels: CrmChannel[];
  onCreate: (ch: CrmChannel) => void;
  onUpdate: (ch: CrmChannel) => void;
  onDelete: (id: number) => void;
}) {
  const [form, setForm] = useState({ name: "", slug: "", description: "", channelType: "custom" as CrmChannelType, isActive: true });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<typeof form | null>(null);

  async function handleCreate() {
    if (!form.name.trim()) return;
    const ch = await api.crm.channels.create({ ...form, channelType: form.channelType as CrmChannelType, slug: form.slug || undefined, description: form.description || null });
    onCreate(ch);
    setForm({ name: "", slug: "", description: "", channelType: "custom", isActive: true });
  }

  async function handleUpdate(id: number) {
    if (!editForm) return;
    const ch = await api.crm.channels.update(id, { ...editForm, channelType: editForm.channelType as CrmChannelType });
    onUpdate(ch);
    setEditId(null);
    setEditForm(null);
  }

  const systemSlugs = ["form", "newsletter", "custom"];

  return (
    <div className="space-y-4">
      {/* Create form */}
      <div className="rounded-2xl border border-border/60 bg-background p-5">
        <h3 className="text-sm font-semibold mb-3">Add Channel</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Channel Name *</label>
            <input className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm" placeholder="e.g. Facebook Ads" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Platform</label>
            <select className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm" value={form.channelType} onChange={(e) => setForm((s) => ({ ...s, channelType: e.target.value as CrmChannelType }))}>
              {CHANNEL_TYPES.map(([type, meta]) => (
                <option key={type} value={type}>{meta.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Slug (optional)</label>
            <input className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm" placeholder="auto-generated" value={form.slug} onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <input className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm" placeholder="Optional description" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
          </div>
        </div>
        <button className="mt-3 rounded-xl bg-foreground text-background px-4 py-2 text-sm font-medium flex items-center gap-2" onClick={() => void handleCreate()}>
          <Plus className="size-4" /> Add Channel
        </button>
      </div>

      {/* Channels list */}
      <div className="rounded-2xl border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Channel</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Platform</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Slug</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {channels.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-xs">No channels yet</td></tr>
            )}
            {channels.map((ch) => {
              const meta = CHANNEL_META[ch.channelType as CrmChannelType] ?? CHANNEL_META.custom;
              const isSystem = systemSlugs.includes(ch.slug);
              return (
                <tr key={ch.id} className="border-t border-border/40">
                  {editId === ch.id && editForm ? (
                    <>
                      <td className="px-4 py-2" colSpan={4}>
                        <div className="grid grid-cols-2 gap-2">
                          <input className="rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-sm" value={editForm.name} onChange={(e) => setEditForm((s) => s ? { ...s, name: e.target.value } : s)} />
                          <select className="rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-sm" value={editForm.channelType} onChange={(e) => setEditForm((s) => s ? { ...s, channelType: e.target.value as CrmChannelType } : s)}>
                            {CHANNEL_TYPES.map(([type, m]) => <option key={type} value={type}>{m.label}</option>)}
                          </select>
                          <input className="rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-sm" placeholder="Description" value={editForm.description} onChange={(e) => setEditForm((s) => s ? { ...s, description: e.target.value } : s)} />
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((s) => s ? { ...s, isActive: e.target.checked } : s)} />
                            Active
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button className="rounded-lg bg-foreground text-background px-2 py-1 text-xs" onClick={() => void handleUpdate(ch.id)}><Check className="size-3.5" /></button>
                          <button className="rounded-lg border border-border px-2 py-1 text-xs" onClick={() => { setEditId(null); setEditForm(null); }}><X className="size-3.5" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <p className="font-medium">{ch.name}</p>
                        {ch.description && <p className="text-xs text-muted-foreground">{ch.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${meta.color}`}>{meta.icon} {meta.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{ch.slug}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${ch.isActive ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{ch.isActive ? "Active" : "Inactive"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"
                            onClick={() => { setEditId(ch.id); setEditForm({ name: ch.name, slug: ch.slug, description: ch.description ?? "", channelType: (ch.channelType as CrmChannelType) ?? "custom", isActive: ch.isActive }); }}
                          >
                            <Pencil className="size-3" />
                          </button>
                          {!isSystem && (
                            <button
                              className="rounded-lg border border-destructive/30 text-destructive px-2 py-1 text-xs hover:bg-destructive/10"
                              onClick={() => onDelete(ch.id)}
                            >
                              <Trash2 className="size-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── AI Context Tab ───────────────────────────────────────────────────────────

function AiContextTab() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadContext() {
    setLoading(true);
    try {
      const res = await api.crm.aiContext() as Record<string, unknown>;
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  function copyJson() {
    if (!data) return;
    void navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const token = localStorage.getItem("openweb_token") ?? "YOUR_JWT_TOKEN";
  const siteId = sessionStorage.getItem("openweb_site_id") ?? "1";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-background p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <Bot className="size-4 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Context Endpoint</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Feed this structured CRM snapshot to any AI model for recommendations, analysis, and forecasting.</p>
          </div>
        </div>

        <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Endpoint</p>
          <code className="text-sm font-mono">GET /api/crm/ai-context</code>
        </div>

        <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Headers</p>
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{`Authorization: Bearer ${token.slice(0, 20)}...
X-Site-ID: ${siteId}`}</pre>
        </div>

        <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Returned Payload Includes</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Pipeline summary (total leads, status breakdown, conversion rate)</li>
            <li>Channel performance with qualification rates</li>
            <li>Top 10 leads by score</li>
            <li>20 most recent leads with contact info</li>
            <li>Pre-computed AI recommendations based on pipeline health</li>
          </ul>
        </div>

        <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Example Prompt for AI</p>
          <p className="text-xs text-muted-foreground italic">
            "Here is my CRM data: [paste JSON]. Analyze my pipeline health, identify the best-performing acquisition channel, and suggest 3 actions I should take this week."
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="rounded-xl bg-foreground text-background px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          onClick={() => void loadContext()}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : "Load Live Context"}
        </button>
        {data && (
          <button className="rounded-xl border border-border px-4 py-2 text-sm font-medium flex items-center gap-2" onClick={copyJson}>
            {copied ? <Check className="size-4 text-emerald-500" /> : <Download className="size-4" />}
            {copied ? "Copied!" : "Copy JSON"}
          </button>
        )}
      </div>

      {data && (
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">Live AI Context Preview</p>
          </div>
          <pre className="p-4 text-xs font-mono overflow-auto max-h-96 text-muted-foreground">{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Create Lead Modal ────────────────────────────────────────────────────────

function CreateLeadModal({
  channels,
  onClose,
  onCreated,
}: {
  channels: CrmChannel[];
  onClose: () => void;
  onCreated: (lead: CrmLead) => void;
}) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", notes: "",
    channelId: channels[0]?.id ? String(channels[0].id) : "",
    source: "custom" as CrmLead["source"],
    status: "new" as CrmLead["status"],
    score: 0,
    tags: "",
  });

  async function submit() {
    const lead = await api.crm.leads.create({
      ...form,
      channelId: form.channelId ? Number(form.channelId) : null,
      score: Number(form.score),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      name: form.name || null,
      email: form.email || null,
      phone: form.phone || null,
      company: form.company || null,
      notes: form.notes || null,
    });
    onCreated(lead);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-background rounded-2xl border border-border shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">New Lead</h2>
          <button onClick={onClose}><X className="size-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {([["name", "Name"], ["email", "Email"], ["phone", "Phone"], ["company", "Company"]] as [keyof typeof form, string][]).map(([f, label]) => (
              <div key={f}>
                <label className="text-xs text-muted-foreground">{label}</label>
                <input className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm" value={String(form[f])} onChange={(e) => setForm((s) => ({ ...s, [f]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Channel</label>
              <select className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm" value={form.channelId} onChange={(e) => setForm((s) => ({ ...s, channelId: e.target.value }))}>
                <option value="">None</option>
                {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <select className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as CrmLead["status"] }))}>
                {Object.keys(STATUS_META).map((s) => <option key={s} value={s}>{STATUS_META[s as CrmLead["status"]].label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Score (0–100)</label>
            <input type="number" min={0} max={100} className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm" value={form.score} onChange={(e) => setForm((s) => ({ ...s, score: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tags (comma-separated)</label>
            <input className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm" placeholder="hot, enterprise" value={form.tags} onChange={(e) => setForm((s) => ({ ...s, tags: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            <textarea rows={2} className="w-full mt-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm resize-none" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button className="rounded-xl border border-border px-4 py-2 text-sm" onClick={onClose}>Cancel</button>
          <button className="rounded-xl bg-foreground text-background px-4 py-2 text-sm font-medium" onClick={() => void submit()}>Create Lead</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main CRM Admin ───────────────────────────────────────────────────────────

type Tab = "overview" | "pipeline" | "database" | "archive" | "channels" | "ai";

export function CrmAdmin() {
  const [tab, setTab] = useState<Tab>("overview");
  const [channels, setChannels] = useState<CrmChannel[]>([]);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [archivedLeads, setArchivedLeads] = useState<CrmLead[]>([]);
  const [analytics, setAnalytics] = useState<CrmAnalytics | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CrmLead["status"] | "">("");
  const [channelFilter, setChannelFilter] = useState<number | "">("");
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(() => {
    api.crm.channels.list().then(setChannels).catch(() => {});
    api.crm.leads.list({
      archived: false,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      channelId: channelFilter || undefined,
    }).then(setLeads).catch(() => {});
    api.crm.leads.list({ archived: true }).then(setArchivedLeads).catch(() => {});
    api.crm.analytics().then(setAnalytics).catch(() => {});
  }, [debouncedSearch, statusFilter, channelFilter]);

  useEffect(() => {
    load();
    return onDataChange((e) => {
      if (e.path.startsWith("/api/crm") || e.path.startsWith("/api/forms/submit") || e.path.startsWith("/api/newsletter")) load();
    });
  }, [load]);

  async function handleStatusChange(lead: CrmLead, status: CrmLead["status"]) {
    const updated = await api.crm.leads.update(lead.id, { status });
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, ...updated } : l));
    if (selectedLead?.id === lead.id) setSelectedLead((prev) => prev ? { ...prev, ...updated } : null);
  }

  async function handleArchive(id: number, archive: boolean) {
    if (archive) {
      await api.crm.leads.archive(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      const moved = leads.find((l) => l.id === id);
      if (moved) setArchivedLeads((prev) => [{ ...moved, archived: true }, ...prev]);
    } else {
      await api.crm.leads.unarchive(id);
      setArchivedLeads((prev) => prev.filter((l) => l.id !== id));
      const moved = archivedLeads.find((l) => l.id === id);
      if (moved) setLeads((prev) => [{ ...moved, archived: false }, ...prev]);
    }
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this lead permanently?")) return;
    await api.crm.leads.delete(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setArchivedLeads((prev) => prev.filter((l) => l.id !== id));
    if (selectedLead?.id === id) setSelectedLead(null);
  }

  function handleLeadUpdate(updated: CrmLead) {
    setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l));
    setSelectedLead(updated);
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "overview",  label: "Overview",  icon: <BarChart3 className="size-3.5" /> },
    { id: "pipeline",  label: "Pipeline",  icon: <TrendingUp className="size-3.5" />, count: leads.length },
    { id: "database",  label: "Database",  icon: <Users className="size-3.5" />, count: leads.length },
    { id: "archive",   label: "Archive",   icon: <Archive className="size-3.5" />, count: archivedLeads.length },
    { id: "channels",  label: "Channels",  icon: <Globe className="size-3.5" />, count: channels.length },
    { id: "ai",        label: "AI Context", icon: <Bot className="size-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">Deep-relational channel CRM with pipeline, analytics, and AI context.</p>
        </div>
        <button
          className="rounded-xl bg-foreground text-background px-4 py-2 text-sm font-medium flex items-center gap-2 shrink-0"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="size-4" /> New Lead
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? "border-foreground text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters (for pipeline & database) */}
      {(tab === "pipeline" || tab === "database") && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-muted/30 text-sm"
              placeholder="Search leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CrmLead["status"] | "")}
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select
            className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm"
            value={String(channelFilter)}
            onChange={(e) => setChannelFilter(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">All channels</option>
            {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {(search || statusFilter || channelFilter) && (
            <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" onClick={() => { setSearch(""); setStatusFilter(""); setChannelFilter(""); }}>
              <X className="size-3.5" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Tab content */}
      {tab === "overview" && <AnalyticsView analytics={analytics} />}

      {tab === "pipeline" && (
        <PipelineView
          leads={leads}
          onStatusChange={(lead, status) => void handleStatusChange(lead, status)}
          onSelectLead={setSelectedLead}
        />
      )}

      {tab === "database" && (
        <LeadsTable
          leads={leads}
          onStatusChange={(lead, status) => void handleStatusChange(lead, status)}
          onSelectLead={setSelectedLead}
          onArchive={(id, archived) => void handleArchive(id, archived)}
          onDelete={(id) => void handleDelete(id)}
          showArchived={false}
        />
      )}

      {tab === "archive" && (
        <LeadsTable
          leads={archivedLeads}
          onStatusChange={(lead, status) => void handleStatusChange(lead, status)}
          onSelectLead={setSelectedLead}
          onArchive={(id, archived) => void handleArchive(id, archived)}
          onDelete={(id) => void handleDelete(id)}
          showArchived
        />
      )}

      {tab === "channels" && (
        <ChannelsManager
          channels={channels}
          onCreate={(ch) => setChannels((prev) => [...prev, ch])}
          onUpdate={(ch) => setChannels((prev) => prev.map((c) => c.id === ch.id ? ch : c))}
          onDelete={async (id) => {
            if (!confirm("Delete channel?")) return;
            await api.crm.channels.delete(id);
            setChannels((prev) => prev.filter((c) => c.id !== id));
          }}
        />
      )}

      {tab === "ai" && <AiContextTab />}

      {/* Lead drawer */}
      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          channels={channels}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleLeadUpdate}
          onArchive={(id, archived) => void handleArchive(id, archived)}
        />
      )}

      {/* Create lead modal */}
      {showCreate && (
        <CreateLeadModal
          channels={channels}
          onClose={() => setShowCreate(false)}
          onCreated={(lead) => {
            setLeads((prev) => [lead, ...prev]);
            load();
          }}
        />
      )}
    </div>
  );
}
