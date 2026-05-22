import { useContext } from "react";
import type { IconBlockProps } from "@/lib/blocks";
import { IconRenderer } from "@/components/shared/IconRenderer";
import { NestedBlockContext } from "@/components/BlockRenderer";

const SIZE: Record<IconBlockProps["size"], string> = {
  sm: "size-6", md: "size-9", lg: "size-12", xl: "size-16",
};
const ALIGN: Record<IconBlockProps["align"], string> = {
  left: "justify-start", center: "justify-center", right: "justify-end",
};

export function IconBlock({ props }: { props: IconBlockProps }) {
  const isNested = useContext(NestedBlockContext);

  const element = (
    <IconRenderer
      icon={props.icon}
      className={SIZE[props.size]}
      style={props.color ? { color: props.color } : undefined}
    />
  );

  if (isNested) {
    return (
      <div className={`flex ${ALIGN[props.align]}`}>
        {element}
      </div>
    );
  }

  return (
    <div className={`w-full px-4 flex ${ALIGN[props.align]}`}>
      {element}
    </div>
  );
}
