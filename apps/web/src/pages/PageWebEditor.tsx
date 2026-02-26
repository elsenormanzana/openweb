import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BlockEditor } from "@/components/BlockEditor";
import { api } from "@/lib/api";
import { PaletteContext, DEFAULT_PALETTE, type ColorPalette } from "@/lib/palette";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { History, Save, ArrowLeft, Check, Globe, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Draft history helpers ────────────────────────────────────────────────────

type DraftEntry = {
  id: string;
  timestamp: number;
  label: "auto" | "manual";
  content: string;
};

const DRAFT_LIMIT = 30;

function currentDraftScope() {
  const raw = localStorage.getItem("openweb_user");
  let userSiteId: number | null = null;
  if (raw) {
    try {
      userSiteId = (JSON.parse(raw) as { siteId?: number | null }).siteId ?? null;
    } catch {
      userSiteId = null;
    }
  }
  const siteId = userSiteId ?? (Number(sessionStorage.getItem("openweb_site_id")) || 0);
  return `site_${siteId}`;
}

function draftKey(pageId: number) {
  return `openweb_drafts_${currentDraftScope()}_${pageId}`;
}

function loadDrafts(pageId: number): DraftEntry[] {
  try {
    return JSON.parse(localStorage.getItem(draftKey(pageId)) ?? "[]");
  } catch {
    return [];
  }
}

function pushDraft(pageId: number, content: string, label: DraftEntry["label"]): DraftEntry[] {
  const existing = loadDrafts(pageId);
  if (existing.length > 0 && existing[0].content === content) return existing;
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const entry: DraftEntry = { id, timestamp: Date.now(), label, content };
  const updated = [entry, ...existing].slice(0, DRAFT_LIMIT);
  localStorage.setItem(draftKey(pageId), JSON.stringify(updated));
  return updated;
}

function clearDrafts(pageId: number) {
  localStorage.removeItem(draftKey(pageId));
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}

// ─── History dialog ───────────────────────────────────────────────────────────

function HistoryDialog({
  pageId,
  drafts,
  onRestore,
  onClear,
  onClose,
}: {
  pageId: number;
  drafts: DraftEntry[];
  onRestore: (content: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [cleared, setCleared] = useState(false);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" /> Draft history
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Last {DRAFT_LIMIT} saves. Click a draft to restore it.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {drafts.length === 0 || cleared ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <History className="size-8 opacity-30" />
              <p>No drafts saved yet.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {drafts.map((draft, i) => (
                <li key={draft.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                        draft.label === "manual"
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {draft.label === "manual" ? "Saved" : "Auto"}
                      </span>
                      {i === 0 && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          Latest
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium mt-1">{new Date(draft.timestamp).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{formatRelative(draft.timestamp)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { onRestore(draft.content); onClose(); }}
                  >
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {drafts.length > 0 && !cleared && (
          <div className="border-t px-5 py-3 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive text-xs"
              onClick={() => { clearDrafts(pageId); setCleared(true); onClear(); }}
            >
              Clear all drafts
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── PageWebEditor ────────────────────────────────────────────────────────────

export function PageWebEditor() {
  const { id } = useParams();
  const pageId = Number(id);
  const idValid = !Number.isNaN(pageId);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishedMsg, setPublishedMsg] = useState<"saved" | "error" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [draftSavedMsg, setDraftSavedMsg] = useState(false);
  const [palette, setPalette] = useState<ColorPalette>(DEFAULT_PALETTE);

  const lastAutoSaved = useRef<string>("");

  useEffect(() => {
    api.siteSettings.get().then((s) => {
      if (s.navConfig?.palette) setPalette({ ...DEFAULT_PALETTE, ...s.navConfig.palette });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!idValid) { setLoading(false); return; }
    api.pages
      .get(pageId)
      .then((data) => {
        setTitle(data.title);
        setContent(data.content ?? "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    setDrafts(loadDrafts(pageId));
  }, [pageId, idValid]);

  useEffect(() => {
    if (!idValid) return;
    const sync = () => setDrafts(loadDrafts(pageId));
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, [pageId, idValid]);

  useEffect(() => {
    if (!content || content === lastAutoSaved.current || loading) return;
    const timer = setTimeout(() => {
      const updated = pushDraft(pageId, content, "auto");
      setDrafts(updated);
      lastAutoSaved.current = content;
    }, 3000);
    return () => clearTimeout(timer);
  }, [content, pageId, loading]);

  const saveDraft = () => {
    const updated = pushDraft(pageId, content, "manual");
    setDrafts(updated);
    lastAutoSaved.current = content;
    setDraftSavedMsg(true);
    setTimeout(() => setDraftSavedMsg(false), 2000);
  };

  const publish = () => {
    if (!idValid) return;
    setPublishing(true);
    setPublishedMsg(null);
    api.pages
      .update(pageId, { content })
      .then(() => {
        setPublishedMsg("saved");
        setTimeout(() => setPublishedMsg(null), 3000);
      })
      .catch(() => {
        setPublishedMsg("error");
        setTimeout(() => setPublishedMsg(null), 3000);
      })
      .finally(() => setPublishing(false));
  };

  if (!idValid) return <p className="text-destructive p-4">Invalid page ID.</p>;
  if (loading) return <p className="text-muted-foreground p-4">Loading…</p>;
  if (error) return <p className="text-destructive p-4">{error}</p>;

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden">

        {/* ── Top bar ── */}
        <header className="flex items-center justify-between gap-3 px-3 h-12 border-b bg-background shrink-0 z-10">

          {/* Left: breadcrumb */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0 text-muted-foreground">
              <Link to="/admin/pages"><ArrowLeft className="size-4" /></Link>
            </Button>
            <ChevronRight className="size-3.5 text-muted-foreground/30 shrink-0" />
            <Link
              to={`/admin/pages/${pageId}/settings`}
              className="text-sm font-medium truncate hover:text-muted-foreground transition-colors max-w-[160px] sm:max-w-xs"
              title={`${title} — Page settings`}
            >
              {title}
            </Link>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {draftSavedMsg ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="size-3" /> Saved
              </span>
            ) : drafts.length > 0 ? (
              <span className="text-xs text-muted-foreground hidden md:inline">
                {drafts.length} draft{drafts.length !== 1 ? "s" : ""}
              </span>
            ) : null}

            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground" onClick={() => setShowHistory(true)}>
              <History className="size-3.5" />
              <span className="hidden sm:inline">History</span>
            </Button>

            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={saveDraft}>
              <Save className="size-3.5" />
              <span className="hidden sm:inline">Save draft</span>
            </Button>

            <Button
              size="sm"
              className={cn(
                "h-8 gap-1.5 min-w-[90px] transition-all",
                publishedMsg === "saved" && "bg-emerald-600 hover:bg-emerald-700 border-emerald-600",
                publishedMsg === "error" && "bg-destructive hover:bg-destructive"
              )}
              onClick={publish}
              disabled={publishing}
            >
              {publishedMsg === "saved"
                ? <Check className="size-3.5" />
                : <Globe className="size-3.5" />}
              {publishing ? "Publishing…" : publishedMsg === "saved" ? "Published" : publishedMsg === "error" ? "Error" : "Publish"}
            </Button>
          </div>
        </header>

        {/* ── Editor body ── */}
        <div className="flex-1 overflow-hidden">
          <PaletteContext.Provider value={palette}>
            <BlockEditor content={content} onChange={setContent} />
          </PaletteContext.Provider>
        </div>
      </div>

      {showHistory && (
        <HistoryDialog
          pageId={pageId}
          drafts={drafts}
          onRestore={setContent}
          onClear={() => setDrafts([])}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}
