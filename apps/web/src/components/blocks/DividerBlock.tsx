import type { DividerBlockProps } from "@/lib/blocks";

export function DividerBlock({ props }: { props: DividerBlockProps }) {
  const { style, color, paddingY } = props;

  if (style === "none") {
    return <div style={{ height: paddingY * 2 }} aria-hidden="true" />;
  }

  return (
    <div className="w-full px-4" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
      <div className="max-w-5xl mx-auto">
        <hr
          style={{
            borderColor: color || "#e5e7eb",
            borderTopStyle: style,
          }}
          className="border-t"
        />
      </div>
    </div>
  );
}
