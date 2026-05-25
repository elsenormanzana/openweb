import { useState, useEffect, useRef } from "react";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Layers, Plus, Trash2, Search, ArrowLeft, ChevronRight, X, Sparkles, MousePointer2, ChevronDown, Calendar, Clock } from "lucide-react";
import type { FormField, FormFieldType, FormLayout, FormSection, FormTheme } from "@/lib/api";
import { emptyField, QUESTION_TYPE_LIST, uid } from "@/lib/formFields";
import { QuestionCard } from "@/components/form-builder/QuestionCard";
import { SectionRoutingEditor, type ConditionRefField } from "@/components/form-builder/editors";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { QuestionInput } from "@/components/form-fields/QuestionInput";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";

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
        <div className="p-5 space-y-3">
          <input
            className="w-full border-0 border-b border-border bg-transparent pb-1.5 text-2xl font-semibold tracking-tight focus:outline-none focus:border-foreground"
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="Form title"
          />
          <div className="h-1 w-10 rounded-full" style={{ backgroundColor: theme.themeColor }} />
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Form description</label>
            <RichTextEditor
              content={description}
              onChange={onDescription}
              placeholder="Form description"
            />
          </div>
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
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Section description</label>
                <RichTextEditor
                  content={section.description ?? ""}
                  onChange={(v) => patchSection(section.id, { description: v })}
                  placeholder="Section description"
                />
              </div>
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

          <AddQuestionDialog onAdd={(type) => addField(section.id, type)} themeColor={theme.themeColor} />
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

const QUESTION_DESCRIPTIONS: Record<FormFieldType, string> = {
  text: "Best for short text input (e.g. names, single-line answers). Supports input validation for custom formats.",
  textarea: "Best for longer, multi-line text input (e.g. comments, descriptions, feedback). Supports character limit controls.",
  email: "A text field with automatic email format validation. Minimizes user errors and simplifies contact collection.",
  number: "Accepts numeric values only. Useful for age, quantities, or scores. Supports setting minimum and maximum limits.",
  multiple_choice: "Responders select a single option from a list of choices. Supports custom option routing (branching logic) to redirect users based on their answer.",
  checkboxes: "Allows responders to select one or multiple choices from a list of options. Useful for multi-select checklists.",
  dropdown: "Displays a list of options in a clean select menu. Ideal for saving space or when choosing from a long list (e.g. states or countries). Supports option prefilling.",
  checkbox: "A binary checkbox field for simple confirmations, agreements, or toggle selections (e.g. 'I agree to the terms').",
  select: "Displays options in a clean dropdown menu. (Legacy format for select fields).",
  date: "Displays an interactive calendar date picker. Perfect for birthdays, booking dates, or scheduling.",
  time: "Displays an interactive clock/time picker. Perfect for appointment scheduling or tracking time slots.",
  linear_scale: "Responders rate an item on a continuous scale (e.g. 1 to 5, 1 to 10) with custom low and high labels. Great for satisfaction ratings.",
  rating: "A visual rating bar (stars or hearts). Highly interactive and ideal for reviews, service satisfaction, or feedback ratings.",
  file: "Allows responders to upload documents, images, PDFs, or spreadsheets directly. You can limit file types, sizes, and file counts.",
  grid_multiple_choice: "Renders a matrix where responders can select one column choice per row. Ideal for matching multiple items to a single rating scale.",
  grid_checkbox: "Renders a matrix where responders can select multiple column choices per row. Ideal for complex scheduling or multi-criteria availability tables."
};

function getMockField(type: FormFieldType): FormField {
  const base = emptyField(type);
  switch (type) {
    case "text":
      return { ...base, label: "Full Name", placeholder: "e.g. Jane Doe" };
    case "textarea":
      return { ...base, label: "Feedback", placeholder: "Please share your thoughts with us..." };
    case "email":
      return { ...base, label: "Email Address", placeholder: "you@example.com" };
    case "number":
      return { ...base, label: "Age", placeholder: "e.g. 25" };
    case "multiple_choice":
      return { ...base, label: "Preferred Contact Method", options: ["Email", "Phone call", "SMS text"] };
    case "checkboxes":
      return { ...base, label: "Interests", options: ["Technology", "Art & Design", "Sports", "Music"] };
    case "dropdown":
      return { ...base, label: "Country / Region", options: ["United States", "Puerto Rico", "Canada", "United Kingdom", "Other"] };
    case "checkbox":
      return { ...base, label: "Terms of Service", placeholder: "I agree to the Terms of Service and Privacy Policy" };
    case "date":
      return { ...base, label: "Date of Birth" };
    case "time":
      return { ...base, label: "Preferred Meeting Time" };
    case "linear_scale":
      return {
        ...base,
        label: "How likely are you to recommend us?",
        scaleMin: 1,
        scaleMax: 5,
        scaleMinLabel: "Not likely",
        scaleMaxLabel: "Very likely"
      };
    case "rating":
      return { ...base, label: "Product Rating", ratingMax: 5, ratingIcon: "star" };
    case "file":
      return { ...base, label: "Upload Resume (PDF, Word)", fileMaxMB: 10, fileMaxCount: 1 };
    case "grid_multiple_choice":
      return {
        ...base,
        label: "Rate features",
        rows: ["Speed", "Usability", "Design"],
        columns: ["Needs Work", "Good", "Outstanding"]
      };
    case "grid_checkbox":
      return {
        ...base,
        label: "Select your availability",
        rows: ["Monday", "Wednesday", "Friday"],
        columns: ["Morning", "Afternoon", "Evening"]
      };
    default:
      return base;
  }
}

function getDefaultPreviewValue(type: FormFieldType): any {
  switch (type) {
    case "checkbox":
      return false;
    case "checkboxes":
      return [];
    case "grid_multiple_choice":
    case "grid_checkbox":
      return {};
    case "file":
      return [];
    default:
      return "";
  }
}

function AddQuestionDialog({ onAdd, themeColor }: { onAdd: (type: FormFieldType) => void; themeColor: string }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<FormFieldType>("text");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [previewValue, setPreviewValue] = useState<any>("");

  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, opacity: 0 });
  const [clickRipple, setClickRipple] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const interactionTimeoutRef = useRef<any>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  const stopAutoPlay = () => {
    if (!isAutoPlaying) return;
    setIsAutoPlaying(false);
    setCursorPos(prev => ({ ...prev, opacity: 0 }));
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    interactionTimeoutRef.current = setTimeout(() => {
      setIsAutoPlaying(true);
    }, 8000); // Resume autoplay after 8 seconds of idle
  };

  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setPreviewValue(getDefaultPreviewValue(selectedType));
    setIsDropdownOpen(false);
    setIsCalendarOpen(false);
    setIsTimeOpen(false);
  }, [selectedType]);

  useEffect(() => {
    if (!isAutoPlaying || !open) {
      setCursorPos(prev => ({ ...prev, opacity: 0 }));
      return;
    }

    setPreviewValue(getDefaultPreviewValue(selectedType));

    let active = true;

    const runSequence = async () => {
      // Wait for DOM elements to mount
      await new Promise(resolve => setTimeout(resolve, 800));
      if (!active || !isAutoPlaying) return;

      const container = (desktopContainerRef.current?.offsetWidth ?? 0) > 0 
        ? desktopContainerRef.current 
        : mobileContainerRef.current;

      if (!container) return;

      const moveToElement = (el: HTMLElement) => {
        if (!container || !el) return { x: 0, y: 0 };
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const x = elRect.left - containerRect.left + elRect.width / 2;
        const y = elRect.top - containerRect.top + elRect.height / 2;
        setCursorPos({ x, y, opacity: 1 });
        return { x, y };
      };

      const clickElement = async (el: HTMLElement) => {
        setClickRipple(true);
        setTimeout(() => setClickRipple(false), 300);
        el.focus();
        el.click();
      };

      const typeIntoInput = async (text: string) => {
        for (let i = 1; i <= text.length; i++) {
          if (!active || !isAutoPlaying) return;
          const slice = text.slice(0, i);
          setPreviewValue(slice);
          await new Promise(resolve => setTimeout(resolve, 80));
        }
      };

      // Set initial position
      setCursorPos({ x: 120, y: 80, opacity: 0 });
      await new Promise(resolve => setTimeout(resolve, 400));
      if (!active || !isAutoPlaying) return;

      switch (selectedType) {
        case "text":
        case "email":
        case "number": {
          const input = container.querySelector('input') as HTMLInputElement;
          if (input) {
            moveToElement(input);
            await new Promise(resolve => setTimeout(resolve, 800));
            if (!active || !isAutoPlaying) return;
            
            clickElement(input);
            await new Promise(resolve => setTimeout(resolve, 400));
            if (!active || !isAutoPlaying) return;

            const text = selectedType === "text" ? "Jane Doe" : selectedType === "email" ? "jane@example.com" : "25";
            await typeIntoInput(text);
          }
          break;
        }
        case "textarea": {
          const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
          if (textarea) {
            moveToElement(textarea);
            await new Promise(resolve => setTimeout(resolve, 800));
            if (!active || !isAutoPlaying) return;

            clickElement(textarea);
            await new Promise(resolve => setTimeout(resolve, 400));
            if (!active || !isAutoPlaying) return;

            await typeIntoInput("Great builder layout! Very clean.");
          }
          break;
        }
        case "checkbox": {
          const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
          if (input) {
            moveToElement(input);
            await new Promise(resolve => setTimeout(resolve, 800));
            if (!active || !isAutoPlaying) return;

            clickElement(input);
            setPreviewValue(true);
          }
          break;
        }
        case "multiple_choice":
        case "dropdown":
        case "select": {
          if (selectedType === "dropdown" || selectedType === "select") {
            const selectEl = container.querySelector('.mock-select-input') as HTMLElement;
            if (selectEl) {
              moveToElement(selectEl);
              await new Promise(resolve => setTimeout(resolve, 800));
              if (!active || !isAutoPlaying) return;

              clickElement(selectEl);
              setIsDropdownOpen(true);
              await new Promise(resolve => setTimeout(resolve, 600));
              if (!active || !isAutoPlaying) return;

              const optBtn = container.querySelector('.mock-option-puerto-rico') as HTMLElement;
              if (optBtn) {
                moveToElement(optBtn);
                await new Promise(resolve => setTimeout(resolve, 800));
                if (!active || !isAutoPlaying) return;

                clickElement(optBtn);
                setPreviewValue("Puerto Rico");
                setIsDropdownOpen(false);
              }
            }
          } else {
            const radios = container.querySelectorAll('input[type="radio"]');
            if (radios.length > 1) {
              const r2 = radios[1] as HTMLElement;
              moveToElement(r2);
              await new Promise(resolve => setTimeout(resolve, 800));
              if (!active || !isAutoPlaying) return;

              clickElement(r2);
              setPreviewValue("Phone call");
              await new Promise(resolve => setTimeout(resolve, 1200));
              if (!active || !isAutoPlaying) return;

              const r1 = radios[0] as HTMLElement;
              moveToElement(r1);
              await new Promise(resolve => setTimeout(resolve, 800));
              if (!active || !isAutoPlaying) return;

              clickElement(r1);
              setPreviewValue("Email");
            }
          }
          break;
        }
        case "checkboxes": {
          const checkboxes = container.querySelectorAll('input[type="checkbox"]');
          if (checkboxes.length > 2) {
            const c1 = checkboxes[0] as HTMLInputElement;
            const c3 = checkboxes[2] as HTMLInputElement;

            moveToElement(c1);
            await new Promise(resolve => setTimeout(resolve, 800));
            if (!active || !isAutoPlaying) return;
            clickElement(c1);
            setPreviewValue(["Technology"]);

            await new Promise(resolve => setTimeout(resolve, 1200));
            if (!active || !isAutoPlaying) return;

            moveToElement(c3);
            await new Promise(resolve => setTimeout(resolve, 800));
            if (!active || !isAutoPlaying) return;
            clickElement(c3);
            setPreviewValue(["Technology", "Sports"]);
          }
          break;
        }
        case "linear_scale": {
          const radios = container.querySelectorAll('input[type="radio"]');
          if (radios.length > 4) {
            const r4 = radios[3] as HTMLElement;
            const r5 = radios[4] as HTMLElement;

            moveToElement(r4);
            await new Promise(resolve => setTimeout(resolve, 800));
            if (!active || !isAutoPlaying) return;
            clickElement(r4);
            setPreviewValue("4");

            await new Promise(resolve => setTimeout(resolve, 1200));
            if (!active || !isAutoPlaying) return;

            moveToElement(r5);
            await new Promise(resolve => setTimeout(resolve, 800));
            if (!active || !isAutoPlaying) return;
            clickElement(r5);
            setPreviewValue("5");
          }
          break;
        }
        case "rating": {
          const stars = container.querySelectorAll('button[aria-label]');
          if (stars.length > 4) {
            for (let i = 0; i < 5; i++) {
              const star = stars[i] as HTMLElement;
              moveToElement(star);
              await new Promise(resolve => setTimeout(resolve, 250));
              if (!active || !isAutoPlaying) return;
            }
            const star5 = stars[4] as HTMLElement;
            clickElement(star5);
            setPreviewValue("5");
          }
          break;
        }
        case "date": {
          const input = container.querySelector('.mock-date-input') as HTMLElement;
          if (input) {
            moveToElement(input);
            await new Promise(resolve => setTimeout(resolve, 800));
            if (!active || !isAutoPlaying) return;

            clickElement(input);
            setIsCalendarOpen(true);
            await new Promise(resolve => setTimeout(resolve, 600));
            if (!active || !isAutoPlaying) return;

            const dateBtn = container.querySelector('.mock-date-25') as HTMLElement;
            if (dateBtn) {
              moveToElement(dateBtn);
              await new Promise(resolve => setTimeout(resolve, 800));
              if (!active || !isAutoPlaying) return;

              clickElement(dateBtn);
              setPreviewValue("2026-05-25");
              setIsCalendarOpen(false);
            }
          }
          break;
        }
        case "time": {
          const input = container.querySelector('.mock-time-input') as HTMLElement;
          if (input) {
            moveToElement(input);
            await new Promise(resolve => setTimeout(resolve, 800));
            if (!active || !isAutoPlaying) return;

            clickElement(input);
            setIsTimeOpen(true);
            await new Promise(resolve => setTimeout(resolve, 600));
            if (!active || !isAutoPlaying) return;

            const timeBtn = container.querySelector('.mock-time-12') as HTMLElement;
            if (timeBtn) {
              moveToElement(timeBtn);
              await new Promise(resolve => setTimeout(resolve, 800));
              if (!active || !isAutoPlaying) return;

              clickElement(timeBtn);
              setPreviewValue("12:00 PM");
              setIsTimeOpen(false);
            }
          }
          break;
        }
        case "file": {
          const button = container.querySelector('button') as HTMLElement;
          if (button) {
            moveToElement(button);
            await new Promise(resolve => setTimeout(resolve, 800));
            if (!active || !isAutoPlaying) return;

            clickElement(button);
            await new Promise(resolve => setTimeout(resolve, 600));
            if (!active || !isAutoPlaying) return;

            setPreviewValue([{ name: "resume.pdf", url: "#", size: 124000 }]);
          }
          break;
        }
        case "grid_multiple_choice":
        case "grid_checkbox": {
          const cells = container.querySelectorAll('table input');
          const isGridCheckbox = selectedType === "grid_checkbox";
          
          if (cells.length > 5) {
            const cell1 = cells[0] as HTMLInputElement;
            const cell2 = cells[4] as HTMLInputElement;
            
            if (cell1) {
              moveToElement(cell1);
              await new Promise(resolve => setTimeout(resolve, 800));
              if (!active || !isAutoPlaying) return;
              clickElement(cell1);
              setPreviewValue(isGridCheckbox ? { "Speed": ["Needs Work"] } : { "Speed": "Needs Work" });
            }

            if (cells.length > 4 && cell2) {
              await new Promise(resolve => setTimeout(resolve, 1200));
              if (!active || !isAutoPlaying) return;
              moveToElement(cell2);
              await new Promise(resolve => setTimeout(resolve, 800));
              if (!active || !isAutoPlaying) return;
              clickElement(cell2);
              setPreviewValue(isGridCheckbox 
                ? { "Speed": ["Needs Work"], "Usability": ["Good"] } 
                : { "Speed": "Needs Work", "Usability": "Good" }
              );
            }
          }
          break;
        }

        default:
          break;
      }

      await new Promise(resolve => setTimeout(resolve, 2500));
      if (!active || !isAutoPlaying) return;
      setCursorPos(prev => ({ ...prev, opacity: 0 }));
    };

    runSequence();

    return () => {
      active = false;
    };
  }, [selectedType, isAutoPlaying, open]);

  const groups = ["Text", "Choice", "Scale", "Advanced"] as const;
  const filteredTypes = QUESTION_TYPE_LIST.filter(t => 
    t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTypeDef = QUESTION_TYPE_LIST.find(t => t.type === selectedType);

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (val) {
        setSearchQuery("");
        setSelectedType("text");
        setMobileView("list");
      }
    }}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm hover:bg-muted transition-colors cursor-pointer"
        >
          <Plus className="size-4" /> Add question
        </button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-none md:max-w-3xl lg:max-w-5xl h-[85vh] lg:h-[700px] p-0 gap-0 overflow-hidden flex flex-col rounded-xl border border-border shadow-2xl bg-background">
        {/* Desktop Layout (Split Pane) */}
        <div className="hidden lg:flex flex-1 h-full overflow-hidden">
          {/* Left Column: Search & List */}
          <div className="w-[340px] border-r border-border flex flex-col bg-muted/20">
            {/* Search Header */}
            <div className="p-4 border-b border-border bg-background/50 backdrop-blur-xs">
              <h3 className="text-sm font-semibold mb-2">Add Question Block</h3>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search block types..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>
            {/* Category List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {groups.map((group) => {
                const items = filteredTypes.filter((t) => t.group === group);
                if (items.length === 0) return null;
                return (
                  <div key={group} className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground/85 tracking-wider uppercase px-2">
                      {group}
                    </span>
                    <div className="space-y-0.5">
                      {items.map((t) => {
                        const Icon = t.icon;
                        const isSelected = selectedType === t.type;
                        return (
                          <button
                            key={t.type}
                            type="button"
                            onClick={() => setSelectedType(t.type)}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-left transition-all cursor-pointer ${
                              isSelected
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-muted/70 text-foreground/80 hover:text-foreground"
                            }`}
                          >
                            <div className={`p-1.5 rounded-md ${
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}>
                              <Icon className="size-4" />
                            </div>
                            <span className="flex-1">{t.label}</span>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {filteredTypes.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No matching question types found.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Details & Preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-primary/10 text-primary mb-1">
                  {selectedTypeDef?.group}
                </span>
                <h2 className="text-xl font-bold tracking-tight text-foreground">{selectedTypeDef?.label}</h2>
              </div>
            </div>

            {/* Main Details and Live Preview */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Description */}
              <div className="space-y-2 bg-muted/30 p-4 rounded-xl border border-border/40">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</h4>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {QUESTION_DESCRIPTIONS[selectedType]}
                </p>
              </div>

              {/* Live Preview Pane */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" /> Interactive Live Preview
                  </h4>
                  <span className="text-[10px] text-muted-foreground">Interact below to test</span>
                </div>

                {/* Browser Card Mockup */}
                <div className="border border-border rounded-xl overflow-hidden shadow-lg bg-background flex flex-col">
                  {/* Browser Header */}
                  <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between gap-3 border-b border-border/50">
                    <div className="flex gap-1.5 shrink-0 w-[50px]">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                    </div>
                    <div className="flex-1 max-w-xs bg-background/80 border border-border/60 rounded-md py-0.5 px-3 text-[10px] text-muted-foreground/80 truncate text-center font-mono select-none">
                      openweb.dev/form/preview
                    </div>
                    <div className="w-[100px] flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-semibold flex items-center gap-1 border border-border/50 hover:bg-muted cursor-pointer transition-all ${
                          isAutoPlaying ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isAutoPlaying ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"}`} />
                        <span>{isAutoPlaying ? "Auto Demo" : "Interactive"}</span>
                      </button>
                    </div>
                  </div>
                  {/* Viewport */}
                  <div 
                    ref={desktopContainerRef}
                    onMouseDown={stopAutoPlay}
                    onFocusCapture={stopAutoPlay}
                    onKeyDown={stopAutoPlay}
                    className="p-6 bg-background dark:bg-neutral-900 min-h-[160px] flex flex-col justify-center border-t-0 relative overflow-hidden"
                  >
                    {/* Imaginary Mouse Pointer */}
                    {isAutoPlaying && cursorPos.opacity > 0 && (
                      <div
                        className="absolute pointer-events-none z-30 transition-all duration-700 ease-out flex items-center justify-center"
                        style={{
                          left: cursorPos.x,
                          top: cursorPos.y,
                          opacity: cursorPos.opacity,
                        }}
                      >
                        <MousePointer2 className="size-5 text-neutral-900 fill-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] select-none pointer-events-none" />
                        {clickRipple && (
                          <span className="absolute w-6 h-6 rounded-full bg-primary/40 animate-ping -left-1 -top-1" />
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground flex items-center gap-1">
                        {getMockField(selectedType).label}
                        {getMockField(selectedType).required && <span className="text-red-500">*</span>}
                      </label>
                      {getMockField(selectedType).description && (
                        <p className="text-xs text-muted-foreground mb-2">{getMockField(selectedType).description}</p>
                      )}
                      <div className="pt-1">
                        {selectedType === "dropdown" || selectedType === "select" ? (
                          <DemoDropdown
                            value={previewValue}
                            onChange={setPreviewValue}
                            themeColor={themeColor}
                            isOpen={isDropdownOpen}
                            setIsOpen={setIsDropdownOpen}
                          />
                        ) : selectedType === "date" ? (
                          <DemoDatePicker
                            value={previewValue}
                            onChange={setPreviewValue}
                            themeColor={themeColor}
                            isOpen={isCalendarOpen}
                            setIsOpen={setIsCalendarOpen}
                          />
                        ) : selectedType === "time" ? (
                          <DemoTimePicker
                            value={previewValue}
                            onChange={setPreviewValue}
                            themeColor={themeColor}
                            isOpen={isTimeOpen}
                            setIsOpen={setIsTimeOpen}
                          />
                        ) : (
                          <QuestionInput
                            field={getMockField(selectedType)}
                            value={previewValue}
                            onChange={setPreviewValue}
                            accent={themeColor}
                            disabled={selectedType === "file"}
                          />
                        )}
                      </div>
                      {previewValue !== undefined && previewValue !== "" && (
                        <div className="mt-4 p-2 bg-muted/40 rounded-lg text-[10px] font-mono text-muted-foreground flex gap-1 items-center border border-border/30">
                          <span className="font-semibold text-primary/80">Value:</span>
                          <span className="truncate">{JSON.stringify(previewValue)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-3">
              <DialogClose asChild>
                <button className="px-4 py-2 text-sm font-medium border border-border hover:bg-muted rounded-lg transition-colors cursor-pointer">
                  Cancel
                </button>
              </DialogClose>
              <button
                onClick={() => {
                  onAdd(selectedType);
                  setOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/95 hover-lift shadow-sm hover:shadow-md rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="size-4" /> Add Question Block
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Layout (Slide-in Detail view) */}
        <div className="flex lg:hidden flex-1 flex-col overflow-hidden h-full">
          {mobileView === "list" ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
              <div className="p-4 border-b border-border bg-background/50">
                <h3 className="text-sm font-semibold mb-2">Select Question Block</h3>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search block types..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {groups.map((group) => {
                  const items = filteredTypes.filter((t) => t.group === group);
                  if (items.length === 0) return null;
                  return (
                    <div key={group} className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground/80 tracking-wider uppercase px-2">
                        {group}
                      </span>
                      <div className="space-y-0.5">
                        {items.map((t) => {
                          const Icon = t.icon;
                          return (
                            <button
                              key={t.type}
                              type="button"
                              onClick={() => {
                                setSelectedType(t.type);
                                setMobileView("detail");
                              }}
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left hover:bg-muted/70 text-foreground/80 active:bg-muted transition-all cursor-pointer"
                            >
                              <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                                <Icon className="size-4" />
                              </div>
                              <span className="flex-1 font-medium">{t.label}</span>
                              <ChevronRight className="size-4 text-muted-foreground/60" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {filteredTypes.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No matching question types found.
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-border bg-muted/20">
                <DialogClose asChild>
                  <button className="w-full py-2.5 text-sm font-medium border border-border hover:bg-muted active:bg-muted/80 rounded-lg transition-colors cursor-pointer">
                    Cancel
                  </button>
                </DialogClose>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
              {/* Navigation Bar */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <button
                  onClick={() => setMobileView("list")}
                  className="p-1.5 -ml-1 hover:bg-muted active:bg-muted/80 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium text-primary cursor-pointer"
                >
                  <ArrowLeft className="size-4" />
                  <span>List</span>
                </button>
                <span className="text-xs text-muted-foreground">/</span>
                <span className="text-sm font-semibold truncate">{selectedTypeDef?.label}</span>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-primary/10 text-primary mb-1">
                    {selectedTypeDef?.group}
                  </span>
                  <h2 className="text-lg font-bold text-foreground">{selectedTypeDef?.label}</h2>
                </div>

                {/* Description */}
                <div className="p-3 bg-muted/30 rounded-lg border border-border/40 text-xs text-foreground/80 leading-relaxed">
                  {QUESTION_DESCRIPTIONS[selectedType]}
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Preview</h4>
                  <div className="border border-border rounded-xl overflow-hidden shadow-md bg-background">
                    <div className="bg-muted/50 px-3 py-2 flex items-center justify-between gap-2 border-b border-border/50">
                      <div className="flex gap-1 shrink-0 w-[40px]">
                        <span className="w-2 h-2 rounded-full bg-red-400/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                      </div>
                      <div className="flex-1 text-[9px] text-muted-foreground/70 truncate text-center font-mono select-none">
                        openweb.dev/preview
                      </div>
                      <div className="w-[85px] flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                          className={`px-1.5 py-0.5 rounded-md text-[8px] font-semibold flex items-center gap-1 border border-border/50 hover:bg-muted cursor-pointer transition-all ${
                            isAutoPlaying ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full ${isAutoPlaying ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"}`} />
                          <span>{isAutoPlaying ? "Demo" : "Interactive"}</span>
                        </button>
                      </div>
                    </div>
                    <div 
                      ref={mobileContainerRef}
                      onMouseDown={stopAutoPlay}
                      onFocusCapture={stopAutoPlay}
                      onKeyDown={stopAutoPlay}
                      className="p-4 bg-background dark:bg-neutral-900 min-h-[120px] flex flex-col justify-center relative overflow-hidden"
                    >
                      {/* Imaginary Mouse Pointer */}
                      {isAutoPlaying && cursorPos.opacity > 0 && (
                        <div
                          className="absolute pointer-events-none z-30 transition-all duration-700 ease-out flex items-center justify-center"
                          style={{
                            left: cursorPos.x,
                            top: cursorPos.y,
                            opacity: cursorPos.opacity,
                          }}
                        >
                          <MousePointer2 className="size-5 text-neutral-900 fill-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] select-none pointer-events-none" />
                          {clickRipple && (
                            <span className="absolute w-6 h-6 rounded-full bg-primary/40 animate-ping -left-1 -top-1" />
                          )}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">
                          {getMockField(selectedType).label}
                        </label>
                        <div className="pt-1">
                          {selectedType === "dropdown" || selectedType === "select" ? (
                            <DemoDropdown
                              value={previewValue}
                              onChange={setPreviewValue}
                              themeColor={themeColor}
                              isOpen={isDropdownOpen}
                              setIsOpen={setIsDropdownOpen}
                            />
                          ) : selectedType === "date" ? (
                            <DemoDatePicker
                              value={previewValue}
                              onChange={setPreviewValue}
                              themeColor={themeColor}
                              isOpen={isCalendarOpen}
                              setIsOpen={setIsCalendarOpen}
                            />
                          ) : selectedType === "time" ? (
                            <DemoTimePicker
                              value={previewValue}
                              onChange={setPreviewValue}
                              themeColor={themeColor}
                              isOpen={isTimeOpen}
                              setIsOpen={setIsTimeOpen}
                            />
                          ) : (
                            <QuestionInput
                              field={getMockField(selectedType)}
                              value={previewValue}
                              onChange={setPreviewValue}
                              accent={themeColor}
                              disabled={selectedType === "file"}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-muted/20 flex gap-2">
                <button
                  onClick={() => setMobileView("list")}
                  className="flex-1 py-2.5 text-sm font-medium border border-border hover:bg-muted active:bg-muted/80 rounded-lg transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    onAdd(selectedType);
                    setOpen(false);
                  }}
                  className="flex-[2] py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/95 active:bg-primary/90 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="size-4" /> Add Question Block
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DemoDropdown({ value, onChange, themeColor, isOpen, setIsOpen }: {
  value: any;
  onChange: (v: any) => void;
  themeColor: string;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}) {
  const options = ["United States", "Puerto Rico", "Canada", "United Kingdom", "Other"];
  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="mock-select-input w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-neutral-100 transition-colors cursor-pointer"
        style={isOpen ? { borderColor: themeColor, boxShadow: `0 0 0 2px ${themeColor}33` } : {}}
      >
        <span>{value || "Select..."}</span>
        <ChevronDown className="size-4 text-gray-400" />
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-1 shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-200">
          {options.map((opt) => {
            const isSelected = value === opt;
            const isPR = opt === "Puerto Rico";
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`mock-option-${isPR ? "puerto-rico" : opt.toLowerCase().replace(/\s+/g, "-")} flex w-full items-center px-3.5 py-2.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${
                  isSelected ? "font-medium" : "text-gray-700 dark:text-neutral-300"
                }`}
                style={isSelected ? { color: themeColor, backgroundColor: `${themeColor}1a` } : {}}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DemoDatePicker({ value, onChange, themeColor, isOpen, setIsOpen }: {
  value: any;
  onChange: (v: any) => void;
  themeColor: string;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}) {
  const daysInMonth = 31;
  const startDayOffset = 5; // May 2026 starts on Friday
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="mock-date-input w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-neutral-100 transition-colors cursor-pointer"
        style={isOpen ? { borderColor: themeColor, boxShadow: `0 0 0 2px ${themeColor}33` } : {}}
      >
        <span>{value || "Select date..."}</span>
        <Calendar className="size-4 text-gray-400" />
      </button>
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-neutral-300">May 2026</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-gray-400 dark:text-neutral-500 mb-1">
            {weekdays.map((w) => <div key={w}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: startDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((d) => {
              const dateStr = `2026-05-${d < 10 ? "0" + d : d}`;
              const isSelected = value === dateStr;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    onChange(dateStr);
                    setIsOpen(false);
                  }}
                  className={`mock-date-${d} size-7 text-[11px] rounded-md flex items-center justify-center hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${
                    isSelected 
                      ? "text-white font-semibold" 
                      : "text-gray-700 dark:text-neutral-300"
                  }`}
                  style={isSelected ? { backgroundColor: themeColor } : {}}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DemoTimePicker({ value, onChange, themeColor, isOpen, setIsOpen }: {
  value: any;
  onChange: (v: any) => void;
  themeColor: string;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}) {
  const times = [
    "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"
  ];
  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="mock-time-input w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-neutral-100 transition-colors cursor-pointer"
        style={isOpen ? { borderColor: themeColor, boxShadow: `0 0 0 2px ${themeColor}33` } : {}}
      >
        <span>{value || "Select time..."}</span>
        <Clock className="size-4 text-gray-400" />
      </button>
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-40 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-1 shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-200">
          {times.map((t) => {
            const isSelected = value === t;
            const is12 = t === "12:00 PM";
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onChange(t);
                  setIsOpen(false);
                }}
                className={`mock-time-${is12 ? "12" : t.split(":")[0]} flex w-full items-center px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${
                  isSelected ? "font-medium" : "text-gray-700 dark:text-neutral-300"
                }`}
                style={isSelected ? { color: themeColor, backgroundColor: `${themeColor}1a` } : {}}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
