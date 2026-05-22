// Turns a monolithic "pre-made" block into an editable composition of basic
// blocks (a `section` containing heading/text/button/columns/card/icon/list…).
// Used by the palette (on a default block) and by the "Break into editable
// blocks" editor action (on a real block). "Good enough", not pixel-perfect —
// the author now owns the layout.
import { defaultBlock, type Block, type BlockType } from "@/lib/blocks";

/** The 12 standard content blocks that can be decomposed. */
export const COMPOSABLE_TYPES = new Set<BlockType>([
  "hero", "cta", "features", "pricing", "testimonials", "faq", "stats",
  "bio-cards", "logo-cloud", "slideshow", "newsletter", "contact",
]);

export function isComposable(type: BlockType): boolean {
  return COMPOSABLE_TYPES.has(type);
}

// ── builders ──────────────────────────────────────────────────────────────────

type Props = Record<string, unknown>;
const uid = () => crypto.randomUUID();
const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clampInt = (n: number, lo: number, hi: number) => Math.min(Math.max(Math.round(n), lo), hi);

/** Fresh block of `type` with prop overrides merged onto its registry defaults. */
function mk(type: BlockType, overrides: Props = {}): Block {
  const b = defaultBlock(type); // already has a fresh crypto.randomUUID()
  return { ...b, props: { ...(b.props as Props), ...overrides } } as Block;
}

const heading = (text: string, level: string, align = "left") =>
  mk("heading", { text, level, align, color: "" });
const para = (html: string, align = "left") => mk("text", { content: html, align });
const richText = (plain: string, align = "left") => para(`<p>${esc(plain)}</p>`, align);

function buttonFromCta(cta: Props | undefined, align: string): Block | null {
  if (!cta || !cta.label) return null;
  return mk("button", {
    label: cta.label, href: cta.href || "#",
    variant: cta.variant || "solid", align, size: cta.size || "md",
    color: cta.color || "", textColor: cta.textColor || "",
    borderRadius: cta.borderRadius || "md",
    icon: cta.icon || "", emoji: cta.emoji || "", iconPosition: cta.iconPosition || "left",
  });
}

const cell = (blocks: Block[], colSpan = 1, rowSpan = 1) =>
  ({ id: uid(), colSpan, rowSpan, content: "", blocks });

function columns(gridColumns: number, cells: ReturnType<typeof cell>[]): Block {
  return mk("columns", {
    columns: cells, gridColumns: clampInt(gridColumns, 1, 6), gap: "md", paddingY: "sm", bgColor: "",
  });
}

function card(blocks: Block[]): Block {
  return mk("card", { title: "", subtitle: "", image: "", blocks });
}

function section(overrides: Props, blocks: Block[]): Block {
  return mk("section", { ...overrides, blocks });
}

/** Two CTAs → a 2-track columns row of buttons; one → the button alone; none → []. */
function ctaRow(primary: Props | undefined, secondary: Props | undefined, align: string): Block[] {
  const btns = [buttonFromCta(primary, align), buttonFromCta(secondary, align)].filter(Boolean) as Block[];
  if (btns.length === 0) return [];
  if (btns.length === 1) return [btns[0]];
  return [columns(2, btns.map((b) => cell([b])))];
}

// ── decomposition ─────────────────────────────────────────────────────────────

function buildComposition(block: Block): Block | null {
  const p = block.props as Props;
  const items = (Array.isArray(p.items) ? p.items : []) as Props[];

  switch (block.type) {
    case "hero": {
      const align = p.align === "center" ? "center" : "left";
      return section(
        {
          backgroundColor: p.backgroundColor || "",
          backgroundImage: p.backgroundType === "image" ? (p.backgroundImage || "") : "",
          paddingY: "xl", align, textColor: p.textColor === "light" ? "light" : "auto",
        },
        [
          ...(p.badgeText ? [richText(`<strong>${esc(p.badgeText)}</strong>`, align)] : []),
          ...(p.heading ? [heading(String(p.heading), "h1", align)] : []),
          ...(p.subheading ? [richText(String(p.subheading), align)] : []),
          ...(p.description ? [richText(String(p.description), align)] : []),
          ...ctaRow(p.primaryCta as Props, p.secondaryCta as Props, align),
        ],
      );
    }
    case "cta":
      return section(
        { backgroundColor: p.backgroundColor || "", align: "center", paddingY: "lg",
          textColor: p.textColor === "light" ? "light" : "auto" },
        [
          ...(p.heading ? [heading(String(p.heading), "h2", "center")] : []),
          ...(p.description ? [richText(String(p.description), "center")] : []),
          ...ctaRow(p.primaryCta as Props, p.secondaryCta as Props, "center"),
        ],
      );
    case "features":
      return section({ paddingY: "lg", align: "center" }, [
        ...(p.heading ? [heading(String(p.heading), "h2", "center")] : []),
        ...(p.subheading ? [richText(String(p.subheading), "center")] : []),
        columns(Number(p.columns) || 3, items.map((it) => cell([
          mk("icon", { icon: it.icon || "sparkles", size: "lg", align: "center" }),
          heading(String(it.title || ""), "h3", "center"),
          richText(String(it.description || ""), "center"),
        ]))),
      ]);
    case "pricing": {
      const tiers = (Array.isArray(p.tiers) ? p.tiers : []) as Props[];
      return section({ paddingY: "lg", align: "center" }, [
        ...(p.heading ? [heading(String(p.heading), "h2", "center")] : []),
        ...(p.subheading ? [richText(String(p.subheading), "center")] : []),
        columns(tiers.length || 3, tiers.map((t) => cell([card([
          richText(`<strong>${esc(t.name)}</strong>`),
          heading(`${esc(t.price)}${t.period ? ` <span>${esc(t.period)}</span>` : ""}`, "h2"),
          ...(t.description ? [richText(String(t.description))] : []),
          mk("list", { items: Array.isArray(t.features) ? t.features : [], marker: "check" }),
          ...(buttonFromCta(t.cta as Props, "full") ? [buttonFromCta(t.cta as Props, "full")!] : []),
        ])]))),
      ]);
    }
    case "testimonials":
      return section({ paddingY: "lg", align: "center" }, [
        ...(p.heading ? [heading(String(p.heading), "h2", "center")] : []),
        columns(Math.min(items.length || 3, 3), items.map((it) => cell([card([
          richText(`"${esc(it.quote)}"`),
          ...(it.avatar ? [mk("image", { src: it.avatar, alt: String(it.name || ""), width: "contained" })] : []),
          heading(String(it.name || ""), "h4"),
          richText([it.role, it.company].filter(Boolean).join(", ")),
        ])]))),
      ]);
    case "faq":
      return section({ paddingY: "lg", align: "center" }, [
        ...(p.heading ? [heading(String(p.heading), "h2", "center")] : []),
        // The accordion is interactive — keep it whole, with its own heading blanked.
        mk("accordion", { heading: "", items: items.length ? items : p.items }),
      ]);
    case "stats":
      return section({ backgroundColor: "#0f172a", textColor: "light", paddingY: "lg", align: "center" }, [
        ...(p.heading ? [heading(String(p.heading), "h2", "center")] : []),
        columns(Math.min(items.length || 3, 4), items.map((it) => cell([
          heading(String(it.value || ""), "h2", "center"),
          heading(String(it.label || ""), "h4", "center"),
          ...(it.description ? [richText(String(it.description), "center")] : []),
        ]))),
      ]);
    case "bio-cards":
      return section({ paddingY: "lg", align: "center" }, [
        ...(p.heading ? [heading(String(p.heading), "h2", "center")] : []),
        ...(p.subheading ? [richText(String(p.subheading), "center")] : []),
        columns(Math.min(items.length || 3, 3), items.map((it) => cell([card([
          ...(it.avatar ? [mk("image", { src: it.avatar, alt: String(it.name || ""), width: "contained" })] : []),
          heading(String(it.name || ""), "h4"),
          richText(String(it.role || "")),
          ...(it.bio ? [richText(String(it.bio))] : []),
        ])]))),
      ]);
    case "logo-cloud": {
      const logos = (Array.isArray(p.logos) ? p.logos : []) as Props[];
      return section({ paddingY: "md", align: "center" }, [
        ...(p.heading ? [heading(String(p.heading), "h4", "center")] : []),
        ...(p.subheading ? [richText(String(p.subheading), "center")] : []),
        columns(Math.min(logos.length || 4, 6), logos.map((lg) => cell([
          lg.url
            ? mk("image", { src: lg.url, alt: String(lg.name || ""), width: "contained" })
            : richText(String(lg.name || ""), "center"),
        ]))),
      ]);
    }
    case "slideshow":
      return section({ paddingY: "lg", align: "center" }, [
        ...(p.heading ? [heading(String(p.heading), "h2", "center")] : []),
        ...(p.subheading ? [richText(String(p.subheading), "center")] : []),
        // The carousel is interactive — keep it whole.
        mk("slideshow", { items: p.items, heading: "", subheading: "" }),
      ]);
    case "newsletter":
      return section(
        { backgroundColor: p.backgroundColor || "", paddingY: "lg",
          align: p.align === "center" ? "center" : "left",
          textColor: p.textColor === "light" ? "light" : "auto" },
        [
          ...(p.heading ? [heading(String(p.heading), "h2", p.align === "center" ? "center" : "left")] : []),
          ...(p.description ? [richText(String(p.description), p.align === "center" ? "center" : "left")] : []),
          // The form is interactive — keep it whole, heading/description blanked.
          mk("newsletter", { ...p, heading: "", description: "" }),
        ],
      );
    case "contact":
      return section({ backgroundColor: p.backgroundColor || "", paddingY: "lg" }, [
        ...(p.heading ? [heading(String(p.heading), "h2")] : []),
        ...(p.subheading ? [richText(String(p.subheading))] : []),
        columns(2, [
          cell([
            ...(p.email ? [richText(`<strong>Email:</strong> ${esc(p.email)}`)] : []),
            ...(p.phone ? [richText(`<strong>Phone:</strong> ${esc(p.phone)}`)] : []),
            ...(p.address ? [richText(`<strong>Address:</strong> ${esc(p.address)}`)] : []),
          ]),
          // The native form is interactive — keep a contact block for it.
          cell([mk("contact", { ...p, heading: "", subheading: "", email: "", phone: "", address: "" })]),
        ]),
      ]);
    default:
      return null;
  }
}

/** Decompose a composable block into a `section` tree; non-composable → unchanged. */
export function composeBlock(block: Block): Block {
  const composed = buildComposition(block);
  if (!composed) return block;
  if (block.meta) composed.meta = structuredClone(block.meta);
  return composed;
}
