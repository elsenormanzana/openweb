import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BLOCK_REGISTRY,
  defaultBlock,
  parseBlocks,
  type Block,
  type BlockType,
  type BlockCategory,
} from "@/lib/blocks";
import { composeBlock, isComposable } from "@/lib/block-compositions";
import { renderBlock, BlockRenderer } from "@/components/BlockRenderer";
import { BlockPropsForm } from "@/components/block-forms";
import { AnimationConfigForm } from "@/components/block-forms/AnimationConfigForm";
import { SpacingConfigForm } from "@/components/block-forms/SpacingConfigForm";
import type { AnimationConfig } from "@/lib/animations";
import type { SpacingConfig } from "@/lib/blocks";
import { useUndoRedo } from "@/lib/useUndoRedo";
import { BLOCK_PRESETS, createPresetBlocks, type BlockPreset } from "@/lib/block-presets";
import { Button } from "@/components/ui/button";
import {
  GripVertical, Trash2, Copy, LayoutTemplate, X, PanelLeftClose, PanelLeftOpen,
  Undo2, Redo2, ChevronUp, ChevronDown, Clipboard, ClipboardPaste,
  Sparkles, Code, AlertTriangle, Plus, FolderTree, Anchor, Scissors,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PreviewMode = "desktop" | "tablet" | "mobile";

// ─── Palette ──────────────────────────────────────────────────────────────────

const CATEGORIES: { name: BlockCategory; label: string }[] = [
  { name: "Layout", label: "Layout" },
  { name: "Content", label: "Content" },
  { name: "Basic", label: "Basic" },
  { name: "Animated", label: "Animated" },
  { name: "Showcase", label: "Showcase" },
  { name: "Interactive", label: "Interactive" },
];

function Palette({
  onAdd,
  onToggle,
  onApplyPreset,
  customPresets,
  onSaveTemplateClick,
}: {
  onAdd: (type: BlockType) => void;
  onToggle: () => void;
  onApplyPreset: (preset: BlockPreset) => void;
  customPresets: BlockPreset[];
  onSaveTemplateClick: () => void;
}) {
  const [tab, setTab] = useState<"blocks" | "templates">("blocks");

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          <button
            onClick={() => setTab("blocks")}
            className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              tab === "blocks" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Blocks
          </button>
          <button
            onClick={() => setTab("templates")}
            className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              tab === "templates" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Templates
          </button>
        </div>
        <button
          aria-label="Hide blocks panel"
          onClick={onToggle}
          className="rounded-lg p-1 hover:bg-muted transition-colors text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PanelLeftClose className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      {tab === "blocks" ? (
        <div className="flex-1 overflow-y-auto py-2 space-y-4 px-2">
          {CATEGORIES.map(({ name, label }) => {
            const entries = BLOCK_REGISTRY.filter((r) => r.category === name);
            if (entries.length === 0) return null;
            return (
              <div key={name}>
                <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">{label}</p>
                {entries.map((entry) => {
                  const EntryIcon = entry.Icon;
                  return (
                    <button
                      key={entry.type}
                      onClick={() => onAdd(entry.type)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", entry.type);
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-sm hover:bg-muted text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-grab active:cursor-grabbing"
                    >
                      <div className="size-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <EntryIcon className="size-3.5 text-foreground/60" />
                      </div>
                      <span className="text-sm font-medium truncate">{entry.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-2">
          <div className="px-2 flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Page Templates</p>
            <button
              onClick={onSaveTemplateClick}
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-500 hover:text-blue-600 transition-colors"
            >
              <Plus className="size-3.5" /> Save Current
            </button>
          </div>
          {[...customPresets, ...BLOCK_PRESETS].map((preset) => (
            <button
              key={preset.id || preset.name}
              onClick={() => onApplyPreset(preset)}
              className="w-full text-left rounded-xl border border-border/60 p-3 hover:bg-muted/50 hover:border-border transition-all group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="size-3.5 text-blue-500/70 group-hover:text-blue-500" />
                <span className="text-sm font-medium">{preset.name}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{preset.description}</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">{preset.blocks?.length || 0} blocks</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sortable visual block ───────────────────────────────────────────────────

function SortableVisualBlock({
  block,
  index,
  total,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onCopy,
  editorProps,
}: {
  block: Block;
  index: number;
  total: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onCopy: (id: string) => void;
  editorProps?: any;
}) {
  const entry = BLOCK_REGISTRY.find((r) => r.type === block.type);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative cursor-pointer ${isDragging ? "opacity-20" : ""}`}
      onClick={() => onSelect(block.id)}
    >
      {/* Rendered block — pointer-events-auto for children */}
      <div className="pointer-events-auto select-none">
        {renderBlock(block, editorProps)}
      </div>

      {/* Selection / hover ring */}
      <div
        className={`absolute inset-0 pointer-events-none border-2 transition-all rounded-sm ${
          isSelected
            ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
            : "border-transparent group-hover:border-blue-300/70"
        }`}
      />

      <div
        className={`absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 rounded-full
          text-white text-xs px-1.5 py-1 transition-all pointer-events-auto
          border border-white/20 shadow-2xl backdrop-blur-md
          ${isSelected
            ? "bg-neutral-900/80 opacity-100"
            : "bg-neutral-900/60 opacity-0 group-hover:opacity-100"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Move up */}
        <button
          aria-label="Move block up"
          disabled={index === 0}
          onClick={() => onMoveUp(block.id)}
          className="p-1 rounded-full hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
        >
          <ChevronUp className="size-3" aria-hidden="true" />
        </button>

        {/* Move down */}
        <button
          aria-label="Move block down"
          disabled={index === total - 1}
          onClick={() => onMoveDown(block.id)}
          className="p-1 rounded-full hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
        >
          <ChevronDown className="size-3" aria-hidden="true" />
        </button>

        {/* Drag handle */}
        <button
          {...listeners}
          {...attributes}
          aria-label="Drag to reorder block"
          className="p-1 rounded-full cursor-grab hover:bg-white/15 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
        >
          <GripVertical className="size-3" aria-hidden="true" />
        </button>

        {/* Move to Container Dropdown */}
        {editorProps?.availableContainers?.length > 1 && (
          <div className="relative group/move flex items-center">
            <button className="p-1 hover:bg-white/15 rounded-full transition-colors flex items-center gap-0.5 text-[10px] font-medium text-blue-300" title="Move into Row, Column, Card, or Alert">
              <FolderTree className="size-3" /> Move
            </button>
            <select
              value=""
              onChange={(e) => {
                e.stopPropagation();
                if (!e.target.value || !editorProps.onMoveBlockBetweenContainers) return;
                const [destId, ...rest] = e.target.value.split(".");
                const destKey = rest.join(".");
                editorProps.onMoveBlockBetweenContainers(block.id, "root", destKey, destId === "root" ? undefined : destId);
                e.target.value = "";
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
            >
              <option value="">Move block to...</option>
              {editorProps.availableContainers.filter((c: any) => c.id !== "root").map((c: any) => (
                <option key={`${c.id}.${c.containerKey}`} value={`${c.id}.${c.containerKey}`}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Block label + index */}
        <span className="px-1.5 font-medium whitespace-nowrap flex items-center gap-1 opacity-80">
          {entry && <entry.Icon className="size-3" />}
          {entry?.label}
          <span className="opacity-50 text-[10px]">{index + 1}/{total}</span>
        </span>

        {/* Copy block to clipboard */}
        <button
          aria-label="Copy block"
          onClick={() => onCopy(block.id)}
          className="p-1 rounded-full hover:bg-white/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
        >
          <Clipboard className="size-3" aria-hidden="true" />
        </button>

        {/* Break a pre-made block into editable basic blocks */}
        {isComposable(block.type) && editorProps?.onBreakApart && (
          <button
            aria-label="Break into editable blocks"
            title="Break into editable blocks"
            onClick={() => editorProps.onBreakApart(block.id)}
            className="p-1 rounded-full hover:bg-white/15 text-emerald-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
          >
            <Scissors className="size-3" aria-hidden="true" />
          </button>
        )}

        {/* Duplicate */}
        <button
          aria-label="Duplicate block"
          onClick={() => onDuplicate(block.id)}
          className="p-1 rounded-full hover:bg-white/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
        >
          <Copy className="size-3" aria-hidden="true" />
        </button>

        {/* Delete */}
        <button
          aria-label="Delete block"
          onClick={() => onDelete(block.id)}
          className="p-1 rounded-full hover:bg-red-500/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
        >
          <Trash2 className="size-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ─── Drag overlay ────────────────────────────────────────────────────────────

function DragOverlayCard({ block }: { block: Block }) {
  const entry = BLOCK_REGISTRY.find((r) => r.type === block.type);
  return (
    <div className="flex items-center gap-2.5 bg-background border border-border rounded-xl px-4 py-3 shadow-2xl">
      <div className="size-6 rounded-md bg-muted flex items-center justify-center">
        {entry && <entry.Icon className="size-3.5 text-foreground/60" />}
      </div>
      <span className="font-medium text-sm">{entry?.label}</span>
    </div>
  );
}

// ─── Properties panel ────────────────────────────────────────────────────────

function PropertiesPanel({
  block,
  onChange,
  onDelete,
  onDuplicate,
  onDeselect,
}: {
  block: Block;
  onChange: (b: Block) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDeselect: () => void;
}) {
  const entry = BLOCK_REGISTRY.find((r) => r.type === block.type);
  return (
    <div className="flex flex-col h-full bg-background border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
            {entry && <entry.Icon className="size-3.5 text-foreground/70" />}
          </div>
          <span className="text-sm font-semibold">{entry?.label}</span>
        </div>
        <button
          aria-label="Close properties panel"
          onClick={onDeselect}
          className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <BlockPropsForm block={block} onChange={onChange} />

        {/* Section Anchor ID */}
        <div className="border rounded-md p-3 space-y-2 bg-muted/20">
          <div className="flex items-center gap-1.5">
            <Anchor className="size-3 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground">Section HTML ID (Anchor)</p>
          </div>
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
            Assign a unique ID to link directly to this section (e.g. <code className="bg-muted px-1 rounded text-[10px]">#pricing</code>).
          </p>
          <input
            type="text"
            value={block.meta?.anchorId ?? ""}
            onChange={(e) => {
              const sanitized = e.target.value.replace(/[^a-zA-Z0-9-_]/g, "");
              onChange({ ...block, meta: { ...block.meta, anchorId: sanitized } } as Block);
            }}
            placeholder="e.g. pricing"
            className="w-full rounded-md border bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring h-8"
          />
        </div>

        {/* Universal Spacing & Layout */}
        <SpacingConfigForm
          spacing={block.meta?.spacing}
          onChange={(spacing: SpacingConfig) =>
            onChange({ ...block, meta: { ...block.meta, spacing } } as Block)
          }
        />

        {/* Animation settings */}
        <AnimationConfigForm
          animation={block.meta?.animation}
          onChange={(anim: AnimationConfig) =>
            onChange({ ...block, meta: { ...block.meta, animation: anim } } as Block)
          }
        />

        {/* Custom CSS */}
        <div className="border rounded-md p-3 space-y-2 bg-muted/20">
          <div className="flex items-center gap-1.5">
            <Code className="size-3 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground">Custom CSS</p>
          </div>
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
            Use <code className="bg-muted px-1 rounded text-[10px]">:block</code> to target this block.
          </p>
          <textarea
            value={block.meta?.customCSS ?? ""}
            onChange={(e) =>
              onChange({ ...block, meta: { ...block.meta, customCSS: e.target.value } } as Block)
            }
            placeholder={`:block {\n  /* your styles */\n}`}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-xs font-mono min-h-[80px] resize-y placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t p-3 flex gap-2 shrink-0">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => onDuplicate(block.id)}>
          <Copy className="size-3 mr-1" /> Duplicate
        </Button>
        <Button size="sm" variant="destructive" onClick={() => { onDelete(block.id); onDeselect(); }}>
          <Trash2 className="size-3 mr-1" /> Delete
        </Button>
      </div>
    </div>
  );
}

// ─── Preview width map ───────────────────────────────────────────────────────

const PREVIEW_WIDTHS: Record<PreviewMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

// ─── Main BlockEditor ────────────────────────────────────────────────────────

export function BlockEditor({
  content,
  onChange,
  previewMode = "desktop",
}: {
  content: string;
  onChange: (value: string) => void;
  previewMode?: PreviewMode;
}) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseBlocks(content) ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [clipboardBlock, setClipboardBlock] = useState<Block | null>(null);

  const [customPresets, setCustomPresets] = useState<BlockPreset[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('openweb_custom_presets') || '[]');
    } catch {
      return [];
    }
  });
  const [previewPreset, setPreviewPreset] = useState<BlockPreset | null>(null);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [showClearModal, setShowClearModal] = useState(false);

  const history = useUndoRedo<Block[]>(blocks);

  useEffect(() => {
    const incoming = parseBlocks(content) ?? [];
    const currentSerialized = JSON.stringify(blocks);
    const incomingSerialized = JSON.stringify(incoming);
    if (incomingSerialized !== currentSerialized) {
      setBlocks(incoming);
      history.reset(incoming);
      if (selectedId && !incoming.some((b) => b.id === selectedId)) setSelectedId(null);
    }
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const commit = useCallback((next: Block[]) => {
    setBlocks(next);
    history.push(next);
    onChange(JSON.stringify(next));
  }, [onChange, history]);

  // Sync undo/redo state back to blocks + parent
  useEffect(() => {
    const historyBlocks = history.current;
    if (JSON.stringify(historyBlocks) !== JSON.stringify(blocks)) {
      setBlocks(historyBlocks);
      onChange(JSON.stringify(historyBlocks));
    }
  }, [history.current]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUndo = useCallback(() => {
    history.undo();
  }, [history]);

  const handleRedo = useCallback(() => {
    history.redo();
  }, [history]);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z, arrow keys for block navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Undo/Redo
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (mod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (mod && e.key === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Arrow key navigation between blocks
      if (selectedId && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        const target = e.target as HTMLElement;
        // Don't intercept if user is typing in an input/textarea
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

        e.preventDefault();
        const idx = blocks.findIndex((b) => b.id === selectedId);
        if (idx < 0) return;
        if (e.key === "ArrowUp" && idx > 0) {
          setSelectedId(blocks[idx - 1].id);
        } else if (e.key === "ArrowDown" && idx < blocks.length - 1) {
          setSelectedId(blocks[idx + 1].id);
        }
      }

      // Delete block
      if (selectedId && (e.key === "Delete" || e.key === "Backspace") && mod) {
        e.preventDefault();
        deleteBlock(selectedId);
      }

      // Copy block (Ctrl+C when a block is selected and not in an input)
      if (mod && e.key === "c" && selectedId) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        const block = blocks.find((b) => b.id === selectedId);
        if (block) setClipboardBlock(structuredClone(block));
      }

      // Paste block (Ctrl+V when clipboard has a block)
      if (mod && e.key === "v" && clipboardBlock) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        const newBlock = { ...structuredClone(clipboardBlock), id: crypto.randomUUID() } as Block;
        const idx = selectedId ? blocks.findIndex((b) => b.id === selectedId) : blocks.length - 1;
        const insertAt = idx + 1;
        commit([...blocks.slice(0, insertAt), newBlock, ...blocks.slice(insertAt)]);
        setSelectedId(newBlock.id);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, blocks, clipboardBlock, handleUndo, handleRedo]); // eslint-disable-line react-hooks/exhaustive-deps

  const addBlock = (type: BlockType) => {
    const newBlock = defaultBlock(type);
    commit([...blocks, newBlock]);
    setSelectedId(newBlock.id);
  };

  const applyPreset = (preset: BlockPreset) => {
    setPreviewPreset(preset);
  };

  const deleteBlock = (id: string) => {
    if (selectedId === id) setSelectedId(null);

    const removeDeep = (list: Block[]): Block[] => {
      return list.filter(b => b.id !== id).map(b => {
        if (b.type === "row") {
          const cols = structuredClone((b.props as any).columns || []);
          for (let i = 0; i < cols.length; i++) {
            if (cols[i].blocks) {
              cols[i].blocks = removeDeep(cols[i].blocks);
            }
          }
          const legacyBlocks = b.props.blocks ? removeDeep(b.props.blocks) : undefined;
          return { ...b, props: { ...b.props, columns: cols, blocks: legacyBlocks } } as Block;
        } else if (b.type === "columns") {
          const cols = structuredClone((b.props as any).columns || []);
          for (let i = 0; i < cols.length; i++) {
            if (cols[i].blocks) {
              cols[i].blocks = removeDeep(cols[i].blocks);
            }
          }
          return { ...b, props: { ...b.props, columns: cols } } as Block;
        } else if (b.type === "card" || b.type === "alert" || b.type === "section") {
          const childList = (b.props as any).blocks ? removeDeep((b.props as any).blocks) : [];
          return { ...b, props: { ...b.props, blocks: childList } } as Block;
        }
        return b;
      });
    };

    commit(removeDeep(blocks));
  };

  const duplicateBlock = (id: string) => {
    let newId: string | null = null;

    const dupDeep = (list: Block[]): Block[] => {
      const result: Block[] = [];
      for (const b of list) {
        if (b.id === id) {
          result.push(b);
          const dup = { ...structuredClone(b), id: crypto.randomUUID() } as Block;
          newId = dup.id;
          result.push(dup);
        } else {
          if (b.type === "row") {
            const cols = structuredClone((b.props as any).columns || []);
            for (let i = 0; i < cols.length; i++) {
              if (cols[i].blocks) {
                cols[i].blocks = dupDeep(cols[i].blocks);
              }
            }
            const legacyBlocks = b.props.blocks ? dupDeep(b.props.blocks) : undefined;
            result.push({ ...b, props: { ...b.props, columns: cols, blocks: legacyBlocks } } as Block);
          } else if (b.type === "columns") {
            const cols = structuredClone((b.props as any).columns || []);
            for (let i = 0; i < cols.length; i++) {
              if (cols[i].blocks) {
                cols[i].blocks = dupDeep(cols[i].blocks);
              }
            }
            result.push({ ...b, props: { ...b.props, columns: cols } } as Block);
          } else if (b.type === "card" || b.type === "alert" || b.type === "section") {
            const childList = (b.props as any).blocks ? dupDeep((b.props as any).blocks) : [];
            result.push({ ...b, props: { ...b.props, blocks: childList } } as Block);
          } else {
            result.push(b);
          }
        }
      }
      return result;
    };

    const nextBlocks = dupDeep(blocks);
    commit(nextBlocks);
    if (newId) setSelectedId(newId);
  };

  const moveBlockUp = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx <= 0) return;
    commit(arrayMove(blocks, idx, idx - 1));
  };

  const moveBlockDown = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0 || idx >= blocks.length - 1) return;
    commit(arrayMove(blocks, idx, idx + 1));
  };

  const copyBlock = (id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (block) setClipboardBlock(structuredClone(block));
  };

  // ── Nested-container helpers ────────────────────────────────────────────────
  // Recurse into every container (row/columns cells, card/alert/section .blocks)
  // applying `fn` to each block at every depth. Compositions are nested, so all
  // child-mutation handlers route through this.
  const mapTree = (list: Block[], fn: (b: Block) => Block): Block[] =>
    list.map((b) => {
      let nb = fn(b);
      if (nb.type === "row" || nb.type === "columns") {
        const cols = ((nb.props as any).columns || []).map((c: any) =>
          c.blocks ? { ...c, blocks: mapTree(c.blocks, fn) } : c);
        nb = { ...nb, props: { ...nb.props, columns: cols } } as Block;
      } else if (nb.type === "card" || nb.type === "alert" || nb.type === "section") {
        if ((nb.props as any).blocks) {
          nb = { ...nb, props: { ...nb.props, blocks: mapTree((nb.props as any).blocks, fn) } } as Block;
        }
      }
      return nb;
    });

  const getChildList = (b: Block, key: string): Block[] => {
    if (key.startsWith("col-")) {
      const idx = parseInt(key.slice(4), 10);
      return ((b.props as any).columns?.[idx]?.blocks) || [];
    }
    return (b.props as any).blocks || [];
  };
  const setChildList = (b: Block, key: string, list: Block[]): Block => {
    if (key.startsWith("col-")) {
      const idx = parseInt(key.slice(4), 10);
      const cols = structuredClone((b.props as any).columns || []);
      if (cols[idx]) cols[idx].blocks = list;
      return { ...b, props: { ...b.props, columns: cols } } as Block;
    }
    return { ...b, props: { ...b.props, blocks: list } } as Block;
  };

  const onAddChild = (parentId: string, containerKey: string, blockType: string) => {
    if (!BLOCK_REGISTRY.find((r) => r.type === blockType)) return;
    const t = blockType as BlockType;
    const newChild = defaultBlock(t);
    commit(mapTree(blocks, (b) =>
      b.id === parentId ? setChildList(b, containerKey, [...getChildList(b, containerKey), newChild]) : b));
    setSelectedId(newChild.id);
  };

  const onMoveChild = (parentId: string, containerKey: string, childId: string, direction: "up" | "down") => {
    commit(mapTree(blocks, (b) => {
      if (b.id !== parentId) return b;
      const list = [...getChildList(b, containerKey)];
      const i = list.findIndex((c) => c.id === childId);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= list.length) return b;
      [list[i], list[j]] = [list[j], list[i]];
      return setChildList(b, containerKey, list);
    }));
  };

  const onDeleteChild = (parentId: string, containerKey: string, childId: string) => {
    if (selectedId === childId) setSelectedId(null);
    commit(mapTree(blocks, (b) =>
      b.id === parentId
        ? setChildList(b, containerKey, getChildList(b, containerKey).filter((c) => c.id !== childId))
        : b));
  };

  // Every container at any depth — drives the "move to container" dropdown.
  const collectContainers = (list: Block[], depth = 0): { id: string; label: string; containerKey: string }[] => {
    const out: { id: string; label: string; containerKey: string }[] = [];
    const pad = "— ".repeat(depth);
    for (const b of list) {
      if (b.type === "row" || b.type === "columns") {
        const cols = (b.props as any).columns || [];
        cols.forEach((c: any, i: number) => {
          out.push({ id: b.id, label: `${pad}${b.type === "row" ? "Row" : "Columns"} · Column ${i + 1}`, containerKey: `col-${i}` });
          out.push(...collectContainers(c.blocks || [], depth + 1));
        });
      } else if (b.type === "card" || b.type === "alert" || b.type === "section") {
        const label = b.type === "section" ? "Section"
          : b.type === "card" ? `Card: ${(b.props as any).title || "Untitled"}`
          : `Alert: ${(b.props as any).title || "Untitled"}`;
        const key = b.type === "card" ? "card" : b.type === "alert" ? "alert" : "section";
        out.push({ id: b.id, label: pad + label, containerKey: key });
        out.push(...collectContainers((b.props as any).blocks || [], depth + 1));
      }
    }
    return out;
  };
  const availableContainers = [
    { id: "root", label: "Top Level Canvas", containerKey: "root" },
    ...collectContainers(blocks),
  ];

  // Move a block between containers at any depth. sourceContainerKey is "root"
  // or "<parentId>.<key>"; targetContainerKey is "root" or a container key.
  const onMoveBlockBetweenContainers = (sourceId: string, sourceContainerKey: string, targetContainerKey: string, targetParentId?: string) => {
    const found = findBlockDeep(blocks, sourceId);
    if (!found) return;
    const moved = structuredClone(found);
    const [srcParent, ...srcRest] = sourceContainerKey.split(".");
    const srcKey = srcRest.join(".");

    let next = mapTree(blocks, (b) => {
      let nb = b;
      if (sourceContainerKey !== "root" && b.id === srcParent) {
        nb = setChildList(nb, srcKey, getChildList(nb, srcKey).filter((c) => c.id !== sourceId));
      }
      if (targetContainerKey !== "root" && targetParentId && b.id === targetParentId) {
        nb = setChildList(nb, targetContainerKey, [...getChildList(nb, targetContainerKey), moved]);
      }
      return nb;
    });
    if (sourceContainerKey === "root") next = next.filter((b) => b.id !== sourceId);
    if (targetContainerKey === "root") next = [...next, moved];
    commit(next);
    setSelectedId(moved.id);
  };

  // RowBlock column drag-resize (percentage widths).
  const onColumnUpdate = (blockId: string, colIdx1: number, pct1: number, colIdx2: number, pct2: number) => {
    commit(mapTree(blocks, (b) => {
      if (b.id !== blockId) return b;
      const cols = structuredClone((b.props as any).columns || []);
      if (cols[colIdx1] && cols[colIdx2]) {
        cols[colIdx1].customWidth = pct1;
        cols[colIdx2].customWidth = pct2;
      }
      return { ...b, props: { ...b.props, columns: cols } } as Block;
    }));
  };

  // ColumnsBlock grid col/row span drag-resize.
  const onColumnSpanUpdate = (blockId: string, colIdx: number, key: "colSpan" | "rowSpan", value: number) => {
    commit(mapTree(blocks, (b) => {
      if (b.id !== blockId) return b;
      const cols = structuredClone((b.props as any).columns || []);
      if (cols[colIdx]) cols[colIdx][key] = value;
      return { ...b, props: { ...b.props, columns: cols } } as Block;
    }));
  };

  // Convert a monolithic pre-made block into its editable basic-block composition.
  const onBreakApart = (id: string) => {
    const target = findBlockDeep(blocks, id);
    if (!target || !isComposable(target.type)) return;
    const composed = composeBlock(target);
    commit(mapTree(blocks, (b) => (b.id === id ? composed : b)));
    setSelectedId(composed.id);
  };

  const editorProps = {
    isEditMode: true,
    selectedId,
    onSelect: setSelectedId,
    onDelete: deleteBlock,
    onDuplicate: duplicateBlock,
    onMoveUp: moveBlockUp,
    onMoveDown: moveBlockDown,
    onAddChild,
    onMoveChild,
    onDeleteChild,
    onMoveBlockBetweenContainers,
    onColumnUpdate,
    onColumnSpanUpdate,
    onBreakApart,
    availableContainers,
  };

  const pasteBlock = () => {
    if (!clipboardBlock) return;
    const newBlock = { ...structuredClone(clipboardBlock), id: crypto.randomUUID() } as Block;
    const idx = selectedId ? blocks.findIndex((b) => b.id === selectedId) : blocks.length - 1;
    const insertAt = idx + 1;
    commit([...blocks.slice(0, insertAt), newBlock, ...blocks.slice(insertAt)]);
    setSelectedId(newBlock.id);
  };

  const updateBlock = (updated: Block) => {
    const replaceDeep = (list: Block[]): Block[] => {
      return list.map(b => {
        if (b.id === updated.id) {
          return updated;
        }

        if (b.type === "row") {
          const cols = structuredClone((b.props as any).columns || []);
          for (let i = 0; i < cols.length; i++) {
            if (cols[i].blocks) {
              cols[i].blocks = replaceDeep(cols[i].blocks);
            }
          }
          const legacyBlocks = b.props.blocks ? replaceDeep(b.props.blocks) : undefined;
          return { ...b, props: { ...b.props, columns: cols, blocks: legacyBlocks } } as Block;
        } else if (b.type === "columns") {
          const cols = structuredClone((b.props as any).columns || []);
          for (let i = 0; i < cols.length; i++) {
            if (cols[i].blocks) {
              cols[i].blocks = replaceDeep(cols[i].blocks);
            }
          }
          return { ...b, props: { ...b.props, columns: cols } } as Block;
        } else if (b.type === "card" || b.type === "alert" || b.type === "section") {
          const childList = (b.props as any).blocks ? replaceDeep((b.props as any).blocks) : [];
          return { ...b, props: { ...b.props, blocks: childList } } as Block;
        }

        return b;
      });
    };

    commit(replaceDeep(blocks));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setSelectedId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      const oldIdx = blocks.findIndex((b) => b.id === active.id);
      const newIdx = blocks.findIndex((b) => b.id === over.id);
      commit(arrayMove(blocks, oldIdx, newIdx));
    }
  };

  const findBlockDeep = useCallback((list: Block[], targetId: string): Block | null => {
    for (const b of list) {
      if (b.id === targetId) return b;

      if (b.type === "row") {
        const cols = (b.props as any).columns || [];
        for (const col of cols) {
          const found = findBlockDeep(col.blocks || [], targetId);
          if (found) return found;
        }
        if (b.props.blocks) {
          const found = findBlockDeep(b.props.blocks, targetId);
          if (found) return found;
        }
      } else if (b.type === "columns") {
        const cols = (b.props as any).columns || [];
        for (const col of cols) {
          const found = findBlockDeep(col.blocks || [], targetId);
          if (found) return found;
        }
      } else if (b.type === "card" || b.type === "alert" || b.type === "section") {
        const found = findBlockDeep((b.props as any).blocks || [], targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const selectedBlock = selectedId ? findBlockDeep(blocks, selectedId) : null;

  const canvasWidth = PREVIEW_WIDTHS[previewMode];
  const isResponsivePreview = previewMode !== "desktop";

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left palette */}
      <div className={`shrink-0 border-r bg-background motion-safe:transition-all motion-safe:duration-200 overflow-hidden ${paletteOpen ? "w-52" : "w-0"}`}>
        {paletteOpen && (
          <Palette
            onAdd={addBlock}
            onToggle={() => setPaletteOpen(false)}
            onApplyPreset={applyPreset}
            customPresets={customPresets}
            onSaveTemplateClick={() => {
              if (blocks.length === 0) {
                alert("Your current page design is empty. Add some blocks first to create a template.");
                return;
              }
              setNewTemplateName("");
              setNewTemplateDescription("");
              setShowSaveTemplateModal(true);
            }}
          />
        )}
      </div>

      {/* Canvas */}
      <div
        className="flex-1 relative overflow-y-auto bg-neutral-50/50 dark:bg-neutral-900/20"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}
        onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
      >
        {/* Top canvas toolbar */}
        <div className="sticky top-0 z-20 flex items-center gap-1 px-3 py-1.5 bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm">
          {/* Show palette when hidden */}
          {!paletteOpen && (
            <button
              aria-label="Show blocks panel"
              onClick={() => setPaletteOpen(true)}
              className="rounded-lg p-1.5 bg-background border border-border shadow-sm hover:bg-muted transition-colors text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mr-1"
            >
              <PanelLeftOpen className="size-3.5" aria-hidden="true" />
            </button>
          )}

          {/* Undo / Redo */}
          <button
            aria-label="Undo"
            disabled={!history.canUndo}
            onClick={handleUndo}
            className="p-1.5 rounded-lg hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-muted-foreground"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="size-3.5" />
          </button>
          <button
            aria-label="Redo"
            disabled={!history.canRedo}
            onClick={handleRedo}
            className="p-1.5 rounded-lg hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-muted-foreground"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="size-3.5" />
          </button>

          <div className="w-px h-4 bg-neutral-300/60 mx-1" />

          {/* Paste button */}
          <button
            aria-label="Paste block"
            disabled={!clipboardBlock}
            onClick={pasteBlock}
            className="p-1.5 rounded-lg hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-muted-foreground"
            title="Paste copied block (Ctrl+V)"
          >
            <ClipboardPaste className="size-3.5" />
          </button>

          <div className="flex-1" />

          {/* Block count */}
          <span className="text-[10px] text-muted-foreground/60 font-medium">
            {blocks.length} block{blocks.length !== 1 ? "s" : ""}
          </span>

          {/* Clear Design Button */}
          <button
            aria-label="Clear design"
            disabled={blocks.length === 0}
            onClick={() => setShowClearModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-destructive/20 ml-2"
            title="Clear all blocks"
          >
            <Trash2 className="size-3.5" />
            <span>Clear Design</span>
          </button>
        </div>

        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-muted-foreground py-20 px-4">
            <div className="size-14 rounded-2xl bg-white border border-border/60 flex items-center justify-center shadow-sm mb-1">
              <LayoutTemplate className="size-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium">No blocks yet</p>
            <p className="text-xs max-w-[200px]">
              {paletteOpen
                ? "Pick a block type from the left panel"
                : "Open the blocks panel to get started"}
            </p>
          </div>
        ) : (
          <div className={`${isResponsivePreview ? "flex justify-center py-4" : ""}`}>
            <div
              style={isResponsivePreview ? { width: canvasWidth, maxWidth: "100%" } : undefined}
              className={isResponsivePreview ? "shadow-lg rounded-lg overflow-hidden border border-neutral-200" : ""}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="min-h-full bg-white shadow-[0_2px_20px_rgba(0,0,0,0.07)]">
                    {blocks.map((block, index) => (
                      <SortableVisualBlock
                        key={block.id}
                        block={block}
                        index={index}
                        total={blocks.length}
                        isSelected={selectedId === block.id}
                        onSelect={setSelectedId}
                        onDelete={deleteBlock}
                        onDuplicate={duplicateBlock}
                        onMoveUp={moveBlockUp}
                        onMoveDown={moveBlockDown}
                        onCopy={copyBlock}
                        editorProps={editorProps}
                      />
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {activeId ? (
                    <DragOverlayCard block={blocks.find((b) => b.id === activeId)!} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        )}
      </div>

      {/* Right properties panel */}
      <div className={`shrink-0 motion-safe:transition-all motion-safe:duration-200 overflow-hidden ${selectedBlock ? "w-72" : "w-0"}`}>
        {selectedBlock && (
          <PropertiesPanel
            block={selectedBlock}
            onChange={updateBlock}
            onDelete={deleteBlock}
            onDuplicate={duplicateBlock}
            onDeselect={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* Template Preview Modal */}
      {previewPreset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border/60 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between bg-muted/30">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">Template Preview</span>
                  <h3 className="text-lg font-bold text-foreground">{previewPreset.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{previewPreset.description}</p>
              </div>
              <button onClick={() => setPreviewPreset(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <div className="bg-destructive/10 border-y border-destructive/20 px-6 py-3 flex items-center gap-3 text-destructive">
              <AlertTriangle className="size-5 shrink-0" />
              <div className="text-xs font-semibold leading-relaxed">
                Alert: Applying this template will delete everything in the current design of your page and replace it with the template blocks.
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-neutral-50/50 dark:bg-neutral-900/20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
              <div className="max-w-5xl mx-auto bg-background rounded-xl border shadow-lg overflow-hidden pointer-events-none origin-top scale-[0.85] mb-8">
                <BlockRenderer content={JSON.stringify(createPresetBlocks(previewPreset))} />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border/40 flex items-center justify-end gap-3 bg-muted/30">
              <Button variant="outline" onClick={() => setPreviewPreset(null)}>Cancel</Button>
              <Button
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25"
                onClick={() => {
                  const presetBlocks = createPresetBlocks(previewPreset);
                  commit(presetBlocks);
                  if (presetBlocks.length > 0) setSelectedId(presetBlocks[0].id);
                  setPreviewPreset(null);
                }}
              >
                Yes, Apply Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border/60 rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between bg-muted/30">
              <h3 className="text-base font-bold text-foreground">Save as Custom Template</h3>
              <button onClick={() => setShowSaveTemplateModal(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Template Name</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g. My Custom Landing"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Description</label>
                <textarea
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="e.g. Hero, 3-col features, contact form"
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border/40 flex items-center justify-end gap-3 bg-muted/30">
              <Button variant="outline" onClick={() => setShowSaveTemplateModal(false)}>Cancel</Button>
              <Button
                variant="default"
                disabled={!newTemplateName.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 disabled:opacity-50"
                onClick={() => {
                  const newPreset: BlockPreset = {
                    id: crypto.randomUUID(),
                    name: newTemplateName.trim(),
                    description: newTemplateDescription.trim() || `${blocks.length} custom blocks`,
                    blocks: blocks.map((b) => b.type),
                    savedBlocks: structuredClone(blocks),
                  };
                  const updated = [newPreset, ...customPresets];
                  setCustomPresets(updated);
                  localStorage.setItem('openweb_custom_presets', JSON.stringify(updated));
                  setShowSaveTemplateModal(false);
                }}
              >
                Save Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border/60 rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between bg-destructive/10 text-destructive">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5" />
                <h3 className="text-base font-bold">Clear Whole Design?</h3>
              </div>
              <button onClick={() => setShowClearModal(false)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-6 text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to clear the whole design? This will remove all {blocks.length} blocks from the page. This action can be undone using the undo button.
            </div>

            <div className="px-6 py-4 border-t border-border/40 flex items-center justify-end gap-3 bg-muted/30">
              <Button variant="outline" onClick={() => setShowClearModal(false)}>Cancel</Button>
              <Button
                variant="destructive"
                className="bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/25"
                onClick={() => {
                  commit([]);
                  setSelectedId(null);
                  setShowClearModal(false);
                }}
              >
                Yes, Clear Design
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
