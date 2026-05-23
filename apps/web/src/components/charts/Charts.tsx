import type { ChoiceCount } from "@/lib/formAnalytics";

/** Rotating palette for chart slices — dependency-free, deterministic. */
const CHART_COLORS = [
  "#6366f1", "#06b6d4", "#f59e0b", "#ef4444", "#10b981",
  "#8b5cf6", "#ec4899", "#3b82f6", "#84cc16", "#f97316",
];

/** Horizontal CSS bar chart for choice-style questions. */
export function BarChart({ data, accent }: { data: ChoiceCount[]; accent?: string }) {
  if (data.length === 0) return <p className="text-xs text-muted-foreground">No data yet.</p>;
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 truncate text-muted-foreground" title={d.label}>{d.label}</span>
          <div className="flex-1 h-6 rounded bg-muted overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{ width: `${Math.max(d.percent, d.count > 0 ? 2 : 0)}%`, backgroundColor: accent ?? CHART_COLORS[i % CHART_COLORS.length] }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{d.count} · {d.percent}%</span>
        </div>
      ))}
    </div>
  );
}

/** Inline-SVG donut chart with legend — no chart library. */
export function DonutChart({ data }: { data: ChoiceCount[] }) {
  const slices = data.filter((d) => d.count > 0);
  const total = slices.reduce((a, d) => a + d.count, 0);
  if (total === 0) return <p className="text-xs text-muted-foreground">No data yet.</p>;

  const radius = 60;
  const circ = 2 * Math.PI * radius;
  const segLen = (count: number) => (count / total) * circ;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width="150" height="150" viewBox="0 0 150 150" className="shrink-0">
        <g transform="translate(75,75) rotate(-90)">
          {slices.map((d, i) => {
            const len = segLen(d.count);
            const offset = slices.slice(0, i).reduce((sum, s) => sum + segLen(s.count), 0);
            return (
              <circle
                key={`${d.label}-${i}`}
                r={radius}
                fill="none"
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth="26"
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
              />
            );
          })}
        </g>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {slices.map((d, i) => (
          <li key={`${d.label}-${i}`} className="flex items-center gap-2">
            <span className="size-3 rounded-sm shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-muted-foreground truncate max-w-[180px]" title={d.label}>{d.label}</span>
            <span className="text-xs text-muted-foreground">— {d.count} ({d.percent}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
