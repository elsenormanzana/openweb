import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, Inbox } from "lucide-react";
import { api, type CmsForm, type FormResponse } from "@/lib/api";
import {
  aggregateResponses, exportResponsesCsv, formatAnswer, quizAverage, type QuestionSummary,
} from "@/lib/formAnalytics";
import { BarChart, DonutChart } from "@/components/charts/Charts";

const DONUT_TYPES = new Set(["multiple_choice", "dropdown", "select", "checkbox"]);

export function ResponsesTab({ form }: { form: CmsForm }) {
  const [responses, setResponses] = useState<FormResponse[] | null>(null);
  const [view, setView] = useState<"summary" | "individual">("summary");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.forms.responses.listByFormId(form.id)
      .then(setResponses)
      .catch((e) => { setResponses([]); setError((e as Error).message || "Failed to load responses"); });
  }, [form.id]);

  const summaries = useMemo(
    () => (responses ? aggregateResponses(form, responses) : []),
    [form, responses],
  );
  const avg = useMemo(() => (responses ? quizAverage(responses) : null), [responses]);

  if (responses === null) {
    return <p className="text-sm text-muted-foreground text-center py-12">Loading responses…</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-lg font-semibold">{responses.length} response{responses.length === 1 ? "" : "s"}</p>
          {avg != null && <p className="text-xs text-muted-foreground">Average score: {avg}%</p>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            {(["summary", "individual"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-xs capitalize ${view === v ? "bg-foreground text-background" : "text-muted-foreground"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => exportResponsesCsv(form, responses)}
            disabled={responses.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
          >
            <Download className="size-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {responses.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <Inbox className="size-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mt-2">No responses yet.</p>
        </div>
      ) : view === "summary" ? (
        <div className="space-y-3">
          {summaries.map((s) => <SummaryCard key={s.field.id} summary={s} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {responses.map((r, i) => <ResponseRow key={r.id} response={r} form={form} index={responses.length - i} />)}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ summary }: { summary: QuestionSummary }) {
  const { field } = summary;
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-5 space-y-3">
      <div>
        <p className="text-sm font-medium">{field.label || field.name}</p>
        <p className="text-xs text-muted-foreground">{summary.answered} response{summary.answered === 1 ? "" : "s"}</p>
      </div>

      {summary.kind === "choice" && summary.choices && (
        DONUT_TYPES.has(field.type)
          ? <DonutChart data={summary.choices} />
          : <BarChart data={summary.choices} />
      )}

      {summary.kind === "grid" && summary.gridRows && (
        <div className="space-y-3">
          {summary.gridRows.map((g) => (
            <div key={g.row}>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">{g.row}</p>
              <BarChart data={g.choices} />
            </div>
          ))}
        </div>
      )}

      {summary.kind === "scalar" && (
        <div className="space-y-2">
          {summary.numberStats && (
            <p className="text-xs text-muted-foreground">
              Min {summary.numberStats.min} · Max {summary.numberStats.max} · Avg {summary.numberStats.avg.toFixed(1)}
            </p>
          )}
          <AnswerList values={summary.values ?? []} />
        </div>
      )}

      {(summary.kind === "text" || summary.kind === "file") && (
        <AnswerList values={summary.values ?? []} />
      )}
    </div>
  );
}

function AnswerList({ values }: { values: string[] }) {
  if (values.length === 0) return <p className="text-xs text-muted-foreground">No answers yet.</p>;
  return (
    <div className="max-h-48 overflow-y-auto space-y-1">
      {values.map((v, i) => (
        <p key={i} className="text-sm rounded-lg bg-muted/50 px-2.5 py-1.5 truncate" title={v}>{v || "—"}</p>
      ))}
    </div>
  );
}

function ResponseRow({ response, form, index }: { response: FormResponse; form: CmsForm; index: number }) {
  const [open, setOpen] = useState(false);
  const fields = form.sections.flatMap((s) => s.fields);
  return (
    <div className="rounded-xl border border-border/60 bg-background">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
      >
        <span className="text-xs font-medium text-muted-foreground">#{index}</span>
        <span className="text-sm flex-1 truncate">
          {response.name || response.email || new Date(response.createdAt).toLocaleString()}
        </span>
        {response.score && (
          <span className="text-xs text-muted-foreground">{response.score.earned}/{response.score.total}</span>
        )}
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border/60 px-4 py-3 space-y-2">
          <p className="text-[11px] text-muted-foreground">{new Date(response.createdAt).toLocaleString()}</p>
          {fields.map((f) => {
            const val = formatAnswer(response.values[f.name]);
            return (
              <div key={f.id} className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground truncate col-span-1">{f.label || f.name}</span>
                <span className="col-span-2 break-words">{val || "—"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
