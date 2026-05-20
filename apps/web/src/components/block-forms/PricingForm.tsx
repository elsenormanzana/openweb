import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { PricingBlockProps, PricingTier, CtaButton } from "@/lib/blocks";
import { Field, CtaButtonField, ItemHeader } from "./shared";

export function PricingForm({ props, onChange }: { props: PricingBlockProps; onChange: (p: PricingBlockProps) => void }) {
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
