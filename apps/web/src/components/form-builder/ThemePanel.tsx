import { X } from "lucide-react";
import type { FontPreset, FormTheme } from "@/lib/api";
import { ColorField, ImagePickerField, SelectField } from "@/components/block-forms/shared";
import { FONT_PRESET_OPTIONS } from "@/lib/formFields";

type ThemePanelProps = {
  theme: FormTheme;
  onChange: (patch: Partial<FormTheme>) => void;
  onClose: () => void;
};

/** Right-side drawer for editing a form's art style (Google Forms-level). */
export function ThemePanel({ theme, onChange, onClose }: ThemePanelProps) {
  return (
    <div className="absolute inset-0 z-20 flex justify-end">
      <button className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Close theme panel" />
      <div className="relative w-80 max-w-full bg-background border-l border-border h-full overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Theme</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="h-2 w-full" style={{ backgroundColor: theme.themeColor }} />
          {theme.headerImage && <img src={theme.headerImage} alt="" className="w-full h-20 object-cover" />}
          <div className="p-3" style={{ backgroundColor: theme.backgroundColor }}>
            <div className="rounded-lg bg-white p-2 text-xs text-gray-600 shadow-sm">Live preview</div>
          </div>
        </div>

        <ImagePickerField
          label="Header image"
          value={theme.headerImage}
          onChange={(v) => onChange({ headerImage: v })}
        />
        <ColorField label="Theme color" value={theme.themeColor} onChange={(v) => onChange({ themeColor: v })} />
        <ColorField label="Background color" value={theme.backgroundColor} onChange={(v) => onChange({ backgroundColor: v })} />

        <div className="pt-1 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fonts</p>
          <SelectField
            label="Header font"
            value={theme.headerFont}
            onChange={(v) => onChange({ headerFont: v as FontPreset })}
            options={FONT_PRESET_OPTIONS}
          />
          <SelectField
            label="Question font"
            value={theme.questionFont}
            onChange={(v) => onChange({ questionFont: v as FontPreset })}
            options={FONT_PRESET_OPTIONS}
          />
          <SelectField
            label="Text font"
            value={theme.textFont}
            onChange={(v) => onChange({ textFont: v as FontPreset })}
            options={FONT_PRESET_OPTIONS}
          />
        </div>
      </div>
    </div>
  );
}
