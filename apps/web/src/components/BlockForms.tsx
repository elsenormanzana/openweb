import { useState, useId, Children, cloneElement, type ReactElement, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X, ImageIcon } from "lucide-react";
import { api, type MediaItem } from "@/lib/api";
import { FEATURE_ICON_MAP } from "@/lib/blocks";
import { usePalette } from "@/lib/palette";
import type {
  Block,
  HeroBlockProps,
  CtaBlockProps,
  FeaturesBlockProps,
  BioCardsBlockProps,
  SlideshowBlockProps,
  PricingBlockProps,
  TestimonialsBlockProps,
  FaqBlockProps,
  StatsBlockProps,
  LogoCloudBlockProps,
  TextBlockProps,
  ImageBlockProps,
  SpacerBlockProps,
  HeadingBlockProps,
  ColumnsBlockProps,
  DividerBlockProps,
  NavbarBlockProps,
  NavbarLink,
  NewsletterBlockProps,
  ContactBlockProps,
  CtaButton,
  FeatureItem,
  BioCardItem,
  SlideshowItem,
  PricingTier,
  TestimonialItem,
  FaqItem,
  StatItem,
  LogoItem,
} from "@/lib/blocks";

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

  return (
    <Field label={label}>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or pick from gallery" className="flex-1 text-xs" />
          <Button size="icon" variant="outline" type="button" onClick={openGallery} title="Pick from gallery" className="shrink-0 h-9 w-9">
            <ImageIcon className="size-4" />
          </Button>
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
                <p className="text-sm text-center text-muted-foreground py-8">Loading…</p>
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

function CtaButtonField({ label, value, onChange }: { label: string; value: CtaButton; onChange: (v: CtaButton) => void }) {
  return (
    <div className="border rounded-md p-3 space-y-2 bg-muted/20">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <Field label="Label">
        <Input value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} placeholder="Button text" />
      </Field>
      <Field label="URL">
        <Input value={value.href} onChange={(e) => onChange({ ...value, href: e.target.value })} placeholder="https://..." />
      </Field>
    </div>
  );
}

function ItemHeader({ title, onRemove }: { title: string; onRemove: () => void }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs font-semibold text-muted-foreground">{title}</span>
      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onRemove}>
        <X className="size-3" />
      </Button>
    </div>
  );
}

// ─── Block-specific forms ─────────────────────────────────────────────────────

function HeroForm({ props, onChange }: { props: HeroBlockProps; onChange: (p: HeroBlockProps) => void }) {
  const set = <K extends keyof HeroBlockProps>(k: K, v: HeroBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Subheading"><Input value={props.subheading} onChange={(e) => set("subheading", e.target.value)} /></Field>
      <Field label="Description"><Textarea value={props.description} onChange={(v) => set("description", v)} /></Field>
      <Field label="Badge text"><Input value={props.badgeText} onChange={(e) => set("badgeText", e.target.value)} /></Field>
      <SelectField label="Alignment" value={props.align} onChange={(v) => set("align", v as "left" | "center")} options={[{ value: "center", label: "Center" }, { value: "left", label: "Left" }]} />
      <SelectField label="Text color" value={props.textColor} onChange={(v) => set("textColor", v as "light" | "dark")} options={[{ value: "light", label: "Light (white)" }, { value: "dark", label: "Dark" }]} />
      <SelectField label="Background" value={props.backgroundType} onChange={(v) => set("backgroundType", v as "color" | "image" | "video")} options={[{ value: "color", label: "Color" }, { value: "image", label: "Image" }, { value: "video", label: "Video" }]} />
      {props.backgroundType === "color" && (
        <ColorField label="Background color" value={props.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
      )}
      {props.backgroundType === "image" && (
        <ImagePickerField label="Background image" value={props.backgroundImage} onChange={(v) => set("backgroundImage", v)} />
      )}
      {props.backgroundType === "video" && (
        <ImagePickerField label="Background video" value={props.backgroundVideo} onChange={(v) => set("backgroundVideo", v)} />
      )}
      {(props.backgroundType === "image" || props.backgroundType === "video") && (
        <Field label={`Overlay opacity — ${props.backgroundOpacity ?? 50}%`}>
          <input
            type="range" min="0" max="100"
            value={props.backgroundOpacity ?? 50}
            onChange={(e) => set("backgroundOpacity", Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </Field>
      )}
      <CtaButtonField label="Primary CTA" value={props.primaryCta} onChange={(v) => set("primaryCta", v)} />
      <CtaButtonField label="Secondary CTA" value={props.secondaryCta} onChange={(v) => set("secondaryCta", v)} />
    </div>
  );
}

function CtaForm({ props, onChange }: { props: CtaBlockProps; onChange: (p: CtaBlockProps) => void }) {
  const set = <K extends keyof CtaBlockProps>(k: K, v: CtaBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Description"><Textarea value={props.description} onChange={(v) => set("description", v)} /></Field>
      <ColorField label="Background color" value={props.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
      <SelectField label="Text color" value={props.textColor} onChange={(v) => set("textColor", v as "light" | "dark")} options={[{ value: "light", label: "Light (white)" }, { value: "dark", label: "Dark" }]} />
      <CtaButtonField label="Primary CTA" value={props.primaryCta} onChange={(v) => set("primaryCta", v)} />
      <CtaButtonField label="Secondary CTA" value={props.secondaryCta} onChange={(v) => set("secondaryCta", v)} />
    </div>
  );
}

function FeaturesForm({ props, onChange }: { props: FeaturesBlockProps; onChange: (p: FeaturesBlockProps) => void }) {
  const set = <K extends keyof FeaturesBlockProps>(k: K, v: FeaturesBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof FeatureItem, v: string) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Subheading"><Input value={props.subheading} onChange={(e) => set("subheading", e.target.value)} /></Field>
      <SelectField label="Columns" value={String(props.columns)} onChange={(v) => set("columns", Number(v) as 2 | 3 | 4)} options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]} />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Items</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { icon: "⭐", title: "New Feature", description: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={`Item ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Icon">
              <div className="grid grid-cols-10 gap-0.5 p-1 border rounded-md bg-muted/20">
                {(Object.entries(FEATURE_ICON_MAP) as [string, React.ComponentType<{ className?: string }>][]).map(([name, Icon]) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => updateItem(i, "icon", name)}
                    className={`p-1.5 rounded flex items-center justify-center transition-colors ${item.icon === name ? "bg-blue-100 text-blue-600" : "hover:bg-accent text-muted-foreground"}`}
                  >
                    <Icon className="size-3.5" />
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Title"><Input value={item.title} onChange={(e) => updateItem(i, "title", e.target.value)} /></Field>
            <Field label="Description"><Textarea value={item.description} onChange={(v) => updateItem(i, "description", v)} rows={2} /></Field>
          </div>
        ))}
      </div>
    </div>
  );
}

function BioCardsForm({ props, onChange }: { props: BioCardsBlockProps; onChange: (p: BioCardsBlockProps) => void }) {
  const set = <K extends keyof BioCardsBlockProps>(k: K, v: BioCardsBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof BioCardItem, v: string) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Subheading"><Input value={props.subheading} onChange={(e) => set("subheading", e.target.value)} /></Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Cards</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { name: "New Person", role: "", bio: "", avatar: "", linkedin: "", twitter: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={item.name || `Card ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Name"><Input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} /></Field>
            <Field label="Role"><Input value={item.role} onChange={(e) => updateItem(i, "role", e.target.value)} /></Field>
            <Field label="Bio"><Textarea value={item.bio} onChange={(v) => updateItem(i, "bio", v)} rows={2} /></Field>
            <ImagePickerField label="Avatar" value={item.avatar} onChange={(v) => updateItem(i, "avatar", v)} />
            <Field label="LinkedIn URL"><Input value={item.linkedin} onChange={(e) => updateItem(i, "linkedin", e.target.value)} /></Field>
            <Field label="Twitter URL"><Input value={item.twitter} onChange={(e) => updateItem(i, "twitter", e.target.value)} /></Field>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideshowForm({ props, onChange }: { props: SlideshowBlockProps; onChange: (p: SlideshowBlockProps) => void }) {
  const set = <K extends keyof SlideshowBlockProps>(k: K, v: SlideshowBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof SlideshowItem, v: string | CtaButton) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Subheading"><Input value={props.subheading} onChange={(e) => set("subheading", e.target.value)} /></Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Slides</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { title: "New Slide", description: "", image: "", badge: "", cta: { label: "", href: "" } }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={`Slide ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Title"><Input value={item.title} onChange={(e) => updateItem(i, "title", e.target.value)} /></Field>
            <Field label="Description"><Textarea value={item.description} onChange={(v) => updateItem(i, "description", v)} rows={2} /></Field>
            <ImagePickerField label="Image" value={item.image} onChange={(v) => updateItem(i, "image", v)} />
            <Field label="Badge"><Input value={item.badge} onChange={(e) => updateItem(i, "badge", e.target.value)} /></Field>
            <CtaButtonField label="CTA" value={item.cta} onChange={(v) => updateItem(i, "cta", v)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingForm({ props, onChange }: { props: PricingBlockProps; onChange: (p: PricingBlockProps) => void }) {
  const set = <K extends keyof PricingBlockProps>(k: K, v: PricingBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateTier = (i: number, field: keyof PricingTier, v: string | boolean | string[] | CtaButton) =>
    set("tiers", props.tiers.map((t, idx) => idx === i ? { ...t, [field]: v } : t));
  const updateFeature = (ti: number, fi: number, v: string) =>
    set("tiers", props.tiers.map((t, idx) => idx === ti ? { ...t, features: t.features.map((f, fIdx) => fIdx === fi ? v : f) } : t));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Subheading"><Input value={props.subheading} onChange={(e) => set("subheading", e.target.value)} /></Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Tiers</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("tiers", [...props.tiers, { name: "New Tier", price: "$0", period: "/mo", description: "", features: [], cta: { label: "Get Started", href: "#" }, highlighted: false }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.tiers.map((tier, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={tier.name} onRemove={() => set("tiers", props.tiers.filter((_, idx) => idx !== i))} />
            <div className="grid grid-cols-3 gap-2">
              <Field label="Name"><Input value={tier.name} onChange={(e) => updateTier(i, "name", e.target.value)} /></Field>
              <Field label="Price"><Input value={tier.price} onChange={(e) => updateTier(i, "price", e.target.value)} /></Field>
              <Field label="Period"><Input value={tier.period} onChange={(e) => updateTier(i, "period", e.target.value)} /></Field>
            </div>
            <Field label="Description"><Input value={tier.description} onChange={(e) => updateTier(i, "description", e.target.value)} /></Field>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Features</Label>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => updateTier(i, "features", [...tier.features, ""])}><Plus className="size-3 mr-1" />Add</Button>
              </div>
              {tier.features.map((f, fi) => (
                <div key={fi} className="flex gap-1 items-center">
                  <Input value={f} onChange={(e) => updateFeature(i, fi, e.target.value)} className="flex-1" />
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => updateTier(i, "features", tier.features.filter((_, fIdx) => fIdx !== fi))}><X className="size-3" /></Button>
                </div>
              ))}
            </div>
            <CtaButtonField label="CTA" value={tier.cta} onChange={(v) => updateTier(i, "cta", v)} />
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={tier.highlighted} onChange={(e) => updateTier(i, "highlighted", e.target.checked)} className="rounded" />
              Highlighted (featured tier)
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialsForm({ props, onChange }: { props: TestimonialsBlockProps; onChange: (p: TestimonialsBlockProps) => void }) {
  const set = <K extends keyof TestimonialsBlockProps>(k: K, v: TestimonialsBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof TestimonialItem, v: string) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Testimonials</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { quote: "", name: "", role: "", company: "", avatar: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={item.name || `Testimonial ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Quote"><Textarea value={item.quote} onChange={(v) => updateItem(i, "quote", v)} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Name"><Input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} /></Field>
              <Field label="Role"><Input value={item.role} onChange={(e) => updateItem(i, "role", e.target.value)} /></Field>
            </div>
            <Field label="Company"><Input value={item.company} onChange={(e) => updateItem(i, "company", e.target.value)} /></Field>
            <ImagePickerField label="Avatar" value={item.avatar} onChange={(v) => updateItem(i, "avatar", v)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqForm({ props, onChange }: { props: FaqBlockProps; onChange: (p: FaqBlockProps) => void }) {
  const set = <K extends keyof FaqBlockProps>(k: K, v: FaqBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof FaqItem, v: string) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Questions</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { question: "", answer: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={`Q${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <Field label="Question"><Input value={item.question} onChange={(e) => updateItem(i, "question", e.target.value)} /></Field>
            <Field label="Answer"><Textarea value={item.answer} onChange={(v) => updateItem(i, "answer", v)} /></Field>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsForm({ props, onChange }: { props: StatsBlockProps; onChange: (p: StatsBlockProps) => void }) {
  const set = <K extends keyof StatsBlockProps>(k: K, v: StatsBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateItem = (i: number, field: keyof StatItem, v: string) =>
    set("items", props.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Stats</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("items", [...props.items, { value: "0", label: "", description: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <ItemHeader title={`Stat ${i + 1}`} onRemove={() => set("items", props.items.filter((_, idx) => idx !== i))} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Value"><Input value={item.value} onChange={(e) => updateItem(i, "value", e.target.value)} /></Field>
              <Field label="Label"><Input value={item.label} onChange={(e) => updateItem(i, "label", e.target.value)} /></Field>
            </div>
            <Field label="Description"><Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} /></Field>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogoCloudForm({ props, onChange }: { props: LogoCloudBlockProps; onChange: (p: LogoCloudBlockProps) => void }) {
  const set = <K extends keyof LogoCloudBlockProps>(k: K, v: LogoCloudBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateLogo = (i: number, field: keyof LogoItem, v: string) =>
    set("logos", props.logos.map((l, idx) => idx === i ? { ...l, [field]: v } : l));
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Subheading"><Input value={props.subheading} onChange={(e) => set("subheading", e.target.value)} /></Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Logos</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("logos", [...props.logos, { name: "", url: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.logos.map((logo, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{logo.name || `Logo ${i + 1}`}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => set("logos", props.logos.filter((_, idx) => idx !== i))}><X className="size-3" /></Button>
            </div>
            <Field label="Name"><Input placeholder="Company name" value={logo.name} onChange={(e) => updateLogo(i, "name", e.target.value)} /></Field>
            <ImagePickerField label="Logo image" value={logo.url} onChange={(v) => updateLogo(i, "url", v)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TextForm({ props, onChange }: { props: TextBlockProps; onChange: (p: TextBlockProps) => void }) {
  const set = <K extends keyof TextBlockProps>(k: K, v: TextBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <SelectField label="Alignment" value={props.align} onChange={(v) => set("align", v as "left" | "center" | "right")} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} />
      <Field label="Content (HTML)"><Textarea value={props.content} onChange={(v) => set("content", v)} rows={10} placeholder="<p>Your content...</p>" /></Field>
    </div>
  );
}

function ImageForm({ props, onChange }: { props: ImageBlockProps; onChange: (p: ImageBlockProps) => void }) {
  const set = <K extends keyof ImageBlockProps>(k: K, v: ImageBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <ImagePickerField label="Image" value={props.src} onChange={(v) => set("src", v)} />
      <Field label="Alt text"><Input value={props.alt} onChange={(e) => set("alt", e.target.value)} /></Field>
      <SelectField label="Width" value={props.width} onChange={(v) => set("width", v as "full" | "contained")} options={[{ value: "contained", label: "Contained" }, { value: "full", label: "Full width" }]} />
      <Field label="Caption"><Input value={props.caption} onChange={(e) => set("caption", e.target.value)} /></Field>
    </div>
  );
}

function SpacerForm({ props, onChange }: { props: SpacerBlockProps; onChange: (p: SpacerBlockProps) => void }) {
  return (
    <SelectField label="Height" value={String(props.height)} onChange={(v) => onChange({ height: Number(v) as SpacerBlockProps["height"] })} options={[16, 32, 48, 64, 96, 128].map((h) => ({ value: String(h), label: `${h}px` }))} />
  );
}

function HeadingForm({ props, onChange }: { props: HeadingBlockProps; onChange: (p: HeadingBlockProps) => void }) {
  const set = <K extends keyof HeadingBlockProps>(k: K, v: HeadingBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Text"><Input value={props.text} onChange={(e) => set("text", e.target.value)} /></Field>
      <SelectField label="Heading level" value={props.level} onChange={(v) => set("level", v as HeadingBlockProps["level"])} options={[
        { value: "h1", label: "H1 — Largest" },
        { value: "h2", label: "H2" },
        { value: "h3", label: "H3" },
        { value: "h4", label: "H4" },
        { value: "h5", label: "H5" },
        { value: "h6", label: "H6 — Smallest" },
      ]} />
      <SelectField label="Alignment" value={props.align} onChange={(v) => set("align", v as "left" | "center" | "right")} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} />
      <ColorField label="Color (leave blank for default)" value={props.color} onChange={(v) => set("color", v)} />
    </div>
  );
}

function ColumnsForm({ props, onChange }: { props: ColumnsBlockProps; onChange: (p: ColumnsBlockProps) => void }) {
  const set = <K extends keyof ColumnsBlockProps>(k: K, v: ColumnsBlockProps[K]) => onChange({ ...props, [k]: v });
  const setColCount = (n: number) => {
    const cols = [...props.columns];
    while (cols.length < n) cols.push({ content: "<p>Column content</p>" });
    set("columns", cols.slice(0, n));
  };
  const updateCol = (i: number, v: string) =>
    set("columns", props.columns.map((c, idx) => idx === i ? { ...c, content: v } : c));
  return (
    <div className="space-y-3">
      <SelectField label="Number of columns" value={String(props.columns.length)} onChange={(v) => setColCount(Number(v))} options={[{ value: "2", label: "2 columns" }, { value: "3", label: "3 columns" }]} />
      <SelectField label="Gap" value={props.gap} onChange={(v) => set("gap", v as ColumnsBlockProps["gap"])} options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]} />
      <SelectField label="Vertical padding" value={props.paddingY} onChange={(v) => set("paddingY", v as ColumnsBlockProps["paddingY"])} options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]} />
      <ColorField label="Background (leave blank for none)" value={props.bgColor} onChange={(v) => set("bgColor", v)} />
      {props.columns.map((col, i) => (
        <Field key={i} label={`Column ${i + 1} HTML`}>
          <Textarea value={col.content} onChange={(v) => updateCol(i, v)} rows={6} placeholder="<p>HTML content...</p>" />
        </Field>
      ))}
    </div>
  );
}

function DividerForm({ props, onChange }: { props: DividerBlockProps; onChange: (p: DividerBlockProps) => void }) {
  const set = <K extends keyof DividerBlockProps>(k: K, v: DividerBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <SelectField label="Style" value={props.style} onChange={(v) => set("style", v as DividerBlockProps["style"])} options={[
        { value: "solid", label: "Solid" },
        { value: "dashed", label: "Dashed" },
        { value: "dotted", label: "Dotted" },
        { value: "none", label: "None (space only)" },
      ]} />
      {props.style !== "none" && (
        <ColorField label="Color" value={props.color} onChange={(v) => set("color", v)} />
      )}
      <SelectField label="Padding" value={String(props.paddingY)} onChange={(v) => set("paddingY", Number(v) as DividerBlockProps["paddingY"])} options={[
        { value: "8", label: "Small (8px)" },
        { value: "16", label: "Medium (16px)" },
        { value: "32", label: "Large (32px)" },
        { value: "48", label: "X-Large (48px)" },
      ]} />
    </div>
  );
}

function NavbarForm({ props, onChange }: { props: NavbarBlockProps; onChange: (p: NavbarBlockProps) => void }) {
  const set = <K extends keyof NavbarBlockProps>(k: K, v: NavbarBlockProps[K]) => onChange({ ...props, [k]: v });
  const updateLink = (i: number, field: keyof NavbarLink, v: string) =>
    set("links", props.links.map((l, idx) => idx === i ? { ...l, [field]: v } : l));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Logo text"><Input value={props.logoText} onChange={(e) => set("logoText", e.target.value)} /></Field>
        <Field label="Logo link"><Input value={props.logoHref} onChange={(e) => set("logoHref", e.target.value)} /></Field>
      </div>
      <SelectField label="Style" value={props.style} onChange={(v) => set("style", v as NavbarBlockProps["style"])} options={[
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
        { value: "transparent", label: "Transparent" },
      ]} />
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={props.sticky} onChange={(e) => set("sticky", e.target.checked)} className="rounded" />
        Sticky (fixed to top on scroll)
      </label>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Nav links</Label>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => set("links", [...props.links, { label: "", href: "" }])}><Plus className="size-3 mr-1" />Add</Button>
        </div>
        {props.links.map((link, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <Input placeholder="Label" value={link.label} onChange={(e) => updateLink(i, "label", e.target.value)} />
            <Input placeholder="/path" value={link.href} onChange={(e) => updateLink(i, "href", e.target.value)} />
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => set("links", props.links.filter((_, idx) => idx !== i))}><X className="size-3" /></Button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="CTA label"><Input value={props.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} /></Field>
        <Field label="CTA href"><Input value={props.ctaHref} onChange={(e) => set("ctaHref", e.target.value)} /></Field>
      </div>
    </div>
  );
}

function NewsletterForm({ props, onChange }: { props: NewsletterBlockProps; onChange: (p: NewsletterBlockProps) => void }) {
  const set = <K extends keyof NewsletterBlockProps>(k: K, v: NewsletterBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Description"><Textarea value={props.description} onChange={(v) => set("description", v)} rows={2} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Input placeholder"><Input value={props.placeholder} onChange={(e) => set("placeholder", e.target.value)} /></Field>
        <Field label="Button label"><Input value={props.buttonLabel} onChange={(e) => set("buttonLabel", e.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={props.collectName} onChange={(e) => set("collectName", e.target.checked)} className="rounded" />
        Collect name field
      </label>
      <ColorField label="Background color" value={props.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
      <SelectField label="Text color" value={props.textColor} onChange={(v) => set("textColor", v as "light" | "dark")} options={[{ value: "light", label: "Light (white)" }, { value: "dark", label: "Dark" }]} />
      <SelectField label="Alignment" value={props.align} onChange={(v) => set("align", v as "left" | "center")} options={[{ value: "center", label: "Center" }, { value: "left", label: "Left" }]} />
    </div>
  );
}

function ContactForm({ props, onChange }: { props: ContactBlockProps; onChange: (p: ContactBlockProps) => void }) {
  const set = <K extends keyof ContactBlockProps>(k: K, v: ContactBlockProps[K]) => onChange({ ...props, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Heading"><Input value={props.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Subheading"><Textarea value={props.subheading} onChange={(v) => set("subheading", v)} rows={2} /></Field>
      <Field label="Email"><Input type="email" value={props.email} onChange={(e) => set("email", e.target.value)} placeholder="hello@example.com" /></Field>
      <Field label="Phone"><Input value={props.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 (555) 000-0000" /></Field>
      <Field label="Address"><Textarea value={props.address} onChange={(v) => set("address", v)} rows={2} /></Field>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={props.showForm} onChange={(e) => set("showForm", e.target.checked)} className="rounded" />
        Show contact form
      </label>
      {props.showForm && (
        <>
          <Field label="Native form slug (optional)"><Input value={props.formSlug} onChange={(e) => set("formSlug", e.target.value)} placeholder="contact-sales" /></Field>
          <Field label="Submit button label"><Input value={props.submitLabel} onChange={(e) => set("submitLabel", e.target.value)} placeholder="Send Message" /></Field>
        </>
      )}
      <ColorField label="Background (blank for white)" value={props.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
    </div>
  );
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

export function BlockPropsForm({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  switch (block.type) {
    case "hero": return <HeroForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "cta": return <CtaForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "features": return <FeaturesForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "bio-cards": return <BioCardsForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "slideshow": return <SlideshowForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "pricing": return <PricingForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "testimonials": return <TestimonialsForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "faq": return <FaqForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "stats": return <StatsForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "logo-cloud": return <LogoCloudForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "text": return <TextForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "image": return <ImageForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "spacer": return <SpacerForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "heading": return <HeadingForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "columns": return <ColumnsForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "divider": return <DividerForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "navbar": return <NavbarForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "newsletter": return <NewsletterForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
    case "contact": return <ContactForm props={block.props} onChange={(p) => onChange({ ...block, props: p })} />;
  }
}
