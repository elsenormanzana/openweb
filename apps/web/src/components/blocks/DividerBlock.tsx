import { useContext } from "react";
import type { DividerBlockProps } from "@/lib/blocks";
import { NestedBlockContext } from "@/components/BlockRenderer";

export function DividerBlock({ props }: { props: DividerBlockProps }) {
  const { style, color, paddingY } = props;
  const isNested = useContext(NestedBlockContext);

  if (style === "none") {
    return <div style={{ height: paddingY * 2 }} aria-hidden="true" />;
  }

  const element = (
    <hr
      style={{
        borderColor: color || "#e5e7eb",
        borderTopStyle: style,
      }}
      className="border-t"
    />
  );

  if (isNested) {
    return (
      <div style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        {element}
      </div>
    );
  }

  return (
    <div className="w-full px-4" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
      <div className="max-w-5xl mx-auto">
        {element}
      </div>
    </div>
  );
}
