import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Trash2, Copy, Check, Image as ImageIcon, Film, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { MediaItem } from "@/lib/api";
import { onDataChange } from "@/lib/dataEvents";

function formatSize(bytes: string | null) {
  if (!bytes) return "";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function Thumb({ item }: { item: MediaItem }) {
  if (item.mimeType.startsWith("image/")) {
    return <img src={item.url} alt={item.filename} loading="lazy" className="w-full h-full object-cover" />;
  }
  if (item.mimeType.startsWith("video/")) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <Film className="size-8 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <FileText className="size-8 text-muted-foreground" />
    </div>
  );
}

export function MediaGallery({ onSelect }: { onSelect?: (item: MediaItem) => void }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    api.media.list()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/media")) load();
    });
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await api.media.upload(file);
      }
      load();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const confirmDelete = (id: number) => setDeleteId(id);

  const handleDelete = async () => {
    if (deleteId == null) return;
    await api.media.delete(deleteId);
    setItems((prev) => prev.filter((i) => i.id !== deleteId));
    setDeleteId(null);
  };

  const copyUrl = (item: MediaItem) => {
    navigator.clipboard.writeText(item.url);
    setCopied(item.id);
    setTimeout(() => setCopied(null), 1500);
  };

  const filtered = filter
    ? items.filter((i) => i.filename.toLowerCase().includes(filter.toLowerCase()) || i.mimeType.includes(filter.toLowerCase()))
    : items;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight flex-1">Media</h1>
        <Input
          placeholder="Filter by name or type…"
          className="w-56 h-8 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*,.gif,.svg,image/svg+xml"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload className="size-4 mr-1" /> {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>

      {error && <p role="alert" aria-live="polite" className="text-destructive text-sm">{error}</p>}

      {loading ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 py-16 text-center text-muted-foreground">
          <ImageIcon className="size-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No media yet</p>
          <p className="text-xs mt-1">Upload photos, GIFs, or videos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "group relative overflow-hidden border-border/60",
                onSelect && "cursor-pointer hover:ring-2 hover:ring-blue-500/50"
              )}
              onClick={() => onSelect?.(item)}
            >
              <div className="aspect-square overflow-hidden">
                <Thumb item={item} />
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{item.filename}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(item.size)} · {item.provider}</p>
              </div>
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Copy URL"
                  className="h-6 w-6"
                  onClick={(e) => { e.stopPropagation(); copyUrl(item); }}
                >
                  {copied === item.id ? <Check className="size-3" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  aria-label={`Delete ${item.filename}`}
                  className="h-6 w-6"
                  onClick={(e) => { e.stopPropagation(); confirmDelete(item.id); }}
                >
                  <Trash2 className="size-3" aria-hidden="true" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete media</DialogTitle>
            <DialogDescription>
              Remove "{items.find((i) => i.id === deleteId)?.filename}"? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
