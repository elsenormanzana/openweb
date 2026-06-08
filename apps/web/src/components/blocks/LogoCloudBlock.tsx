import type { LogoCloudBlockProps } from "@/lib/blocks";

export function LogoCloudBlock({ props }: { props: LogoCloudBlockProps }) {
  const { heading, subheading, logos } = props;

  return (
    <section className="w-full ow-section px-4 bg-ow-bg border-y border-ow-border">
      <div className="max-w-5xl mx-auto">
        {(heading || subheading) && (
          <div className="text-center mb-10">
            {heading && <p className="text-sm font-semibold uppercase tracking-wider text-ow-text-muted">{heading}</p>}
            {subheading && <p className="mt-1 text-ow-text-muted/80 text-sm">{subheading}</p>}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-8">
          {logos.map((logo, i) => (
            <div key={i} className="flex items-center justify-center">
              {logo.url ? (
                <img src={logo.url} alt={logo.name} loading="lazy" decoding="async" className="h-10 object-contain grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-300" />
              ) : (
                <span className="text-xl font-bold text-ow-text-muted/60">{logo.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
