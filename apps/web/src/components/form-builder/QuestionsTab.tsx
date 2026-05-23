import { useState } from "react";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Layers, Plus, Trash2 } from "lucide-react";
import type { FormField, FormFieldType, FormLayout, FormSection, FormTheme } from "@/lib/api";
import { emptyField, QUESTION_TYPE_LIST, uid } from "@/lib/formFields";
import { QuestionCard } from "@/components/form-builder/QuestionCard";
import { SectionRoutingEditor, type ConditionRefField } from "@/components/form-builder/editors";

type QuestionsTabProps = {
  name: string;
  description: string;
  theme: FormTheme;
  layout: FormLayout;
  isQuiz: boolean;
  sections: FormSection[];
  onName: (v: string) => void;
  onDescription: (v: string) => void;
  onSections: (next: FormSection[]) => void;
};

const TYPE_GROUPS = ["Text", "Choice", "Scale", "Advanced"] as const;

export function QuestionsTab(props: QuestionsTabProps) {
  const { name, description, theme, layout, isQuiz, sections, onName, onDescription, onSections } = props;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const allRefFields: ConditionRefField[] = sections
    .flatMap((s) => s.fields)
    .map((f) => ({ name: f.name, label: f.label, type: f.type, options: f.options }));

  const patchSection = (id: string, patch: Partial<FormSection>) =>
    onSections(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const setFields = (sectionId: string, fields: FormField[]) =>
    onSections(sections.map((s) => (s.id === sectionId ? { ...s, fields } : s)));

  function addField(sectionId: string, type: FormFieldType) {
    const field = emptyField(type);
    const section = sections.find((s) => s.id === sectionId);
    if (section) setFields(sectionId, [...section.fields, field]);
    setExpandedId(field.id);
  }
  function duplicateField(sectionId: string, field: FormField) {
    const copy: FormField = { ...field, id: uid("f"), name: uid("field"), optionRouting: undefined };
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const idx = section.fields.findIndex((f) => f.id === field.id);
    const next = [...section.fields];
    next.splice(idx + 1, 0, copy);
    setFields(sectionId, next);
    setExpandedId(copy.id);
  }
  function removeField(sectionId: string, fieldId: string) {
    const section = sections.find((s) => s.id === sectionId);
    if (section) setFields(sectionId, section.fields.filter((f) => f.id !== fieldId));
  }
  function patchField(sectionId: string, fieldId: string, patch: Partial<FormField>) {
    const section = sections.find((s) => s.id === sectionId);
    if (section) setFields(sectionId, section.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)));
  }
  function handleDragEnd(sectionId: string, e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const from = section.fields.findIndex((f) => f.id === active.id);
    const to = section.fields.findIndex((f) => f.id === over.id);
    if (from >= 0 && to >= 0) setFields(sectionId, arrayMove(section.fields, from, to));
  }
  function addSection() {
    onSections([...sections, {
      id: uid("s"), title: `Section ${sections.length + 1}`, description: "", condition: null, afterSection: null, fields: [],
    }]);
  }
  function removeSection(id: string) {
    onSections(sections.filter((s) => s.id !== id));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Form header */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        {theme.headerImage && <img src={theme.headerImage} alt="" className="w-full max-h-36 object-cover" />}
        <div className="p-5 space-y-2">
          <input
            className="w-full border-0 border-b border-border bg-transparent pb-1.5 text-2xl font-semibold tracking-tight focus:outline-none focus:border-foreground"
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="Form title"
          />
          <div className="h-1 w-10 rounded-full" style={{ backgroundColor: theme.themeColor }} />
          <input
            className="w-full border-0 bg-transparent text-sm text-muted-foreground focus:outline-none"
            value={description}
            onChange={(e) => onDescription(e.target.value)}
            placeholder="Form description"
          />
        </div>
      </div>

      {sections.map((section, si) => (
        <div key={section.id} className="space-y-3">
          {sections.length > 1 && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Section {si + 1} of {sections.length}</span>
                <button
                  type="button"
                  onClick={() => removeSection(section.id)}
                  className="ml-auto rounded-lg p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remove section"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <input
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-medium"
                value={section.title}
                onChange={(e) => patchSection(section.id, { title: e.target.value })}
                placeholder="Section title"
              />
              <input
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
                value={section.description ?? ""}
                onChange={(e) => patchSection(section.id, { description: e.target.value })}
                placeholder="Section description"
              />
              {layout === "steps" && (
                <SectionRoutingEditor section={section} sections={sections} onChange={(p) => patchSection(section.id, p)} />
              )}
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(section.id, e)}>
            <SortableContext items={section.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {section.fields.map((field, fi) => (
                  <QuestionCard
                    key={field.id}
                    field={field}
                    index={fi}
                    sections={sections}
                    currentSectionId={section.id}
                    conditionFields={allRefFields.filter((f) => f.name !== field.name)}
                    expanded={expandedId === field.id}
                    isQuiz={isQuiz}
                    layout={layout}
                    onSelect={() => setExpandedId(field.id)}
                    onChange={(patch) => patchField(section.id, field.id, patch)}
                    onDuplicate={() => duplicateField(section.id, field)}
                    onRemove={() => removeField(section.id, field.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {section.fields.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4 border border-dashed border-border rounded-xl">
              No questions yet — add one below.
            </p>
          )}

          <AddQuestionMenu onAdd={(type) => addField(section.id, type)} />
        </div>
      ))}

      <button
        type="button"
        onClick={addSection}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Layers className="size-4" /> Add section
      </button>
    </div>
  );
}

function AddQuestionMenu({ onAdd }: { onAdd: (type: FormFieldType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm hover:bg-muted transition-colors"
      >
        <Plus className="size-4" /> Add question
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-10 cursor-default" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-background p-2 shadow-lg max-h-80 overflow-y-auto">
            {TYPE_GROUPS.map((group) => (
              <div key={group} className="mb-1.5 last:mb-0">
                <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">{group}</p>
                {QUESTION_TYPE_LIST.filter((t) => t.group === group).map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => { onAdd(t.type); setOpen(false); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted text-left"
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
