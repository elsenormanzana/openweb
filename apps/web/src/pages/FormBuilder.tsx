import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft, Copy, Eye, GripVertical, Layers, Pencil, Plus, Save, Settings2, Trash2, X,
} from "lucide-react";
import {
  api, type CmsForm, type Condition, type ConditionOperator, type FormField,
  type FormFieldType, type FormLayout, type FormSection,
} from "@/lib/api";
import { FormRenderer } from "@/components/FormRenderer";

const FIELD_TYPES: FormFieldType[] = ["text", "email", "textarea", "select", "checkbox"];
const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];
const needsValue = (op: ConditionOperator) => op !== "is_empty" && op !== "is_not_empty";
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

type FormDraft = {
  name: string; slug: string; description: string;
  status: "active" | "inactive"; submitLabel: string; successMessage: string;
  layout: FormLayout; sections: FormSection[];
};
type Selection = { kind: "section" | "field"; id: string } | null;

function draftFromForm(form: CmsForm): FormDraft {
  return {
    name: form.name, slug: form.slug, description: form.description ?? "",
    status: form.status, submitLabel: form.submitLabel, successMessage: form.successMessage,
    layout: form.layout,
    sections: form.sections.length
      ? form.sections
      : [{ id: uid("s"), title: "", description: "", condition: null, fields: form.fields }],
  };
}

function newField(type: FormFieldType): FormField {
  return {
    id: uid("f"), label: `${type[0].toUpperCase()}${type.slice(1)} field`, name: uid("field"),
    type, required: false, placeholder: "",
    options: type === "select" ? ["Option 1", "Option 2"] : [],
    condition: null,
  };
}

const INPUT = "w-full rounded-lg border border-border px-2.5 py-2 text-sm bg-background";

// ── Condition editor ──────────────────────────────────────────────────────────

function ConditionEditor({
  value, onChange, fields,
}: {
  value: Condition | null | undefined;
  onChange: (c: Condition | null) => void;
  fields: { name: string; label: string; type: FormFieldType; options?: string[] }[];
}) {
  if (!value) {
    return (
      <button
        onClick={() => onChange({ match: "all", rules: [{ field: fields[0]?.name ?? "", operator: "equals", value: "" }] })}
        disabled={fields.length === 0}
        className="text-xs rounded-lg border border-dashed border-border px-2.5 py-1.5 hover:bg-muted disabled:opacity-50"
      >
        + Add display condition
      </button>
    );
  }
  const setRule = (i: number, patch: Partial<Condition["rules"][number]>) =>
    onChange({ ...value, rules: value.rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  return (
    <div className="space-y-2 rounded-lg border border-border p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Show this when</span>
        <button onClick={() => onChange(null)} className="text-xs text-destructive hover:underline">Remove</button>
      </div>
      <select
        value={value.match}
        onChange={(e) => onChange({ ...value, match: e.target.value as "all" | "any" })}
        className={INPUT}
      >
        <option value="all">all rules match</option>
        <option value="any">any rule matches</option>
      </select>
      {value.rules.map((rule, i) => {
        const refField = fields.find((f) => f.name === rule.field);
        return (
          <div key={i} className="space-y-1.5 rounded-md bg-muted/40 p-2">
            <select value={rule.field} onChange={(e) => setRule(i, { field: e.target.value })} className={INPUT}>
              {fields.map((f) => <option key={f.name} value={f.name}>{f.label || f.name}</option>)}
            </select>
            <div className="flex gap-1.5">
              <select
                value={rule.operator}
                onChange={(e) => setRule(i, { operator: e.target.value as ConditionOperator })}
                className={INPUT}
              >
                {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button
                onClick={() => onChange({ ...value, rules: value.rules.filter((_, idx) => idx !== i) })}
                className="rounded-lg border border-border px-2 hover:bg-muted"
                aria-label="Remove rule"
              >
                <X className="size-3.5" />
              </button>
            </div>
            {needsValue(rule.operator) && (
              refField?.type === "select" ? (
                <select value={rule.value ?? ""} onChange={(e) => setRule(i, { value: e.target.value })} className={INPUT}>
                  <option value="">—</option>
                  {(refField.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : refField?.type === "checkbox" ? (
                <select value={rule.value ?? ""} onChange={(e) => setRule(i, { value: e.target.value })} className={INPUT}>
                  <option value="true">checked</option>
                  <option value="false">unchecked</option>
                </select>
              ) : (
                <input
                  value={rule.value ?? ""} onChange={(e) => setRule(i, { value: e.target.value })}
                  placeholder="Value" className={INPUT}
                />
              )
            )}
          </div>
        );
      })}
      <button
        onClick={() => onChange({ ...value, rules: [...value.rules, { field: fields[0]?.name ?? "", operator: "equals", value: "" }] })}
        className="text-xs rounded-lg border border-dashed border-border px-2.5 py-1 hover:bg-muted"
      >
        + Add rule
      </button>
    </div>
  );
}

// ── Sortable field row ────────────────────────────────────────────────────────

function FieldRow({
  field, sectionId, selected, onSelect, onRemove,
}: {
  field: FormField; sectionId: string; selected: boolean;
  onSelect: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id, data: { type: "field", sectionId },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onSelect}
      className={`group flex items-center gap-2 rounded-lg border px-2 py-2 cursor-pointer ${isDragging ? "opacity-40" : ""} ${selected ? "border-foreground bg-muted/50" : "border-border bg-background hover:bg-muted/30"}`}
    >
      <button
        {...listeners} {...attributes}
        className="cursor-grab active:cursor-grabbing text-muted-foreground"
        aria-label="Drag field"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="text-sm truncate flex-1">{field.label || field.name}</span>
      {field.condition && <Eye className="size-3.5 text-muted-foreground" aria-label="Has condition" />}
      <span className="text-[10px] uppercase text-muted-foreground">{field.type}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
        aria-label="Remove field"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

// ── Sortable section card ─────────────────────────────────────────────────────

function SectionCard({
  section, selected, selectedFieldId, onSelectSection, onSelectField, onRemoveField, onRemoveSection,
}: {
  section: FormSection; selected: boolean; selectedFieldId: string | null;
  onSelectSection: () => void; onSelectField: (id: string) => void;
  onRemoveField: (id: string) => void; onRemoveSection: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id, data: { type: "section" },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border bg-background ${isDragging ? "opacity-40" : ""} ${selected ? "border-foreground" : "border-border"}`}
    >
      <div
        onClick={onSelectSection}
        className="flex items-center gap-2 px-3 py-2 border-b border-border/60 cursor-pointer"
      >
        <button
          {...listeners} {...attributes}
          className="cursor-grab active:cursor-grabbing text-muted-foreground"
          aria-label="Drag section"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-4" />
        </button>
        <Layers className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate flex-1">{section.title || "Untitled section"}</span>
        {section.condition && <Eye className="size-3.5 text-muted-foreground" aria-label="Has condition" />}
        <button onClick={(e) => { e.stopPropagation(); onRemoveSection(); }} className="text-muted-foreground hover:text-destructive" aria-label="Remove section">
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <div className="p-2 space-y-1.5">
        <SortableContext items={section.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          {section.fields.map((field) => (
            <FieldRow
              key={field.id} field={field} sectionId={section.id}
              selected={selectedFieldId === field.id}
              onSelect={() => onSelectField(field.id)}
              onRemove={() => onRemoveField(field.id)}
            />
          ))}
        </SortableContext>
        {section.fields.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-lg">
            Drop or add fields here
          </p>
        )}
      </div>
    </div>
  );
}

// ── Builder ───────────────────────────────────────────────────────────────────

export function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<FormDraft | null>(null);
  const [selected, setSelected] = useState<Selection>(null);
  const [preview, setPreview] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!id) return;
    api.forms.get(Number(id))
      .then((form) => setDraft(draftFromForm(form)))
      .catch((e) => setError((e as Error).message || "Form not found"));
  }, [id]);

  const sections = draft?.sections ?? [];
  const allFields = useMemo(() => sections.flatMap((s) => s.fields), [sections]);

  const selectedSection = selected?.kind === "section" ? sections.find((s) => s.id === selected.id) ?? null : null;
  const selectedField = selected?.kind === "field"
    ? allFields.find((f) => f.id === selected.id) ?? null : null;
  const selectedFieldSectionId = selectedField
    ? sections.find((s) => s.fields.some((f) => f.id === selectedField.id))?.id ?? null : null;

  function setSections(next: FormSection[]) {
    setDraft((d) => (d ? { ...d, sections: next } : d));
  }
  function patchSection(sectionId: string, patch: Partial<FormSection>) {
    setSections(sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));
  }
  function patchField(sectionId: string, fieldId: string, patch: Partial<FormField>) {
    setSections(sections.map((s) => (s.id !== sectionId ? s : {
      ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
    })));
  }
  function addSection() {
    const section: FormSection = { id: uid("s"), title: "New section", description: "", condition: null, fields: [] };
    setSections([...sections, section]);
    setSelected({ kind: "section", id: section.id });
  }
  function addField(type: FormFieldType) {
    let target = selected?.kind === "section" ? selected.id
      : selected?.kind === "field" ? selectedFieldSectionId
      : sections[sections.length - 1]?.id;
    let next = sections;
    if (!target) {
      const section: FormSection = { id: uid("s"), title: "", description: "", condition: null, fields: [] };
      next = [...sections, section];
      target = section.id;
    }
    const field = newField(type);
    setSections(next.map((s) => (s.id === target ? { ...s, fields: [...s.fields, field] } : s)));
    setSelected({ kind: "field", id: field.id });
  }
  function removeSection(sectionId: string) {
    setSections(sections.filter((s) => s.id !== sectionId));
    setSelected(null);
  }
  function removeField(sectionId: string, fieldId: string) {
    setSections(sections.map((s) => (s.id !== sectionId ? s : { ...s, fields: s.fields.filter((f) => f.id !== fieldId) })));
    setSelected(null);
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveDrag(String(e.active.id));
  }
  function handleDragEnd(e: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeType = active.data.current?.type;
    if (activeType === "section") {
      const oldIdx = sections.findIndex((s) => s.id === active.id);
      const newIdx = sections.findIndex((s) => s.id === over.id);
      if (oldIdx >= 0 && newIdx >= 0) setSections(arrayMove(sections, oldIdx, newIdx));
      return;
    }
    if (activeType === "field") {
      const fromSec = active.data.current?.sectionId as string;
      const overType = over.data.current?.type;
      const toSec = overType === "field" ? (over.data.current?.sectionId as string) : String(over.id);
      if (!fromSec || !toSec) return;
      const next = sections.map((s) => ({ ...s, fields: [...s.fields] }));
      const from = next.find((s) => s.id === fromSec);
      const to = next.find((s) => s.id === toSec);
      if (!from || !to) return;
      if (from === to) {
        const oldIdx = from.fields.findIndex((f) => f.id === active.id);
        const newIdx = overType === "field"
          ? from.fields.findIndex((f) => f.id === over.id) : from.fields.length - 1;
        if (oldIdx >= 0 && newIdx >= 0) from.fields = arrayMove(from.fields, oldIdx, newIdx);
      } else {
        const idx = from.fields.findIndex((f) => f.id === active.id);
        if (idx < 0) return;
        const [moved] = from.fields.splice(idx, 1);
        const insertAt = overType === "field"
          ? Math.max(0, to.fields.findIndex((f) => f.id === over.id)) : to.fields.length;
        to.fields.splice(insertAt, 0, moved);
      }
      setSections(next);
    }
  }

  async function save() {
    if (!draft || !id) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.forms.update(Number(id), {
        name: draft.name, slug: draft.slug, description: draft.description, status: draft.status,
        submitLabel: draft.submitLabel, successMessage: draft.successMessage,
        layout: draft.layout, sections: draft.sections,
      });
      setDraft(draftFromForm(updated));
    } catch (e) {
      setError((e as Error).message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{error || "Loading form…"}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Toolbar */}
      <div className="h-14 shrink-0 flex items-center gap-2 px-3 border-b border-border">
        <button onClick={() => navigate("/admin/forms")} className="rounded-lg p-2 hover:bg-muted" aria-label="Back to forms">
          <ArrowLeft className="size-4" />
        </button>
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="font-semibold bg-transparent px-1 py-1 rounded outline-none focus:bg-muted/60 min-w-0"
          placeholder="Form name"
        />
        <div className="ml-auto flex items-center gap-1.5">
          {error && <span className="text-xs text-destructive mr-1">{error}</span>}
          <button
            onClick={() => setPreview((p) => !p)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm ${preview ? "bg-foreground text-background" : "border border-border hover:bg-muted"}`}
          >
            {preview ? <Pencil className="size-4" /> : <Eye className="size-4" />}
            {preview ? "Edit" : "Preview"}
          </button>
          <button onClick={() => setSettingsOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted">
            <Settings2 className="size-4" /> Settings
          </button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-3 py-1.5 text-sm font-medium disabled:opacity-60">
            <Save className="size-4" /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {preview ? (
          <div className="flex-1 overflow-y-auto bg-muted/20 p-8">
            <div className="max-w-xl mx-auto rounded-2xl border border-border bg-background p-6">
              <FormRenderer
                sections={draft.sections} layout={draft.layout}
                submitLabel={draft.submitLabel} successMessage={draft.successMessage}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Palette */}
            <div className="w-52 shrink-0 border-r border-border p-3 space-y-3 overflow-y-auto">
              <button onClick={addSection} className="w-full inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-sm hover:bg-muted">
                <Plus className="size-4" /> Add section
              </button>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Fields</p>
                <div className="space-y-1">
                  {FIELD_TYPES.map((type) => (
                    <button
                      key={type} onClick={() => addField(type)}
                      className="w-full text-left capitalize rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
                    >
                      + {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-y-auto bg-muted/20 p-6">
              {sections.length === 0 ? (
                <div className="max-w-md mx-auto text-center rounded-2xl border-2 border-dashed border-border py-16">
                  <p className="text-sm text-muted-foreground">Add a section to start building.</p>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-3">
                  <DndContext
                    sensors={sensors} collisionDetection={closestCorners}
                    onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      {sections.map((section) => (
                        <SectionCard
                          key={section.id} section={section}
                          selected={selected?.kind === "section" && selected.id === section.id}
                          selectedFieldId={selected?.kind === "field" ? selected.id : null}
                          onSelectSection={() => setSelected({ kind: "section", id: section.id })}
                          onSelectField={(fid) => setSelected({ kind: "field", id: fid })}
                          onRemoveField={(fid) => removeField(section.id, fid)}
                          onRemoveSection={() => removeSection(section.id)}
                        />
                      ))}
                    </SortableContext>
                    <DragOverlay>
                      {activeDrag ? (
                        <div className="rounded-lg border border-foreground bg-background px-3 py-2 text-sm shadow-lg">
                          {allFields.find((f) => f.id === activeDrag)?.label
                            ?? sections.find((s) => s.id === activeDrag)?.title
                            ?? "Item"}
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </div>
              )}
            </div>

            {/* Properties */}
            <div className="w-72 shrink-0 border-l border-border overflow-y-auto">
              {selectedField && selectedFieldSectionId ? (
                <FieldProperties
                  field={selectedField}
                  conditionFields={allFields.filter((f) => f.id !== selectedField.id)}
                  onChange={(patch) => patchField(selectedFieldSectionId, selectedField.id, patch)}
                />
              ) : selectedSection ? (
                <SectionProperties
                  section={selectedSection} conditionFields={allFields}
                  onChange={(patch) => patchSection(selectedSection.id, patch)}
                />
              ) : (
                <p className="p-4 text-sm text-muted-foreground">Select a section or field to edit it.</p>
              )}
            </div>
          </>
        )}
      </div>

      {settingsOpen && (
        <SettingsDrawer draft={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}

// ── Properties panels ─────────────────────────────────────────────────────────

function FieldProperties({
  field, conditionFields, onChange,
}: {
  field: FormField;
  conditionFields: { name: string; label: string; type: FormFieldType; options?: string[] }[];
  onChange: (patch: Partial<FormField>) => void;
}) {
  return (
    <div className="p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Field</p>
      <label className="block space-y-1 text-xs text-muted-foreground">
        Label
        <input className={INPUT} value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
      </label>
      <label className="block space-y-1 text-xs text-muted-foreground">
        Name (used in submissions &amp; conditions)
        <input className={INPUT} value={field.name} onChange={(e) => onChange({ name: e.target.value })} />
      </label>
      <label className="block space-y-1 text-xs text-muted-foreground">
        Type
        <select
          className={INPUT} value={field.type}
          onChange={(e) => {
            const type = e.target.value as FormFieldType;
            onChange({ type, options: type === "select" ? (field.options?.length ? field.options : ["Option 1", "Option 2"]) : [] });
          }}
        >
          {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      {field.type !== "checkbox" && (
        <label className="block space-y-1 text-xs text-muted-foreground">
          Placeholder
          <input className={INPUT} value={field.placeholder ?? ""} onChange={(e) => onChange({ placeholder: e.target.value })} />
        </label>
      )}
      {field.type === "select" && (
        <label className="block space-y-1 text-xs text-muted-foreground">
          Options (comma-separated)
          <input
            className={INPUT} value={(field.options ?? []).join(", ")}
            onChange={(e) => onChange({ options: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })}
          />
        </label>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={field.required ?? false} onChange={(e) => onChange({ required: e.target.checked })} />
        Required
      </label>
      <div className="pt-1">
        <ConditionEditor value={field.condition} onChange={(c) => onChange({ condition: c })} fields={conditionFields} />
      </div>
    </div>
  );
}

function SectionProperties({
  section, conditionFields, onChange,
}: {
  section: FormSection;
  conditionFields: { name: string; label: string; type: FormFieldType; options?: string[] }[];
  onChange: (patch: Partial<FormSection>) => void;
}) {
  return (
    <div className="p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Section</p>
      <label className="block space-y-1 text-xs text-muted-foreground">
        Title
        <input className={INPUT} value={section.title} onChange={(e) => onChange({ title: e.target.value })} />
      </label>
      <label className="block space-y-1 text-xs text-muted-foreground">
        Description
        <textarea className={INPUT} rows={2} value={section.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} />
      </label>
      <div className="pt-1">
        <ConditionEditor value={section.condition} onChange={(c) => onChange({ condition: c })} fields={conditionFields} />
      </div>
    </div>
  );
}

// ── Settings drawer ───────────────────────────────────────────────────────────

function SettingsDrawer({
  draft, onChange, onClose,
}: {
  draft: FormDraft; onChange: (patch: Partial<FormDraft>) => void; onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/forms/${draft.slug}`;
  return (
    <div className="absolute inset-0 z-10 flex justify-end">
      <button className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Close settings" />
      <div className="relative w-80 max-w-full bg-background border-l border-border h-full overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Form settings</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted"><X className="size-4" /></button>
        </div>
        <label className="block space-y-1 text-xs text-muted-foreground">
          Slug
          <input className={INPUT} value={draft.slug} onChange={(e) => onChange({ slug: e.target.value })} />
        </label>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Public URL</span>
          <div className="flex gap-1.5">
            <input className={`${INPUT} text-muted-foreground`} value={publicUrl} readOnly />
            <button
              onClick={() => { navigator.clipboard?.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="rounded-lg border border-border px-2 hover:bg-muted shrink-0"
              aria-label="Copy URL"
            >
              <Copy className="size-3.5" />
            </button>
          </div>
          {copied && <span className="text-[11px] text-emerald-600">Copied — save the form first if you changed the slug.</span>}
        </div>
        <label className="block space-y-1 text-xs text-muted-foreground">
          Description
          <textarea className={INPUT} rows={2} value={draft.description} onChange={(e) => onChange({ description: e.target.value })} />
        </label>
        <label className="block space-y-1 text-xs text-muted-foreground">
          Status
          <select className={INPUT} value={draft.status} onChange={(e) => onChange({ status: e.target.value as "active" | "inactive" })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Layout</span>
          {(["single", "steps"] as FormLayout[]).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input type="radio" name="layout" checked={draft.layout === opt} onChange={() => onChange({ layout: opt })} />
              {opt === "single" ? "Single page" : "Multi-step wizard"}
            </label>
          ))}
        </div>
        <label className="block space-y-1 text-xs text-muted-foreground">
          Submit button label
          <input className={INPUT} value={draft.submitLabel} onChange={(e) => onChange({ submitLabel: e.target.value })} />
        </label>
        <label className="block space-y-1 text-xs text-muted-foreground">
          Success message
          <input className={INPUT} value={draft.successMessage} onChange={(e) => onChange({ successMessage: e.target.value })} />
        </label>
      </div>
    </div>
  );
}
