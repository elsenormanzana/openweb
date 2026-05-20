import type { TeamSocialBlockProps } from "@/lib/blocks";
import { IconRenderer } from "@/components/shared/IconRenderer";

export function TeamSocialBlock({ props }: { props: TeamSocialBlockProps }) {
  const { heading, subheading, layout = "cards", members = [] } = props;

  return (
    <section className="w-full py-20 px-4 bg-slate-900 text-white overflow-hidden relative">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {(heading || subheading) && (
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            {heading && <h2 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">{heading}</h2>}
            {subheading && <p className="text-lg text-slate-400 leading-relaxed">{subheading}</p>}
          </div>
        )}

        <div className={`grid gap-8 ${layout === "grid" ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-3"}`}>
          {members.map((member) => (
            <div
              key={member.id}
              className="group flex flex-col items-center text-center p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-xl hover:border-slate-600/80 hover:bg-slate-800/60 transition-all duration-300 shadow-xl shadow-black/10 hover:-translate-y-1"
            >
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 blur opacity-40 group-hover:opacity-75 transition-opacity duration-300" />
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} className="relative w-28 h-28 rounded-full object-cover border-2 border-slate-700 group-hover:border-slate-500 transition-colors" />
                ) : (
                  <div className="relative w-28 h-28 rounded-full bg-slate-700 flex items-center justify-center text-3xl font-bold text-slate-300 border-2 border-slate-600">
                    {member.name.charAt(0)}
                  </div>
                )}
              </div>

              <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
              <p className="text-sm font-medium text-blue-400 mb-3">{member.role}</p>
              {member.bio && <p className="text-sm text-slate-400 leading-relaxed mb-6 flex-1">{member.bio}</p>}

              {member.socials?.length > 0 && (
                <div className="flex items-center gap-3 pt-4 border-t border-slate-700/60 w-full justify-center">
                  {member.socials.map((soc) => (
                    <a
                      key={soc.id}
                      href={soc.href || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-full bg-slate-800/80 border border-slate-700/80 hover:scale-110 hover:border-slate-500 transition-all duration-200 flex items-center justify-center shadow-sm"
                      style={{ color: soc.color || "#38bdf8" }}
                      title={soc.platform}
                    >
                      <IconRenderer icon={soc.icon || "Globe"} className="size-4.5" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
