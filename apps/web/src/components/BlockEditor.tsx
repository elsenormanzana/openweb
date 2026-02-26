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
import { renderBlock } from "@/components/BlockRenderer";
import { BlockPropsForm } from "@/components/BlockForms";
import { Button } from "@/components/ui/button";
import {
  GripVertical, Trash2, Copy, LayoutTemplate, X, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";

// ─── Palette ─────────────────────────────────────────────────────────────────

const CATEGORIES: { name: BlockCategory; label: string }[] = [
  { name: "Layout", label: "Layout" },
  { name: "Content", label: "Content" },
  { name: "Basic", label: "Basic" },
];

function Palette({ onAdd, onToggle }: { onAdd: (type: BlockType) => void; onToggle: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b shrink-0 flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blocks</p>
        <button
          aria-label="Hide blocks panel"
          onClick={onToggle}
          className="rounded-lg p-1 hover:bg-muted transition-colors text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PanelLeftClose className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2 space-y-4 px-2">
        {CATEGORIES.map(({ name, label }) => {
          const entries = BLOCK_REGISTRY.filter((r) => r.category === name);
          return (
            <div key={name}>
              <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">{label}</p>
              {entries.map((entry) => {
                const EntryIcon = entry.Icon;
                return (
                  <button
                    key={entry.type}
                    onClick={() => onAdd(entry.type)}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-sm hover:bg-muted text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
    </div>
  );
}

// ─── Sortable visual block ────────────────────────────────────────────────────

function SortableVisualBlock({
  block,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  block: Block;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
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
      {/* Rendered block — non-interactive in edit mode */}
      <div className="pointer-events-none select-none">
        {renderBlock(block)}
      </div>

      {/* Selection / hover ring */}
      <div
        className={`absolute inset-0 pointer-events-none border-2 transition-all rounded-sm ${
          isSelected
            ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
            : "border-transparent group-hover:border-blue-300/70"
        }`}
      />

      {/* Floating toolbar */}
      <div
        className={`absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 rounded-full
          text-white text-xs px-1.5 py-1 transition-all pointer-events-auto
          border border-white/10 shadow-xl backdrop-blur-sm
          ${isSelected
            ? "bg-neutral-900/95 opacity-100"
            : "bg-neutral-900/90 opacity-0 group-hover:opacity-100"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          {...listeners}
          {...attributes}
          aria-label="Drag to reorder block"
          className="p-1 rounded-full cursor-grab hover:bg-white/15 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
        >
          <GripVertical className="size-3" aria-hidden="true" />
        </button>

        <span className="px-1.5 font-medium whitespace-nowrap flex items-center gap-1 opacity-80">
          {entry && <entry.Icon className="size-3" />}
          {entry?.label}
        </span>

        <button
          aria-label="Duplicate block"
          onClick={() => onDuplicate(block.id)}
          className="p-1 rounded-full hover:bg-white/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
        >
          <Copy className="size-3" aria-hidden="true" />
        </button>

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

// ─── Drag overlay ─────────────────────────────────────────────────────────────

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

// ─── Properties panel ─────────────────────────────────────────────────────────

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

// ─── Main BlockEditor ─────────────────────────────────────────────────────────

export function BlockEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (value: string) => void;
}) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseBlocks(content) ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);

  useEffect(() => {
    const incoming = parseBlocks(content) ?? [];
    const currentSerialized = JSON.stringify(blocks);
    const incomingSerialized = JSON.stringify(incoming);
    if (incomingSerialized !== currentSerialized) {
      setBlocks(incoming);
      if (selectedId && !incoming.some((b) => b.id === selectedId)) setSelectedId(null);
    }
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const commit = useCallback((next: Block[]) => {
    setBlocks(next);
    onChange(JSON.stringify(next));
  }, [onChange]);

  const addBlock = (type: BlockType) => {
    const newBlock = defaultBlock(type);
    const next = [...blocks, newBlock];
    commit(next);
    setSelectedId(newBlock.id);
  };

  const deleteBlock = (id: string) => {
    if (selectedId === id) setSelectedId(null);
    commit(blocks.filter((b) => b.id !== id));
  };

  const duplicateBlock = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const dup = { ...blocks[idx], id: crypto.randomUUID() } as Block;
    commit([...blocks.slice(0, idx + 1), dup, ...blocks.slice(idx + 1)]);
    setSelectedId(dup.id);
  };

  const updateBlock = (updated: Block) => {
    commit(blocks.map((b) => b.id === updated.id ? updated : b));
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

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left palette */}
      <div className={`shrink-0 border-r bg-background motion-safe:transition-all motion-safe:duration-200 overflow-hidden ${paletteOpen ? "w-52" : "w-0"}`}>
        {paletteOpen && <Palette onAdd={addBlock} onToggle={() => setPaletteOpen(false)} />}
      </div>

      {/* Canvas */}
      <div
        className="flex-1 relative overflow-y-auto bg-neutral-100"
        onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
      >
        {/* Show palette when hidden */}
        {!paletteOpen && (
          <button
            aria-label="Show blocks panel"
            onClick={() => setPaletteOpen(true)}
            className="absolute top-3 left-3 z-20 rounded-lg p-1.5 bg-background border border-border shadow-sm hover:bg-muted transition-colors text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PanelLeftOpen className="size-4" aria-hidden="true" />
          </button>
        )}

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="min-h-full bg-white shadow-[0_2px_20px_rgba(0,0,0,0.07)]">
                {blocks.map((block) => (
                  <SortableVisualBlock
                    key={block.id}
                    block={block}
                    isSelected={selectedId === block.id}
                    onSelect={setSelectedId}
                    onDelete={deleteBlock}
                    onDuplicate={duplicateBlock}
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
    </div>
  );
}
