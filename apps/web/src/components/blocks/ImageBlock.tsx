import { useContext } from "react";
import type { ImageBlockProps } from "@/lib/blocks";
import { NestedBlockContext } from "@/components/BlockRenderer";

export function ImageBlock({ props }: { props: ImageBlockProps }) {
  const { src, alt, width, caption } = props;
  const isNested = useContext(NestedBlockContext);

  if (!src) {
    const emptyState = (
      <div className="w-full rounded-xl bg-gray-100 dark:bg-neutral-800 border-2 border-dashed border-gray-300 dark:border-neutral-700 h-48 flex items-center justify-center text-gray-400 dark:text-neutral-500 text-sm">
        No image selected
      </div>
    );
    if (isNested) return emptyState;
    return (
      <div className="w-full py-12 px-4">
        <div className={width === "full" ? "w-full" : "max-w-3xl mx-auto"}>
          {emptyState}
        </div>
      </div>
    );
  }

  const element = (
    <figure className="w-full">
      <img src={src} alt={alt} loading="lazy" decoding="async" className="w-full h-auto rounded-xl object-cover" />
      {caption && <figcaption className="mt-3 text-center text-sm text-gray-500">{caption}</figcaption>}
    </figure>
  );

  if (isNested) {
    return element;
  }

  return (
    <div className="w-full py-12 px-4">
      <div className={width === "full" ? "w-full" : "max-w-3xl mx-auto"}>
        {element}
      </div>
    </div>
  );
}
