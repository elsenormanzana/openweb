import type { AnimationConfig } from "@/lib/animations";
import { DEFAULT_ANIMATION, ENTRANCE_OPTIONS, EASING_OPTIONS } from "@/lib/animations";
import { Field, SelectField } from "./shared";

export function AnimationConfigForm({
  animation,
  onChange,
}: {
  animation?: AnimationConfig;
  onChange: (config: AnimationConfig) => void;
}) {
  const config = animation ?? DEFAULT_ANIMATION;
  const set = <K extends keyof AnimationConfig>(k: K, v: AnimationConfig[K]) =>
    onChange({ ...config, [k]: v });

  return (
    <div className="border rounded-md p-3 space-y-3 bg-muted/20">
      <p className="text-xs font-semibold text-muted-foreground">Animation</p>

      <SelectField
        label="Entrance"
        value={config.entrance}
        onChange={(v) => set("entrance", v as AnimationConfig["entrance"])}
        options={ENTRANCE_OPTIONS}
      />

      {config.entrance !== "none" && (
        <>
          <Field label={`Duration — ${config.duration}s`}>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={config.duration}
              onChange={(e) => set("duration", Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </Field>

          <Field label={`Delay — ${config.delay}s`}>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.delay}
              onChange={(e) => set("delay", Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </Field>

          <Field label={`Stagger — ${config.stagger}s`}>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.05"
              value={config.stagger}
              onChange={(e) => set("stagger", Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </Field>

          <SelectField
            label="Easing"
            value={config.easing ?? "easeOut"}
            onChange={(v) => set("easing", v as AnimationConfig["easing"])}
            options={EASING_OPTIONS}
          />

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={config.triggerOnView}
              onChange={(e) => set("triggerOnView", e.target.checked)}
              className="rounded"
            />
            Trigger when scrolled into view
          </label>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={config.once}
              onChange={(e) => set("once", e.target.checked)}
              className="rounded"
            />
            Animate only once
          </label>
        </>
      )}
    </div>
  );
}
