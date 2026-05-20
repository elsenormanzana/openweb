import type { ButtonBlockProps, CtaButton } from "@/lib/blocks";
import { SelectField, CtaButtonField } from "./shared";

export function ButtonForm({ props, onChange }: { props: ButtonBlockProps; onChange: (p: ButtonBlockProps) => void }) {
  const set = <K extends keyof ButtonBlockProps>(k: K, v: ButtonBlockProps[K]) => onChange({ ...props, [k]: v });
  
  const buttonValue: CtaButton = {
    label: props.label,
    href: props.href,
    variant: props.variant,
    size: props.size,
    color: props.color,
    textColor: props.textColor,
    borderRadius: props.borderRadius,
    icon: props.icon,
    emoji: props.emoji,
    iconPosition: props.iconPosition,
  };

  const handleButtonChange = (btn: CtaButton) => {
    onChange({
      ...props,
      label: btn.label,
      href: btn.href,
      variant: btn.variant || "solid",
      size: btn.size || "md",
      color: btn.color || "#2563eb",
      textColor: btn.textColor || "#ffffff",
      borderRadius: btn.borderRadius || "md",
      icon: btn.icon,
      emoji: btn.emoji,
      iconPosition: btn.iconPosition,
    });
  };

  return (
    <div className="space-y-3">
      <CtaButtonField label="Button Settings" value={buttonValue} onChange={handleButtonChange} />
      <SelectField
        label="Alignment"
        value={props.align}
        onChange={(v) => set("align", v as any)}
        options={[
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
          { value: "full", label: "Full Width" },
        ]}
      />
    </div>
  );
}
