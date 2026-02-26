import { useState } from "react";
import type { SlideshowBlockProps } from "@/lib/blocks";

export function SlideshowBlock({ props }: { props: SlideshowBlockProps }) {
  const { heading, subheading, items } = props;
  const [idx, setIdx] = useState(0);
  const item = items[idx];

  if (!items.length) return null;

  return (
    <section className="w-full py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        {(heading || subheading) && (
          <div className="text-center mb-10">
            {heading && <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{heading}</h2>}
            {subheading && <p className="mt-3 text-lg text-gray-500">{subheading}</p>}
          </div>
        )}
        <div className="relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 min-h-[340px] flex items-center">
          {item.image && (
            <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover opacity-20" />
          )}
          <div className="relative z-10 p-10 flex flex-col gap-4 max-w-2xl">
            {item.badge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 w-fit">{item.badge}</span>
            )}
            <h3 className="text-2xl font-bold text-gray-900">{item.title}</h3>
            {item.description && <p className="text-gray-600">{item.description}</p>}
            {item.cta.label && (
              <a href={item.cta.href || "#"} className="inline-flex w-fit items-center justify-center rounded-md bg-gray-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-gray-700 transition-colors">
                {item.cta.label}
              </a>
            )}
          </div>
        </div>
        {items.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${i === idx ? "bg-gray-900" : "bg-gray-300"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
