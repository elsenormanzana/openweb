import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { FaqBlockProps } from "@/lib/blocks";

export function FaqBlock({ props }: { props: FaqBlockProps }) {
  const { heading, items } = props;
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="w-full py-20 px-4 bg-white">
      <div className="max-w-3xl mx-auto">
        {heading && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{heading}</h2>
          </div>
        )}
        <div className="divide-y divide-gray-100">
          {items.map((item, i) => (
            <div key={i} className="py-5">
              <button
                className="flex w-full items-center justify-between text-left gap-4"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-gray-900">{item.question}</span>
                {open === i
                  ? <ChevronUp className="size-4 text-gray-400 shrink-0" />
                  : <ChevronDown className="size-4 text-gray-400 shrink-0" />
                }
              </button>
              {open === i && (
                <p className="mt-3 text-gray-600 leading-relaxed">{item.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
