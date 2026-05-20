import type { Block } from "./blocks";

// Re-export the core block types so consumers (e.g. BlockRenderer) can pull
// types + parseBlocks from this lightweight module. The import above is
// type-only and fully erased at build time, so this module has zero runtime
// dependencies — it never drags in BLOCK_REGISTRY or its lucide-react icons.
export type { Block, BlockType, BlockMeta } from "./blocks";

/** Parse a page's stored JSON content into a Block[] — or null for legacy HTML. */
export function parseBlocks(content: string | null): Block[] | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.every((b) => b.id && b.type && b.props !== undefined)) {
      return parsed as Block[];
    }
  } catch {
    // fall through
  }
  return null;
}
