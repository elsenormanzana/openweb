import type { TextBlockProps } from "@/lib/blocks";

export function TextBlock({ props }: { props: TextBlockProps }) {
  const { content, align } = props;
  const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  return (
    <section className="w-full py-12 px-4">
      <div className={`max-w-3xl mx-auto prose prose-neutral max-w-none ${alignClass}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </section>
  );
}
