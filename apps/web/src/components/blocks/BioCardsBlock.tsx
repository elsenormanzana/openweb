import type { BioCardsBlockProps } from "@/lib/blocks";
import { IconRenderer } from "@/components/shared/IconRenderer";

export function BioCardsBlock({ props }: { props: BioCardsBlockProps }) {
  const { heading, subheading, items } = props;

  return (
    <section className="w-full ow-section px-4 bg-ow-surface">
      <div className="max-w-5xl mx-auto">
        {(heading || subheading) && (
          <div className="text-center mb-12">
            {heading && <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-ow-text">{heading}</h2>}
            {subheading && <p className="mt-3 text-lg text-ow-text-muted">{subheading}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div key={i} className="hover-lift flex flex-col items-center text-center gap-3 p-6 rounded-ow-lg bg-ow-bg border border-ow-border shadow-ow-sm hover:shadow-ow-md transition-shadow">
              {item.avatar ? (
                <img src={item.avatar} alt={item.name} loading="lazy" decoding="async" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-ow-primary-soft flex items-center justify-center text-2xl font-bold text-ow-primary">
                  {item.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-ow-text">{item.name}</p>
                {item.role && <p className="text-sm text-ow-text-muted">{item.role}</p>}
              </div>
              {item.bio && <p className="text-sm text-ow-text-muted leading-relaxed">{item.bio}</p>}
              {(item.linkedin || item.twitter) && (
                <div className="flex gap-4 text-sm mt-1">
                  {item.linkedin && (
                    <a href={item.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-ow-primary hover:opacity-80 font-medium transition">
                      <IconRenderer icon="linkedin" className="size-4" /> LinkedIn
                    </a>
                  )}
                  {item.twitter && (
                    <a href={item.twitter} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-ow-text hover:opacity-70 font-medium transition">
                      <IconRenderer icon="x" className="size-4" /> X (Twitter)
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
