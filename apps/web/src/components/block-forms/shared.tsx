import { useState, useRef, useEffect, useId, Children, cloneElement, type ReactElement, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, ImageIcon, Crop } from "lucide-react";
import { api, type MediaItem } from "@/lib/api";
import { usePalette } from "@/lib/palette";
import type { CtaButton } from "@/lib/blocks";

// ─── Field helpers ────────────────────────────────────────────────────────────

export function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const single = Children.count(children) === 1;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={single ? id : undefined} className="text-xs font-medium text-muted-foreground">{label}</Label>
      {single ? cloneElement(children as ReactElement<{ id?: string }>, { id }) : children}
    </div>
  );
}

export function Textarea({ value, onChange, rows = 3, placeholder, id }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; id?: string;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y font-mono"
    />
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const palette = usePalette();
  return (
    <Field label={label}>
      {/* Palette swatches */}
      <div className="flex gap-1 flex-wrap mb-1.5">
        {Object.entries(palette).map(([name, color]) => (
          <button
            key={name}
            type="button"
            title={name}
            onClick={() => onChange(color)}
            className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 shrink-0"
            style={{
              backgroundColor: color,
              borderColor: value === color ? "#3b82f6" : "transparent",
              outline: value === color ? "1px solid #3b82f6" : "1px solid #e5e7eb",
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-input p-0.5 shrink-0"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#000000" />
      </div>
    </Field>
  );
}

export function ImagePickerField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Cropping state
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [imgLoaded, setImgLoaded] = useState(false);

  // Dragging / Resizing / Drawing state
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<string | null>(null); // 'nw', 'ne', 'se', 'sw'
  const [drawing, setDrawing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });
  const drawStartPointRef = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  const openGallery = async () => {
    setLoading(true);
    setOpen(true);
    try {
      const items = await api.media.list();
      setMedia(items);
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (preset: "1:1" | "16:9" | "4:3" | "full") => {
    if (preset === "full") {
      setCrop({ x: 0, y: 0, width: 100, height: 100 });
    } else if (preset === "1:1") {
      setCrop({ x: 15, y: 15, width: 70, height: 70 });
    } else if (preset === "16:9") {
      setCrop({ x: 10, y: 25, width: 80, height: 45 });
    } else if (preset === "4:3") {
      setCrop({ x: 10, y: 15, width: 80, height: 60 });
    }
  };

  const handleBoxMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.width,
      cropH: crop.height,
    };
  };

  const handleHandleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(handle);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.width,
      cropH: crop.height,
    };
  };

  const handleContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // left click only

    const imgEl = imgRef.current;
    if (!imgEl) return;
    
    const rect = imgEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const startXPercent = (clickX / rect.width) * 100;
    const startYPercent = (clickY / rect.height) * 100;
    
    if (startXPercent < 0 || startXPercent > 100 || startYPercent < 0 || startYPercent > 100) {
      return;
    }

    setDrawing(true);
    drawStartPointRef.current = { x: startXPercent, y: startYPercent };
    setCrop({
      x: startXPercent,
      y: startYPercent,
      width: 0,
      height: 0
    });
    
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      cropX: startXPercent,
      cropY: startYPercent,
      cropW: 0,
      cropH: 0
    };
  };

  useEffect(() => {
    if (!dragging && !resizing && !drawing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const imgEl = imgRef.current;
      if (!imgEl) return;
      const rect = imgEl.getBoundingClientRect();
      const deltaXPercent = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;

      if (drawing) {
        const startX = drawStartPointRef.current.x;
        const startY = drawStartPointRef.current.y;
        
        let newX = startX;
        let newY = startY;
        let newW = deltaXPercent;
        let newH = deltaYPercent;
        
        if (newW < 0) {
          newX = startX + newW;
          newW = Math.abs(newW);
        }
        if (newH < 0) {
          newY = startY + newH;
          newH = Math.abs(newH);
        }
        
        if (newX < 0) {
          newW = newW + newX;
          newX = 0;
        }
        if (newY < 0) {
          newH = newH + newY;
          newY = 0;
        }
        if (newX + newW > 100) {
          newW = 100 - newX;
        }
        if (newY + newH > 100) {
          newH = 100 - newY;
        }
        
        setCrop({ x: newX, y: newY, width: newW, height: newH });
      } else if (dragging) {
        let newX = dragStartRef.current.cropX + deltaXPercent;
        let newY = dragStartRef.current.cropY + deltaYPercent;

        if (newX < 0) newX = 0;
        if (newX + dragStartRef.current.cropW > 100) newX = 100 - dragStartRef.current.cropW;
        if (newY < 0) newY = 0;
        if (newY + dragStartRef.current.cropH > 100) newY = 100 - dragStartRef.current.cropH;

        setCrop((prev) => ({ ...prev, x: newX, y: newY }));
      } else if (resizing) {
        let { cropX, cropY, cropW, cropH } = dragStartRef.current;
        let newX = cropX;
        let newY = cropY;
        let newW = cropW;
        let newH = cropH;

        if (resizing.includes('e')) {
          newW = cropW + deltaXPercent;
          if (newX + newW > 100) newW = 100 - newX;
          if (newW < 10) newW = 10;
        }
        if (resizing.includes('w')) {
          const maxDelta = cropW - 10;
          const dX = Math.min(deltaXPercent, maxDelta);
          newX = cropX + dX;
          newW = cropW - dX;
          if (newX < 0) {
            newW = cropW + cropX;
            newX = 0;
          }
        }
        if (resizing.includes('s')) {
          newH = cropH + deltaYPercent;
          if (newY + newH > 100) newH = 100 - newY;
          if (newH < 10) newH = 10;
        }
        if (resizing.includes('n')) {
          const maxDelta = cropH - 10;
          const dY = Math.min(deltaYPercent, maxDelta);
          newY = cropY + dY;
          newH = cropH - dY;
          if (newY < 0) {
            newH = cropH + cropY;
            newY = 0;
          }
        }

        setCrop({ x: newX, y: newY, width: newW, height: newH });
      }
    };

    const handleMouseUp = () => {
      setDragging(false);
      setResizing(null);
      setDrawing(false);
      
      setCrop((c) => {
        if (c.width < 2 || c.height < 2) {
          return { x: 10, y: 10, width: 80, height: 80 };
        }
        return c;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, resizing, drawing]);

  const handleSaveCrop = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    if (!natW || !natH) {
      alert("Image not fully loaded yet. Please wait a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    const cw = Math.max(1, Math.round((crop.width / 100) * natW));
    const ch = Math.max(1, Math.round((crop.height / 100) * natH));
    canvas.width = cw;
    canvas.height = ch;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sx = Math.max(0, Math.round((crop.x / 100) * natW));
    const sy = Math.max(0, Math.round((crop.y / 100) * natH));

    try {
      ctx.drawImage(img, sx, sy, cw, ch, 0, 0, cw, ch);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onChange(dataUrl);
      setCropping(false);
    } catch (err) {
      console.error("CORS canvas error:", err);
      alert("Could not crop image directly due to browser CORS security restrictions on external URLs. To crop this image, please upload it to your Media library first.");
    }
  };

  return (
    <Field label={label}>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or pick from gallery" className="flex-1 text-xs" />
          <Button size="icon" variant="outline" type="button" onClick={openGallery} title="Pick from gallery" className="shrink-0 h-9 w-9">
            <ImageIcon className="size-4" />
          </Button>
          {value && !value.endsWith(".mp4") && !value.endsWith(".webm") && (
            <Button size="icon" variant="outline" type="button" onClick={() => { setCropping(true); setImgLoaded(false); }} title="Crop Image" className="shrink-0 h-9 w-9 text-blue-500 hover:text-blue-600 border-blue-500/30 hover:border-blue-500">
              <Crop className="size-4" />
            </Button>
          )}
        </div>
        {value && (
          <img
            src={value}
            alt=""
            className="h-20 w-full object-cover rounded-md border"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )}
      </div>

      {/* Media Gallery Modal */}
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Media gallery" className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <p className="text-sm font-semibold">Media gallery</p>
              <button aria-label="Close media gallery" onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {loading ? (
                <p className="text-sm text-center text-muted-foreground py-8">Loading...</p>
              ) : media.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-8">No media uploaded yet. Upload files in the Media section.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {media.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { onChange(item.url); setOpen(false); }}
                      className="group aspect-square rounded-md overflow-hidden border-2 border-transparent hover:border-blue-500 transition-colors relative"
                      title={item.filename}
                    >
                      {item.mimeType.startsWith("video/") ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 gap-1 p-1">
                          <ImageIcon className="size-5 text-gray-400" />
                          <span className="text-[10px] text-gray-500 truncate w-full text-center">{item.filename}</span>
                        </div>
                      ) : (
                        <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      {cropping && value && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setCropping(false)}>
          <div role="dialog" aria-modal="true" aria-label="Crop Image" className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0 bg-slate-950">
              <div className="flex items-center gap-2">
                <Crop className="size-4.5 text-blue-400" />
                <p className="text-base font-bold">Crop & Resize Image (Drag & Drop)</p>
              </div>
              <button aria-label="Close cropper" onClick={() => setCropping(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <X className="size-4.5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Presets */}
              <div className="flex items-center justify-between gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 pl-2">Aspect Presets:</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setPreset("full")} className="h-7 text-xs hover:bg-slate-800">Full</Button>
                  <Button size="sm" variant="ghost" onClick={() => setPreset("1:1")} className="h-7 text-xs hover:bg-slate-800">1:1 Square</Button>
                  <Button size="sm" variant="ghost" onClick={() => setPreset("16:9")} className="h-7 text-xs hover:bg-slate-800">16:9 Wide</Button>
                  <Button size="sm" variant="ghost" onClick={() => setPreset("4:3")} className="h-7 text-xs hover:bg-slate-800">4:3</Button>
                </div>
              </div>

              {/* Visual Drag & Drop Preview */}
              <div className="flex items-center justify-center bg-black rounded-xl border border-slate-800 p-4 overflow-hidden min-h-[280px]">
                <div onMouseDown={handleContainerMouseDown} className="relative inline-block max-w-full max-h-[360px] select-none overflow-hidden border border-slate-700 rounded shadow-2xl bg-slate-950">
                  <img
                    ref={imgRef}
                    src={value}
                    crossOrigin="anonymous"
                    onLoad={() => setImgLoaded(true)}
                    alt="Crop preview"
                    className="block max-h-[360px] w-auto object-contain pointer-events-none select-none"
                  />

                  {/* Dark overlay for uncropped area */}
                  {imgLoaded && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        clipPath: `polygon(
                          0% 0%, 100% 0%, 100% 100%, 0% 100%,
                          0% 0%,
                          ${crop.x}% ${crop.y}%,
                          ${crop.x}% ${crop.y + crop.height}%,
                          ${crop.x + crop.width}% ${crop.y + crop.height}%,
                          ${crop.x + crop.width}% ${crop.y}%,
                          ${crop.x}% ${crop.y}%
                        )`
                      }}
                    >
                      <div className="w-full h-full bg-black/70 backdrop-blur-[1px]" />
                    </div>
                  )}

                  {/* Interactive Crop Bounding Box */}
                  {imgLoaded && (
                    <div
                      className="absolute border-2 border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)] cursor-move flex items-center justify-center group"
                      style={{
                        left: `${crop.x}%`,
                        top: `${crop.y}%`,
                        width: `${crop.width}%`,
                        height: `${crop.height}%`,
                      }}
                      onMouseDown={handleBoxMouseDown}
                    >
                      {/* Premium Grid Lines */}
                      <div className="absolute inset-x-0 top-1/3 border-t border-white/30 pointer-events-none" />
                      <div className="absolute inset-x-0 top-2/3 border-t border-white/30 pointer-events-none" />
                      <div className="absolute inset-y-0 left-1/3 border-l border-white/30 pointer-events-none" />
                      <div className="absolute inset-y-0 left-2/3 border-l border-white/30 pointer-events-none" />

                      {/* Corner Handles for Resizing */}
                      <div
                        className="absolute -top-2.5 -left-2.5 size-5 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize hover:scale-125 transition-transform shadow-md z-10 flex items-center justify-center"
                        onMouseDown={(e) => handleHandleMouseDown(e, "nw")}
                      />
                      <div
                        className="absolute -top-2.5 -right-2.5 size-5 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize hover:scale-125 transition-transform shadow-md z-10 flex items-center justify-center"
                        onMouseDown={(e) => handleHandleMouseDown(e, "ne")}
                      />
                      <div
                        className="absolute -bottom-2.5 -left-2.5 size-5 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize hover:scale-125 transition-transform shadow-md z-10 flex items-center justify-center"
                        onMouseDown={(e) => handleHandleMouseDown(e, "sw")}
                      />
                      <div
                        className="absolute -bottom-2.5 -right-2.5 size-5 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize hover:scale-125 transition-transform shadow-md z-10 flex items-center justify-center"
                        onMouseDown={(e) => handleHandleMouseDown(e, "se")}
                      />
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-center text-slate-400 italic">
                💡 Click & drag the box to move. Drag the corner circular handles to resize.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950 shrink-0">
              <Button size="sm" variant="outline" onClick={() => setCropping(false)} className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-white">Cancel</Button>
              <Button size="sm" onClick={handleSaveCrop} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">Apply Crop</Button>
            </div>
          </div>
        </div>
      )}
    </Field>
  );
}

export function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export function CtaButtonField({ label, value, onChange }: { label: string; value: CtaButton; onChange: (v: CtaButton) => void }) {
  return (
    <div className="border rounded-md p-3 space-y-3 bg-muted/20 border-border">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Label">
          <Input value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} placeholder="Button text" />
        </Field>
        <Field label="URL">
          <Input value={value.href} onChange={(e) => onChange({ ...value, href: e.target.value })} placeholder="https://..." />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Icon Logo">
          <select
            value={value.icon || ""}
            onChange={(e) => onChange({ ...value, icon: e.target.value || undefined })}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          >
            <option value="">None</option>
            <option value="Google">Google</option>
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
            <option value="X">X (Twitter)</option>
            <option value="GitHub">GitHub</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="YouTube">YouTube</option>
            <option value="Discord">Discord</option>
            <option value="TikTok">TikTok</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Reddit">Reddit</option>
            <option value="Pinterest">Pinterest</option>
            <option value="ArrowRight">Arrow Right</option>
            <option value="ExternalLink">External Link</option>
            <option value="Star">Star</option>
            <option value="Heart">Heart</option>
            <option value="Check">Check</option>
            <option value="Mail">Mail</option>
            <option value="Phone">Phone</option>
            <option value="MessageCircle">Chat</option>
          </select>
        </Field>

        <Field label="Emoji">
          <Input value={value.emoji || ""} onChange={(e) => onChange({ ...value, emoji: e.target.value || undefined })} placeholder="🚀, 🔥, ✨" className="text-xs" />
        </Field>

        <Field label="Position">
          <select
            value={value.iconPosition || "left"}
            onChange={(e) => onChange({ ...value, iconPosition: e.target.value as any })}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Style Variant" value={value.variant || "solid"} onChange={(v) => onChange({ ...value, variant: v as any })} options={[
          { value: "solid", label: "Solid" },
          { value: "outline", label: "Outline" },
          { value: "glass", label: "Glassmorphic" },
          { value: "shimmer", label: "Shimmer Gradient" },
        ]} />
        <SelectField label="Size" value={value.size || "md"} onChange={(v) => onChange({ ...value, size: v as any })} options={[
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
        ]} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ColorField label="Bg Color" value={value.color || ""} onChange={(v) => onChange({ ...value, color: v })} />
        <ColorField label="Text Color" value={value.textColor || ""} onChange={(v) => onChange({ ...value, textColor: v })} />
        <SelectField label="Radius" value={value.borderRadius || "md"} onChange={(v) => onChange({ ...value, borderRadius: v as any })} options={[
          { value: "none", label: "None" },
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
          { value: "full", label: "Full" },
        ]} />
      </div>
    </div>
  );
}


export function ItemHeader({ title, onRemove }: { title: string; onRemove: () => void }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs font-semibold text-muted-foreground">{title}</span>
      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onRemove}>
        <X className="size-3" />
      </Button>
    </div>
  );
}
