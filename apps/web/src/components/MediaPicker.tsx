import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageIcon } from "lucide-react";
import { MediaGallery } from "@/pages/MediaGallery";
import type { MediaItem } from "@/lib/api";

export function MediaPicker({ value, onChange, label }: { value: string; onChange: (url: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);

  const handleSelect = (item: MediaItem) => {
    onChange(item.url);
    setOpen(false);
  };

  return (
    <div className="space-y-1">
      {label && <span className="text-xs font-medium">{label}</span>}
      <div className="flex gap-1.5">
        <input
          className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
          placeholder="https://… or pick from gallery"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={() => setOpen(true)}>
          <ImageIcon className="size-3.5 mr-1" /> Gallery
        </Button>
      </div>
      {value && (
        <img src={value} alt="" className="mt-1 h-16 w-auto rounded border object-cover" />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Pick from gallery</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-auto">
            <MediaGallery onSelect={handleSelect} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
