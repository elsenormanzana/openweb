import type { SpacerBlockProps } from "@/lib/blocks";

export function SpacerBlock({ props }: { props: SpacerBlockProps }) {
  return <div style={{ height: props.height }} aria-hidden="true" />;
}
