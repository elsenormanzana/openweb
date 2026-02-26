import type { HeadingBlockProps } from "@/lib/blocks";

const SIZE: Record<HeadingBlockProps["level"], string> = {
  h1: "text-5xl md:text-6xl",
  h2: "text-4xl md:text-5xl",
  h3: "text-3xl md:text-4xl",
  h4: "text-2xl md:text-3xl",
  h5: "text-xl md:text-2xl",
  h6: "text-lg md:text-xl",
};

const ALIGN: Record<HeadingBlockProps["align"], string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function HeadingBlock({ props }: { props: HeadingBlockProps }) {
  const { text, level, align, color } = props;
  const Tag = level;

  return (
    <div className="w-full px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <Tag
          className={`font-bold leading-tight ${SIZE[level]} ${ALIGN[align]}`}
          style={color ? { color } : undefined}
        >
          {text}
        </Tag>
      </div>
    </div>
  );
}
