import type { LogoCloudBlockProps } from "@/lib/blocks";

export function LogoCloudBlock({ props }: { props: LogoCloudBlockProps }) {
  const { heading, subheading, logos } = props;

  return (
    <section className="w-full py-16 px-4 bg-white border-y border-gray-100">
      <div className="max-w-5xl mx-auto">
        {(heading || subheading) && (
          <div className="text-center mb-10">
            {heading && <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">{heading}</p>}
            {subheading && <p className="mt-1 text-gray-400 text-sm">{subheading}</p>}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-8">
          {logos.map((logo, i) => (
            <div key={i} className="flex items-center justify-center">
              {logo.url ? (
                <img src={logo.url} alt={logo.name} className="h-10 object-contain grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all" />
              ) : (
                <span className="text-xl font-bold text-gray-300">{logo.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
