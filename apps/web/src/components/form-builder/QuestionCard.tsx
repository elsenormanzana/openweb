import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Eye, GitBranch, GripVertical, ShieldCheck, Trash2 } from "lucide-react";
import type { FormField, FormFieldType, FormLayout, FormSection } from "@/lib/api";
import { QUESTION_TYPES, QUESTION_TYPE_LIST, retypeField } from "@/lib/formFields";
import { Toggle } from "@/components/form-builder/ui";
import {
  BranchingEditor, ConditionEditor, FileSettingsEditor, GridEditor, OptionsEditor,
  QuizFieldEditor, RatingEditor, ScaleEditor, ValidationEditor, type ConditionRefField,
} from "@/components/form-builder/editors";
import { QuestionInput } from "@/components/form-fields/QuestionInput";

type QuestionCardProps = {
  field: FormField;
  index: number;
  sections: FormSection[];
  currentSectionId: string;
  conditionFields: ConditionRefField[];
  expanded: boolean;
  isQuiz: boolean;
  layout: FormLayout;
  onSelect: () => void;
  onChange: (patch: Partial<FormField>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

const TYPE_GROUPS = ["Text", "Choice", "Scale", "Advanced"] as const;

export function QuestionCard(props: QuestionCardProps) {
  const {
    field, index, sections, currentSectionId, conditionFields, expanded,
    isQuiz, layout, onSelect, onChange, onDuplicate, onRemove,
  } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const def = QUESTION_TYPES[field.type] ?? QUESTION_TYPES.text;
  const caps = def.caps;
  const Icon = def.icon;

  const [showValidation, setShowValidation] = useState(Boolean(field.validation));
  const [showBranching, setShowBranching] = useState(Boolean(field.optionRouting));
  const [showCondition, setShowCondition] = useState(Boolean(field.condition));

  const style = { transform: CSS.Transform.toString(transform), transition };

  if (!expanded) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        onClick={onSelect}
        className={`group flex items-center gap-3 rounded-xl border bg-background px-4 py-3 cursor-pointer transition-colors
          ${isDragging ? "opacity-40" : ""} border-border hover:border-foreground/30`}
      >
        <button
          {...listeners} {...attributes}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/50"
          aria-label="Drag question"
        >
          <GripVertical className="size-4" />
        </button>
        <Icon className="size-4 text-muted-foreground shrink-0" />
        <span className="text-sm flex-1 truncate">{field.label || "Untitled question"}</span>
        {field.required && <span className="text-red-500 text-sm">*</span>}
        {isQuiz && (field.points ?? 0) > 0 && (
          <span className="text-[11px] text-muted-foreground">{field.points} pt</span>
        )}
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{def.label}</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border-2 border-foreground/20 bg-background shadow-sm ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-center gap-1 border-b border-border/60 px-3 py-1.5">
        <button
          {...listeners} {...attributes}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/50"
          aria-label="Drag question"
        >
          <GripVertical className="size-4" />
        </button>
        <span className="text-xs text-muted-foreground">Question {index + 1}</span>
        <select
          className="ml-auto rounded-lg border border-border bg-background px-2 py-1 text-xs"
          value={field.type}
          onChange={(e) => onChange(retypeField(field, e.target.value as FormFieldType))}
        >
          {TYPE_GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {QUESTION_TYPE_LIST.filter((t) => t.group === group).map((t) => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="p-4 space-y-3">
        <input
          className="w-full border-0 border-b border-border bg-transparent pb-1.5 text-sm font-medium focus:outline-none focus:border-foreground"
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Question"
        />
        <input
          className="w-full border-0 bg-transparent text-xs text-muted-foreground focus:outline-none"
          value={field.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Description (optional)"
        />

        {/* Type-specific editor */}
        {caps.hasOptions && <OptionsEditor field={field} onChange={onChange} />}
        {field.type === "linear_scale" && <ScaleEditor field={field} onChange={onChange} />}
        {field.type === "rating" && <RatingEditor field={field} onChange={onChange} />}
        {caps.hasGrid && <GridEditor field={field} onChange={onChange} />}
        {field.type === "file" && <FileSettingsEditor field={field} onChange={onChange} />}
        {(field.type === "checkbox" || (!caps.hasOptions && !caps.hasGrid
          && field.type !== "linear_scale" && field.type !== "rating" && field.type !== "file")) && (
          <div className="rounded-lg border border-dashed border-border p-2.5 opacity-70 pointer-events-none">
            <QuestionInput field={field} value={field.type === "checkbox" ? false : ""} onChange={() => {}} accent="#9ca3af" disabled />
          </div>
        )}

        {/* Quiz answer key */}
        {isQuiz && caps.quizGradable && <QuizFieldEditor field={field} onChange={onChange} />}

        {/* Optional panels */}
        {showValidation && caps.canValidate && <ValidationEditor field={field} onChange={onChange} />}
        {showBranching && caps.canBranch && layout === "steps" && (
          <BranchingEditor field={field} sections={sections} currentSectionId={currentSectionId} onChange={onChange} />
        )}
        {showCondition && (
          <ConditionEditor
            value={field.condition}
            onChange={(c) => onChange({ condition: c })}
            fields={conditionFields}
          />
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-border/60 px-3 py-2">
        <Toggle checked={field.required ?? false} onChange={(v) => onChange({ required: v })} label="Required" />
        <div className="ml-auto flex items-center gap-0.5">
          {caps.canValidate && (
            <ToolButton active={showValidation} onClick={() => setShowValidation((s) => !s)} title="Validation">
              <ShieldCheck className="size-4" />
            </ToolButton>
          )}
          {caps.canBranch && layout === "steps" && (
            <ToolButton active={showBranching} onClick={() => setShowBranching((s) => !s)} title="Branching">
              <GitBranch className="size-4" />
            </ToolButton>
          )}
          <ToolButton active={showCondition} onClick={() => setShowCondition((s) => !s)} title="Show/hide logic">
            <Eye className="size-4" />
          </ToolButton>
          <ToolButton onClick={onDuplicate} title="Duplicate">
            <Copy className="size-4" />
          </ToolButton>
          <ToolButton onClick={onRemove} title="Delete" danger>
            <Trash2 className="size-4" />
          </ToolButton>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  children, onClick, title, active, danger,
}: {
  children: React.ReactNode; onClick: () => void; title: string; active?: boolean; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`rounded-lg p-1.5 transition-colors
        ${active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}
        ${danger ? "hover:text-destructive" : ""}`}
    >
      {children}
    </button>
  );
}
