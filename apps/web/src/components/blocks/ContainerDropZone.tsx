import { ChevronUp, ChevronDown, Trash2, GripVertical, FolderTree, Sparkles } from "lucide-react";
import { renderBlock, NestedBlockContext } from "@/components/BlockRenderer";
import { BLOCK_REGISTRY } from "@/lib/blocks";

export function ContainerDropZone({
  blockId,
  containerKey,
  blocks = [],
  editorProps,
  label,
  fallbackContent,
}: {
  blockId: string;
  containerKey: string;
  blocks?: any[];
  editorProps?: any;
  label: string;
  fallbackContent?: string;
}) {
  if (!editorProps?.isEditMode) {
    if (blocks.length === 0 && fallbackContent) {
      return (
        <div
          className="prose prose-neutral max-w-none"
          dangerouslySetInnerHTML={{ __html: fallbackContent }}
        />
      );
    }
    return (
      <NestedBlockContext.Provider value={true}>
        <div className="flex flex-col gap-6 w-full">
          {blocks.map((b) => renderBlock(b, editorProps))}
        </div>
      </NestedBlockContext.Provider>
    );
  }

  const availableContainers = editorProps?.availableContainers || [];

  return (
    <div
      className="border-2 border-dashed border-blue-400/70 rounded-xl p-3.5 bg-gradient-to-b from-blue-50/40 to-indigo-50/40 hover:from-blue-50/70 hover:to-indigo-50/70 transition-all min-h-[140px] flex flex-col gap-3 pointer-events-auto my-2 shadow-inner group/zone"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const rawData = e.dataTransfer.getData("text/plain");
        if (!rawData) return;

        try {
          const data = JSON.parse(rawData);
          if (data.sourceId && editorProps.onMoveBlockBetweenContainers) {
            editorProps.onMoveBlockBetweenContainers(data.sourceId, data.sourceContainer, containerKey, blockId);
            return;
          }
        } catch {
          if (editorProps.onAddChild) {
            editorProps.onAddChild(blockId, containerKey, rawData);
          }
        }
      }}
    >
      <div className="flex items-center justify-between border-b border-blue-200/80 pb-2 mb-1">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-blue-600 animate-pulse" /> {label}
        </span>
        <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200 shadow-sm">
          Drag &amp; Drop blocks here
        </span>
      </div>

      {blocks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-blue-200 rounded-lg bg-white/60 p-6 text-center shadow-sm">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            No blocks in {label} yet.<br />Drag from palette or use the menu below.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {blocks.map((childBlock, childIndex) => (
            <div
              key={childBlock.id}
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData("text/plain", JSON.stringify({ sourceId: childBlock.id, sourceContainer: `${blockId}.${containerKey}` }));
              }}
              className={`group/child relative border rounded-xl p-3.5 bg-white shadow-sm transition-all ${
                editorProps.selectedId === childBlock.id ? "border-blue-500 ring-2 ring-blue-500 shadow-md" : "border-slate-200 hover:border-blue-400"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                editorProps.onSelect(childBlock.id);
              }}
            >
              {/* Child block mini toolbar */}
              <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-slate-900/95 text-white rounded-lg px-2 py-1 opacity-0 group-hover/child:opacity-100 transition-all shadow-xl backdrop-blur-md border border-slate-700">
                <div className="flex items-center gap-1 mr-1 pr-1 border-r border-slate-700 text-slate-400 cursor-grab active:cursor-grabbing" title="Drag Block">
                  <GripVertical className="size-3.5" />
                </div>
                
                {/* Move to Container Dropdown */}
                {availableContainers.length > 0 && (
                  <div className="relative group/move flex items-center">
                    <button className="p-1 hover:bg-white/20 rounded transition-colors flex items-center gap-1 text-[10px] font-medium text-blue-300" title="Move to another container or top level">
                      <FolderTree className="size-3.5" /> Move
                    </button>
                    <select
                      value=""
                      onChange={(e) => {
                        e.stopPropagation();
                        if (!e.target.value || !editorProps.onMoveBlockBetweenContainers) return;
                        const [destId, ...rest] = e.target.value.split(".");
                        const destKey = rest.join(".");
                        editorProps.onMoveBlockBetweenContainers(childBlock.id, `${blockId}.${containerKey}`, destKey, destId === "root" ? undefined : destId);
                        e.target.value = "";
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
                    >
                      <option value="">Move block to...</option>
                      {availableContainers.map((c: any) => (
                        <option key={`${c.id}.${c.containerKey}`} value={`${c.id}.${c.containerKey}`}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  disabled={childIndex === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    editorProps.onMoveChild(blockId, containerKey, childBlock.id, "up");
                  }}
                  className="p-1 hover:bg-white/20 rounded disabled:opacity-30 transition-colors"
                  title="Move Up"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  disabled={childIndex === blocks.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    editorProps.onMoveChild(blockId, containerKey, childBlock.id, "down");
                  }}
                  className="p-1 hover:bg-white/20 rounded disabled:opacity-30 transition-colors"
                  title="Move Down"
                >
                  <ChevronDown className="size-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    editorProps.onDeleteChild(blockId, containerKey, childBlock.id);
                  }}
                  className="p-1 hover:bg-red-500/90 rounded transition-colors ml-0.5"
                  title="Delete"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {/* Child block content (fully interactable) */}
              <div className="pointer-events-auto">
                <NestedBlockContext.Provider value={true}>
                  {renderBlock(childBlock, editorProps)}
                </NestedBlockContext.Provider>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Add Dropdown */}
      <div className="pt-2.5 border-t border-blue-200/80 mt-auto flex items-center justify-between">
        <select
          value=""
          onChange={(e) => {
            if (e.target.value && editorProps.onAddChild) {
              editorProps.onAddChild(blockId, containerKey, e.target.value);
              e.target.value = "";
            }
          }}
          className="text-xs bg-white border border-blue-300 rounded-lg px-3 py-2 text-blue-800 font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full transition hover:bg-blue-50/50"
        >
          <option value="">+ Add Block to {label}...</option>
          {BLOCK_REGISTRY.map((r) => (
            <option key={r.type} value={r.type}>
              {r.label} ({r.category})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
