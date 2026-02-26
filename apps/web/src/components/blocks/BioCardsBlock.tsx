import type { BioCardsBlockProps } from "@/lib/blocks";

export function BioCardsBlock({ props }: { props: BioCardsBlockProps }) {
  const { heading, subheading, items } = props;

  return (
    <section className="w-full py-20 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        {(heading || subheading) && (
          <div className="text-center mb-12">
            {heading && <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{heading}</h2>}
            {subheading && <p className="mt-3 text-lg text-gray-500">{subheading}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-3 p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
              {item.avatar ? (
                <img src={item.avatar} alt={item.name} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
                  {item.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{item.name}</p>
                {item.role && <p className="text-sm text-gray-500">{item.role}</p>}
              </div>
              {item.bio && <p className="text-sm text-gray-600 leading-relaxed">{item.bio}</p>}
              {(item.linkedin || item.twitter) && (
                <div className="flex gap-3 text-sm">
                  {item.linkedin && <a href={item.linkedin} className="text-blue-600 hover:underline">LinkedIn</a>}
                  {item.twitter && <a href={item.twitter} className="text-sky-500 hover:underline">Twitter</a>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
