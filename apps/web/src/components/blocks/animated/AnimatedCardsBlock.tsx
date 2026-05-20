import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import type { AnimatedCardsBlockProps } from "@/lib/blocks";

function TiltCard({
  item,
  index,
}: {
  item: { title: string; description: string; image: string; link: string };
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const [transform, setTransform] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg)");

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
  };

  const handleLeave = () => {
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg)");
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div
        className="group rounded-2xl border border-gray-200 bg-white overflow-hidden transition-all duration-200 ease-out will-change-transform"
        style={{ transform }}
        onMouseMove={handleMouse}
        onMouseLeave={handleLeave}
      >
        {item.image && (
          <div className="aspect-video overflow-hidden">
            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
          {item.link && (
            <a href={item.link} className="inline-block mt-4 text-sm font-medium text-blue-600 hover:text-blue-700">
              Learn more &rarr;
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function GlowCard({
  item,
  index,
}: {
  item: { title: string; description: string; image: string; link: string };
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setGlowPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div
        className="group relative rounded-2xl border border-gray-200 bg-white overflow-hidden"
        onMouseMove={handleMouse}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(300px circle at ${glowPos.x}% ${glowPos.y}%, rgba(59,130,246,0.15), transparent 60%)`,
          }}
        />
        {item.image && (
          <div className="aspect-video overflow-hidden">
            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="relative p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
          {item.link && (
            <a href={item.link} className="inline-block mt-4 text-sm font-medium text-blue-600 hover:text-blue-700">
              Learn more &rarr;
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SpotlightCard({
  item,
  index,
}: {
  item: { title: string; description: string; image: string; link: string };
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div
        className="group relative rounded-2xl border border-gray-200 bg-gray-950 overflow-hidden"
        onMouseMove={handleMouse}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,0.06), transparent 60%)`,
          }}
        />
        {item.image && (
          <div className="aspect-video overflow-hidden">
            <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-80" />
          </div>
        )}
        <div className="relative p-6">
          <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
          <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
          {item.link && (
            <a href={item.link} className="inline-block mt-4 text-sm font-medium text-blue-400 hover:text-blue-300">
              Learn more &rarr;
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function AnimatedCardsBlock({ props }: { props: AnimatedCardsBlockProps }) {
  const { items, cardStyle } = props;

  return (
    <section className="w-full py-16 sm:py-24 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item, i) => {
          if (cardStyle === "3d-tilt") return <TiltCard key={i} item={item} index={i} />;
          if (cardStyle === "hover-glow") return <GlowCard key={i} item={item} index={i} />;
          return <SpotlightCard key={i} item={item} index={i} />;
        })}
      </div>
    </section>
  );
}
