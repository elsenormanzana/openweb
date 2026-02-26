import type { ImageBlockProps } from "@/lib/blocks";

export function ImageBlock({ props }: { props: ImageBlockProps }) {
  const { src, alt, width, caption } = props;

  if (!src) {
    return (
      <div className="w-full py-12 px-4">
        <div className={`${width === "full" ? "w-full" : "max-w-3xl mx-auto"} rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 h-48 flex items-center justify-center text-gray-400 text-sm`}>
          No image selected
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-12 px-4">
      <figure className={width === "full" ? "w-full" : "max-w-3xl mx-auto"}>
        <img src={src} alt={alt} className="w-full h-auto rounded-xl object-cover" />
        {caption && <figcaption className="mt-3 text-center text-sm text-gray-500">{caption}</figcaption>}
      </figure>
    </div>
  );
}
