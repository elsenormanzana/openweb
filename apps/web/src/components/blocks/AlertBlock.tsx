import type { AlertBlockProps } from "@/lib/blocks";
import { ContainerDropZone } from "./ContainerDropZone";
import { CircleHelp, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";

export function AlertBlock({ props, editorProps, blockId }: { props: AlertBlockProps; editorProps?: any; blockId?: string }) {
  const { type, title, icon, variant, blocks } = props;

  const TYPE_CONFIG = {
    info: {
      Icon: CircleHelp,
      bg: variant === "solid" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-900 border-blue-200",
      accent: "border-l-blue-600",
      iconColor: variant === "solid" ? "text-white" : "text-blue-600",
    },
    warning: {
      Icon: AlertTriangle,
      bg: variant === "solid" ? "bg-yellow-600 text-white" : "bg-yellow-50 text-yellow-900 border-yellow-200",
      accent: "border-l-yellow-600",
      iconColor: variant === "solid" ? "text-white" : "text-yellow-600",
    },
    success: {
      Icon: CheckCircle2,
      bg: variant === "solid" ? "bg-green-600 text-white" : "bg-green-50 text-green-900 border-green-200",
      accent: "border-l-green-600",
      iconColor: variant === "solid" ? "text-white" : "text-green-600",
    },
    error: {
      Icon: AlertCircle,
      bg: variant === "solid" ? "bg-red-600 text-white" : "bg-red-50 text-red-900 border-red-200",
      accent: "border-l-red-600",
      iconColor: variant === "solid" ? "text-white" : "text-red-600",
    },
  }[type] || { Icon: CircleHelp, bg: "bg-blue-50 text-blue-900 border-blue-200", accent: "border-l-blue-600", iconColor: "text-blue-600" };

  const CurrentIcon = TYPE_CONFIG.Icon;
  const variantClass = variant === "left-accent" ? `border-l-4 ${TYPE_CONFIG.accent} bg-muted/30` : `border ${TYPE_CONFIG.bg}`;

  return (
    <div className={`w-full max-w-4xl mx-auto rounded-lg p-4 my-4 transition-all ${variantClass}`}>
      <div className="flex items-start gap-3">
        {icon && <CurrentIcon className={`size-6 shrink-0 mt-0.5 ${TYPE_CONFIG.iconColor}`} />}
        <div className="flex-1 w-full">
          {title && <h4 className="text-lg font-bold tracking-tight mb-2">{title}</h4>}
          <ContainerDropZone
            blockId={blockId || ""}
            containerKey="alert"
            blocks={blocks || []}
            editorProps={editorProps}
            label="Alert Body"
          />
        </div>
      </div>
    </div>
  );
}
