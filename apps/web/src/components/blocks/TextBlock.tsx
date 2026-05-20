import type { TextBlockProps } from "@/lib/blocks";

export function TextBlock({ props }: { props: TextBlockProps }) {
  const { content, align } = props;
  const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  return (
    <div className="w-full px-4">
      <div className={`max-w-3xl mx-auto prose prose-neutral max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 ${alignClass}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
