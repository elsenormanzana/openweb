import type { TestimonialsBlockProps } from "@/lib/blocks";

export function TestimonialsBlock({ props }: { props: TestimonialsBlockProps }) {
  const { heading, items } = props;

  return (
    <section className="w-full ow-section px-4 bg-ow-bg">
      <div className="max-w-5xl mx-auto">
        {heading && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-ow-text">{heading}</h2>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div key={i} className="hover-lift flex flex-col gap-4 p-6 rounded-ow-lg border border-ow-border bg-ow-surface shadow-ow-sm hover:shadow-ow-md transition-shadow">
              <p className="text-ow-text leading-relaxed">"{item.quote}"</p>
              <div className="flex items-center gap-3 mt-auto">
                {item.avatar ? (
                  <img src={item.avatar} alt={item.name} loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-ow-primary-soft flex items-center justify-center text-sm font-bold text-ow-primary">
                    {item.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-ow-text">{item.name}</p>
                  <p className="text-xs text-ow-text-muted">{[item.role, item.company].filter(Boolean).join(", ")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
