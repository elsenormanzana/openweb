import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded-lg border border-border px-2.5 py-2 text-sm bg-background " +
  "focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors";

/** Label + control + optional hint, vertically stacked. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

/** Compact pill switch bound to a boolean. */
export function Toggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-sm"
    >
      <span
        className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${checked ? "bg-foreground" : "bg-muted-foreground/30"}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-background transition-all ${checked ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
      <span className="text-foreground">{label}</span>
    </button>
  );
}
