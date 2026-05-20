import type { TeamSocialBlockProps, TeamSocialMember } from "@/lib/blocks";
import { Field, SelectField, ImagePickerField, ColorField } from "./shared";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Users } from "lucide-react";

export function TeamSocialForm({ props, onChange }: { props: TeamSocialBlockProps; onChange: (p: TeamSocialBlockProps) => void }) {
  const set = <K extends keyof TeamSocialBlockProps>(k: K, v: TeamSocialBlockProps[K]) => onChange({ ...props, [k]: v });

  const members = props.members || [];

  const updateMember = (index: number, updates: Partial<TeamSocialMember>) => {
    const next = [...members];
    next[index] = { ...next[index], ...updates };
    set("members", next);
  };

  const addMember = () => {
    const next = [
      ...members,
      {
        id: `mem-${Date.now()}`,
        name: "New Member",
        role: "Specialist",
        bio: "Brief biography and background info.",
        socials: [{ id: `soc-${Date.now()}`, platform: "LinkedIn", href: "https://linkedin.com", icon: "Linkedin", color: "#0A66C2" }],
      },
    ];
    set("members", next);
  };

  const removeMember = (index: number) => {
    const next = members.filter((_, i) => i !== index);
    set("members", next);
  };

  const addSocial = (memberIndex: number) => {
    const member = members[memberIndex];
    const socials = [...(member.socials || [])];
    socials.push({ id: `soc-${Date.now()}`, platform: "X", href: "https://x.com", icon: "X", color: "#000000" });
    updateMember(memberIndex, { socials });
  };

  const removeSocial = (memberIndex: number, socIndex: number) => {
    const member = members[memberIndex];
    const socials = (member.socials || []).filter((_, i) => i !== socIndex);
    updateMember(memberIndex, { socials });
  };

  const updateSocial = (memberIndex: number, socIndex: number, updates: any) => {
    const member = members[memberIndex];
    const socials = [...(member.socials || [])];
    socials[socIndex] = { ...socials[socIndex], ...updates };
    updateMember(memberIndex, { socials });
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border">
        <label className="font-semibold text-muted-foreground block">Header Settings</label>
        <Field label="Heading">
          <Input value={props.heading} onChange={(e) => set("heading", e.target.value)} />
        </Field>
        <Field label="Subheading">
          <Input value={props.subheading} onChange={(e) => set("subheading", e.target.value)} />
        </Field>
        <SelectField label="Layout" value={props.layout} onChange={(v) => set("layout", v as any)} options={[
          { value: "cards", label: "Large Cards" },
          { value: "grid", label: "Compact Grid" },
        ]} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5"><Users className="size-4 text-blue-500" /> Team Members ({members.length})</span>
          <button type="button" onClick={addMember} className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition shadow-sm">
            <Plus className="size-3.5" /> Add Member
          </button>
        </div>

        <div className="space-y-4 pl-1">
          {members.map((member, mIdx) => (
            <div key={member.id} className="p-3 bg-muted/20 rounded-lg border border-border space-y-3 relative group">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="font-semibold text-muted-foreground">Member: {member.name}</span>
                <button type="button" onClick={() => removeMember(mIdx)} className="text-muted-foreground hover:text-red-400 transition p-1 rounded hover:bg-red-500/10">
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Name">
                  <Input value={member.name} onChange={(e) => updateMember(mIdx, { name: e.target.value })} />
                </Field>
                <Field label="Role">
                  <Input value={member.role} onChange={(e) => updateMember(mIdx, { role: e.target.value })} />
                </Field>
              </div>

              <ImagePickerField label="Avatar Image" value={member.avatar || ""} onChange={(v) => updateMember(mIdx, { avatar: v })} />

              <Field label="Bio">
                <Input value={member.bio || ""} onChange={(e) => updateMember(mIdx, { bio: e.target.value })} />
              </Field>

              {/* Social links for this member */}
              <div className="space-y-2 border-t border-border pt-2.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>Social Connect Links ({member.socials?.length || 0})</span>
                  <button type="button" onClick={() => addSocial(mIdx)} className="text-blue-500 hover:text-blue-400 flex items-center gap-0.5">
                    <Plus className="size-3" /> Add Link
                  </button>
                </div>

                <div className="space-y-2">
                  {(member.socials || []).map((soc, sIdx) => (
                    <div key={soc.id} className="flex items-center gap-2 p-2 bg-background rounded border border-border">
                      <div className="flex-1 grid grid-cols-3 gap-1.5">
                        <Input value={soc.platform} onChange={(e) => updateSocial(mIdx, sIdx, { platform: e.target.value })} placeholder="Platform" className="h-7 text-[11px]" />
                        <Input value={soc.href} onChange={(e) => updateSocial(mIdx, sIdx, { href: e.target.value })} placeholder="URL" className="h-7 text-[11px]" />
                        <Input value={soc.icon || ""} onChange={(e) => updateSocial(mIdx, sIdx, { icon: e.target.value })} placeholder="Icon Name" className="h-7 text-[11px]" />
                      </div>
                      <ColorField label="" value={soc.color || ""} onChange={(v) => updateSocial(mIdx, sIdx, { color: v })} />
                      <button type="button" onClick={() => removeSocial(mIdx, sIdx)} className="text-muted-foreground hover:text-red-400 p-1">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
