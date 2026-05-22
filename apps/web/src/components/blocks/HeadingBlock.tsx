import { useContext } from "react";
import type { HeadingBlockProps } from "@/lib/blocks";
import { NestedBlockContext } from "@/components/BlockRenderer";

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
  const isNested = useContext(NestedBlockContext);

  const element = (
    <Tag
      className={`font-bold leading-tight ${SIZE[level]} ${ALIGN[align]}`}
      style={color ? { color } : undefined}
    >
      {text}
    </Tag>
  );

  if (isNested) {
    return element;
  }

  return (
    <div className="w-full px-4">
      <div className="max-w-5xl mx-auto">
        {element}
      </div>
    </div>
  );
}
