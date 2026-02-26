import type { StatsBlockProps } from "@/lib/blocks";

export function StatsBlock({ props }: { props: StatsBlockProps }) {
  const { heading, items } = props;

  return (
    <section className="w-full py-20 px-4 bg-gray-900">
      <div className="max-w-5xl mx-auto">
        {heading && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white">{heading}</h2>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, i) => (
            <div key={i} className="text-center flex flex-col gap-1">
              <p className="text-5xl font-bold text-white">{item.value}</p>
              <p className="text-lg font-semibold text-blue-400">{item.label}</p>
              {item.description && <p className="text-sm text-gray-400">{item.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
