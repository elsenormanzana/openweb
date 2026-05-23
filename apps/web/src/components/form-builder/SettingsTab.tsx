import { useState } from "react";
import { Copy } from "lucide-react";
import type { FormLayout, FormSettings } from "@/lib/api";
import { Field, inputCls, Toggle } from "@/components/form-builder/ui";

type SettingsFields = {
  slug: string;
  status: "active" | "inactive";
  layout: FormLayout;
  submitLabel: string;
  successMessage: string;
};

type SettingsTabProps = SettingsFields & {
  settings: FormSettings;
  onField: (patch: Partial<SettingsFields>) => void;
  onSettings: (patch: Partial<FormSettings>) => void;
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-5 space-y-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

export function SettingsTab(props: SettingsTabProps) {
  const { slug, status, layout, submitLabel, successMessage, settings, onField, onSettings } = props;
  const [copied, setCopied] = useState(false);
  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/forms/${slug}`;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card title="Sharing">
        <Field label="URL slug">
          <input className={inputCls} value={slug} onChange={(e) => onField({ slug: e.target.value })} />
        </Field>
        <Field label="Public URL" hint="Save the form after changing the slug.">
          <div className="flex gap-1.5">
            <input className={`${inputCls} text-muted-foreground`} value={publicUrl} readOnly />
            <button
              type="button"
              onClick={() => { navigator.clipboard?.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="rounded-lg border border-border px-2.5 hover:bg-muted shrink-0"
              aria-label="Copy URL"
            >
              <Copy className="size-3.5" />
            </button>
          </div>
        </Field>
        {copied && <p className="text-[11px] text-emerald-600">Copied to clipboard.</p>}
      </Card>

      <Card title="Status & layout">
        <Field label="Status">
          <select
            className={inputCls}
            value={status}
            onChange={(e) => onField({ status: e.target.value as "active" | "inactive" })}
          >
            <option value="active">Active (published)</option>
            <option value="inactive">Inactive (hidden)</option>
          </select>
        </Field>
        <Field label="Layout">
          <select
            className={inputCls}
            value={layout}
            onChange={(e) => onField({ layout: e.target.value as FormLayout })}
          >
            <option value="single">Single page</option>
            <option value="steps">Multi-step (enables branching)</option>
          </select>
        </Field>
        <Toggle
          checked={settings.showProgressBar}
          onChange={(v) => onSettings({ showProgressBar: v })}
          label="Show progress bar on multi-step forms"
        />
      </Card>

      <Card title="Responses">
        <Toggle
          checked={settings.acceptingResponses}
          onChange={(v) => onSettings({ acceptingResponses: v })}
          label="Accepting responses"
        />
        {!settings.acceptingResponses && (
          <Field label="Closed message">
            <input
              className={inputCls}
              value={settings.closedMessage}
              onChange={(e) => onSettings({ closedMessage: e.target.value })}
            />
          </Field>
        )}
        <Field label="Response limit" hint="0 = unlimited">
          <input
            type="number" min={0}
            className={inputCls}
            value={settings.responseLimit}
            onChange={(e) => onSettings({ responseLimit: Math.max(0, Number(e.target.value) || 0) })}
          />
        </Field>
        <Toggle
          checked={settings.collectEmail}
          onChange={(v) => onSettings({ collectEmail: v })}
          label="Collect respondent email"
        />
      </Card>

      <Card title="Quiz">
        <Toggle checked={settings.isQuiz} onChange={(v) => onSettings({ isQuiz: v })} label="Make this a quiz" />
        {settings.isQuiz && (
          <Toggle
            checked={settings.showScoreImmediately}
            onChange={(v) => onSettings({ showScoreImmediately: v })}
            label="Show score immediately after submitting"
          />
        )}
      </Card>

      <Card title="Submission">
        <Field label="Submit button label">
          <input className={inputCls} value={submitLabel} onChange={(e) => onField({ submitLabel: e.target.value })} />
        </Field>
        <Field label="Confirmation message">
          <input className={inputCls} value={successMessage} onChange={(e) => onField({ successMessage: e.target.value })} />
        </Field>
      </Card>
    </div>
  );
}
