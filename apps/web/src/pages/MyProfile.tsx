import { useEffect, useState } from "react";
import { Plus, Trash2, Image } from "lucide-react";
import { api, type User, type UserSocial, type MediaItem } from "@/lib/api";

type FormState = {
  email: string;
  password: string;
  bio: string;
  avatarUrl: string;
  position: string;
  socialMedia: UserSocial[];
};

function toForm(user: User): FormState {
  return {
    email: user.email,
    password: "",
    bio: user.bio ?? "",
    avatarUrl: user.avatarUrl ?? "",
    position: user.position ?? "",
    socialMedia: user.socialMedia ?? [],
  };
}

export function MyProfile() {
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    api.profile.get()
      .then((user) => setForm(toForm(user)))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"));
  }, []);

  if (!form) {
    return <p className="text-sm text-muted-foreground">{error ? error : "Loading profile..."}</p>;
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  async function openPicker() {
    try {
      const list = await api.media.list();
      setMedia(list.filter((m) => m.mimeType.startsWith("image/")));
      setPickerOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load media");
    }
  }

  async function save() {
    if (!form) return;
    const current = form;
    setSaving(true);
    setError(null);
    try {
      await api.profile.update({
        email: current.email,
        password: current.password || undefined,
        bio: current.bio || null,
        avatarUrl: current.avatarUrl || null,
        position: current.position || null,
        socialMedia: current.socialMedia.length ? current.socialMedia : null,
      });
      setForm((prev) => prev ? { ...prev, password: "" } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Update your profile details and social links.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save profile"}
        </button>
      </div>

      {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

      <div className="rounded-2xl border border-border/60 bg-background p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">New password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            placeholder="Leave blank to keep current password"
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Position</label>
          <input
            value={form.position}
            onChange={(e) => setField("position", e.target.value)}
            placeholder="Lead Designer"
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setField("bio", e.target.value)}
            rows={4}
            placeholder="Short bio about you..."
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">User Picture</label>
          <div className="flex gap-2">
            <input
              value={form.avatarUrl}
              onChange={(e) => setField("avatarUrl", e.target.value)}
              placeholder="https://... or choose from media"
              className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={openPicker}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              <Image className="size-4" />
              Pick
            </button>
          </div>
          {form.avatarUrl && (
            <img src={form.avatarUrl} alt="Avatar preview" className="mt-2 h-16 w-16 rounded-xl object-cover border border-border/60" />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Social Media</h2>
          <button
            type="button"
            onClick={() => setField("socialMedia", [...form.socialMedia, { platform: "", url: "" }])}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors inline-flex items-center gap-1"
          >
            <Plus className="size-3.5" />
            Add
          </button>
        </div>

        {form.socialMedia.length === 0 ? (
          <p className="text-sm text-muted-foreground">No social links added yet.</p>
        ) : (
          <div className="space-y-2">
            {form.socialMedia.map((item, i) => (
              <div key={`${item.platform}-${i}`} className="grid grid-cols-12 gap-2">
                <input
                  value={item.platform}
                  onChange={(e) => {
                    const next = [...form.socialMedia];
                    next[i] = { ...next[i], platform: e.target.value };
                    setField("socialMedia", next);
                  }}
                  placeholder="Platform"
                  className="col-span-4 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  value={item.url}
                  onChange={(e) => {
                    const next = [...form.socialMedia];
                    next[i] = { ...next[i], url: e.target.value };
                    setField("socialMedia", next);
                  }}
                  placeholder="https://..."
                  className="col-span-7 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setField("socialMedia", form.socialMedia.filter((_, idx) => idx !== i))}
                  className="col-span-1 rounded-lg border border-border/60 hover:bg-destructive/10 transition-colors flex items-center justify-center"
                  title="Remove link"
                >
                  <Trash2 className="size-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-background p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Choose profile image</h3>
              <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setPickerOpen(false)}>Close</button>
            </div>
            {media.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No images available.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {media.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setField("avatarUrl", item.url); setPickerOpen(false); }}
                    className="aspect-square rounded-lg overflow-hidden border border-border/60 hover:border-foreground transition-colors"
                  >
                    <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
