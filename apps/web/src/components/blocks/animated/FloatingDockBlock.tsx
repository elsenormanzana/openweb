import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Home, Search, Mail, Settings, Star, Globe, Heart,
  Zap, Shield, Clock, Users, Rocket, Code2, Database,
} from "lucide-react";
import type { FloatingDockBlockProps } from "@/lib/blocks";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Search,
  Mail,
  Settings,
  Star,
  Globe,
  Heart,
  Zap,
  Shield,
  Clock,
  Users,
  Rocket,
  Code2,
  Database,
};

function getIcon(name: string) {
  return ICON_MAP[name] || Home;
}

export function FloatingDockBlock({ props }: { props: FloatingDockBlockProps }) {
  const { items, position, magnification } = props;
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const isTop = position === "top";

  return (
    <section ref={ref} className="relative w-full py-16 sm:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Dock container */}
        <motion.div
          className={`flex justify-center ${isTop ? "mb-12" : "mt-12"} ${isTop ? "order-first" : "order-last"}`}
          initial={{ opacity: 0, y: isTop ? -20 : 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="inline-flex items-end gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-200 shadow-lg">
            {items.map((item, i) => {
              const Icon = getIcon(item.icon);
              return (
                <motion.a
                  key={i}
                  href={item.href || "#"}
                  className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-colors hover:bg-gray-100 group relative"
                  whileHover={magnification ? { scale: 1.4, y: -8 } : { scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Icon className="size-6 text-gray-700 group-hover:text-gray-900" />
                  <span className="text-[10px] text-gray-500 group-hover:text-gray-700 font-medium">
                    {item.label}
                  </span>
                  {/* Tooltip on hover */}
                  <motion.span
                    className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                  >
                    {item.label}
                  </motion.span>
                </motion.a>
              );
            })}
          </div>
        </motion.div>

        {/* Spacer content area so the dock has context */}
        <motion.div
          className={`text-center ${isTop ? "" : "order-first"}`}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm text-gray-400">Navigation Dock</p>
        </motion.div>
      </div>
    </section>
  );
}
