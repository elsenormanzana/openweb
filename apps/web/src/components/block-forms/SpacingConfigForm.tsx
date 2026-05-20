import type { SpacingConfig } from "@/lib/blocks";
import { Maximize2, Move, AlignCenter, Layout } from "lucide-react";

export function SpacingConfigForm({
  spacing = {},
  onChange,
}: {
  spacing?: SpacingConfig;
  onChange: (s: SpacingConfig) => void;
}) {
  const update = (updates: Partial<SpacingConfig>) => {
    onChange({ ...spacing, ...updates });
  };

  return (
    <div className="border rounded-xl p-4 bg-muted/20 border-border space-y-4 text-xs">
      <div className="flex items-center gap-1.5 font-bold text-muted-foreground border-b border-border pb-2">
        <Layout className="size-4 text-purple-500" /> Universal Spacing &amp; Layout
      </div>

      {/* Margin Box Model */}
      <div className="space-y-2">
        <label className="font-semibold text-muted-foreground flex items-center gap-1 text-[11px] uppercase tracking-wider">
          <Move className="size-3.5 text-blue-500" /> Outer Margin
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground block mb-1">Top Margin</span>
            <input
              type="text"
              value={spacing.marginTop || ""}
              onChange={(e) => update({ marginTop: e.target.value })}
              placeholder="e.g. 16px, 2rem, auto"
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block mb-1">Bottom Margin</span>
            <input
              type="text"
              value={spacing.marginBottom || ""}
              onChange={(e) => update({ marginBottom: e.target.value })}
              placeholder="e.g. 16px, 2rem, auto"
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block mb-1">Left Margin</span>
            <input
              type="text"
              value={spacing.marginLeft || ""}
              onChange={(e) => update({ marginLeft: e.target.value })}
              placeholder="e.g. 16px, auto"
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block mb-1">Right Margin</span>
            <input
              type="text"
              value={spacing.marginRight || ""}
              onChange={(e) => update({ marginRight: e.target.value })}
              placeholder="e.g. 16px, auto"
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* Padding Box Model */}
      <div className="space-y-2">
        <label className="font-semibold text-muted-foreground flex items-center gap-1 text-[11px] uppercase tracking-wider">
          <Maximize2 className="size-3.5 text-emerald-500" /> Inner Padding
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground block mb-1">Top Padding</span>
            <input
              type="text"
              value={spacing.paddingTop || ""}
              onChange={(e) => update({ paddingTop: e.target.value })}
              placeholder="e.g. 16px, 2rem"
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block mb-1">Bottom Padding</span>
            <input
              type="text"
              value={spacing.paddingBottom || ""}
              onChange={(e) => update({ paddingBottom: e.target.value })}
              placeholder="e.g. 16px, 2rem"
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block mb-1">Left Padding</span>
            <input
              type="text"
              value={spacing.paddingLeft || ""}
              onChange={(e) => update({ paddingLeft: e.target.value })}
              placeholder="e.g. 16px, 2rem"
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block mb-1">Right Padding</span>
            <input
              type="text"
              value={spacing.paddingRight || ""}
              onChange={(e) => update({ paddingRight: e.target.value })}
              placeholder="e.g. 16px, 2rem"
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* Sizing & Alignment */}
      <div className="space-y-2">
        <label className="font-semibold text-muted-foreground flex items-center gap-1 text-[11px] uppercase tracking-wider">
          <AlignCenter className="size-3.5 text-amber-500" /> Sizing &amp; Alignment
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground block mb-1">Custom Width</span>
            <input
              type="text"
              value={spacing.width || ""}
              onChange={(e) => update({ width: e.target.value })}
              placeholder="e.g. 100%, 300px, auto"
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block mb-1">Max Width</span>
            <input
              type="text"
              value={spacing.maxWidth || ""}
              onChange={(e) => update({ maxWidth: e.target.value })}
              placeholder="e.g. 1200px, 100%"
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block mb-1">Self Alignment (Flex/Grid)</span>
          <select
            value={spacing.alignSelf || "auto"}
            onChange={(e) => update({ alignSelf: e.target.value as any })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="auto">Auto</option>
            <option value="start">Start (Left / Top)</option>
            <option value="center">Center</option>
            <option value="end">End (Right / Bottom)</option>
            <option value="stretch">Stretch</option>
          </select>
        </div>
      </div>
    </div>
  );
}
