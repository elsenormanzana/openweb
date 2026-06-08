import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { FaqBlockProps } from "@/lib/blocks";

export function FaqBlock({ props }: { props: FaqBlockProps }) {
  const { heading, items } = props;
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="w-full ow-section px-4 bg-ow-bg">
      <div className="max-w-3xl mx-auto">
        {heading && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-ow-text">{heading}</h2>
          </div>
        )}
        <div className="rounded-ow-lg border border-ow-border bg-ow-surface divide-y divide-ow-border overflow-hidden">
          {items.map((item, i) => (
            <div key={i}>
              <button
                className="flex w-full items-center justify-between text-left gap-4 px-5 py-5 hover:bg-ow-surface-2 transition-colors"
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-ow-text">{item.question}</span>
                {open === i
                  ? <ChevronUp className="size-4 text-ow-text-muted shrink-0" />
                  : <ChevronDown className="size-4 text-ow-text-muted shrink-0" />
                }
              </button>
              {open === i && (
                <p className="px-5 pb-5 -mt-1 text-ow-text-muted leading-relaxed">{item.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
