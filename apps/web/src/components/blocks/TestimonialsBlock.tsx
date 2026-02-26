import type { TestimonialsBlockProps } from "@/lib/blocks";

export function TestimonialsBlock({ props }: { props: TestimonialsBlockProps }) {
  const { heading, items } = props;

  return (
    <section className="w-full py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        {heading && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{heading}</h2>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col gap-4 p-6 rounded-xl border border-gray-100 bg-gray-50">
              <p className="text-gray-700 italic leading-relaxed">"{item.quote}"</p>
              <div className="flex items-center gap-3 mt-auto">
                {item.avatar ? (
                  <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-gray-600">
                    {item.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{[item.role, item.company].filter(Boolean).join(", ")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
