import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ChevronDown, Plus, Minus, ArrowRight } from "lucide-react";
import type { AccordionBlockProps } from "@/lib/blocks";

function AccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
  iconStyle,
  index,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  iconStyle: "chevron" | "plus" | "arrow";
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const renderIcon = () => {
    if (iconStyle === "plus") {
      return isOpen ? (
        <Minus className="size-5 text-gray-500" />
      ) : (
        <Plus className="size-5 text-gray-500" />
      );
    }

    if (iconStyle === "arrow") {
      return (
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ArrowRight className="size-5 text-gray-500" />
        </motion.div>
      );
    }

    // chevron (default)
    return (
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronDown className="size-5 text-gray-500" />
      </motion.div>
    );
  };

  return (
    <motion.div
      ref={ref}
      className="border-b border-gray-200"
      initial={{ opacity: 0, y: 15 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-lg font-medium text-gray-900 pr-4">{question}</span>
        {renderIcon()}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-5 text-gray-600 leading-relaxed">{answer}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AccordionBlock({ props }: { props: AccordionBlockProps }) {
  const { heading, items, allowMultiple, iconStyle } = props;
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  const handleToggle = useCallback(
    (index: number) => {
      setOpenItems((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          if (!allowMultiple) next.clear();
          next.add(index);
        }
        return next;
      });
    },
    [allowMultiple]
  );

  return (
    <section className="w-full py-16 sm:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        {heading && (
          <motion.h2
            ref={ref}
            className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            {heading}
          </motion.h2>
        )}
        <div className="divide-y divide-gray-200 border-t border-gray-200">
          {items.map((item, i) => (
            <AccordionItem
              key={i}
              question={item.question}
              answer={item.answer}
              isOpen={openItems.has(i)}
              onToggle={() => handleToggle(i)}
              iconStyle={iconStyle || "chevron"}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
