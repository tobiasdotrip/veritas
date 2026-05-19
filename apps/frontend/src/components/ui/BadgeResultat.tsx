import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

const config = {
  adopté: {
    label: "Adopté",
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
    classes: "bg-success-bg text-success",
  },
  rejeté: {
    label: "Rejeté",
    icon: <XCircle className="h-4 w-4" aria-hidden="true" />,
    classes: "bg-danger-bg text-danger",
  },
};

export interface BadgeResultatProps {
  resultat: "adopté" | "rejeté" | null;
  size?: "sm" | "md";
  className?: string;
}

export function BadgeResultat({ resultat, size = "sm", className }: BadgeResultatProps) {
  if (!resultat || !(resultat in config)) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-neutral-bg px-2.5 py-1 text-xs font-medium text-neutral",
          size === "md" && "px-3 py-1.5 text-sm",
          className
        )}
        aria-label="Résultat inconnu"
      >
        En cours
      </span>
    );
  }
  const c = config[resultat];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        c.classes,
        size === "md" && "px-3 py-1.5 text-sm",
        className
      )}
      role="status"
      aria-label={`Résultat : ${c.label}`}
      title={`Résultat : ${c.label}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}
