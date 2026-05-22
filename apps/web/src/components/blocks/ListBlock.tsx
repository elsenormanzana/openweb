import { useContext } from "react";
import { Check } from "lucide-react";
import type { ListBlockProps } from "@/lib/blocks";
import { NestedBlockContext } from "@/components/BlockRenderer";

export function ListBlock({ props }: { props: ListBlockProps }) {
  const { items, ordered, marker, iconColor, align } = props;
  const isNumbered = ordered || marker === "number";
  const wrapAlign = align === "center" ? "items-center text-center" : "items-start text-left";
  const isNested = useContext(NestedBlockContext);

  if (isNumbered) {
    const listEl = (
      <ol className="flex flex-col gap-2 list-decimal pl-5 text-gray-700 dark:text-neutral-300">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ol>
    );

    if (isNested) {
      return listEl;
    }

    return (
      <div className="w-full px-4">
        <div className="max-w-3xl mx-auto">
          {listEl}
        </div>
      </div>
    );
  }

  const listEl = (
    <ul className={`flex flex-col gap-2 ${wrapAlign}`}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-neutral-300">
          {marker === "check" && (
            <Check className="size-4 mt-0.5 shrink-0" style={{ color: iconColor || "#16a34a" }} />
          )}
          {marker === "dot" && (
            <span className="mt-2 size-1.5 rounded-full shrink-0" style={{ backgroundColor: iconColor || "currentColor" }} />
          )}
          {marker === "dash" && <span className="shrink-0">–</span>}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );

  if (isNested) {
    return listEl;
  }

  return (
    <div className="w-full px-4">
      <div className="max-w-3xl mx-auto">
        {listEl}
      </div>
    </div>
  );
}
