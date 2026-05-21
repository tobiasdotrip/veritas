import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button.js";

export interface ErrorFallbackProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorFallback({
  title = "Une erreur est survenue",
  description = "Impossible de charger les données. Veuillez réessayer.",
  onRetry,
  className,
}: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-danger/20 bg-danger-bg px-6 py-10 text-center",
        className,
      )}
    >
      <AlertTriangle className="h-10 w-10 text-danger" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-base font-medium text-danger">{title}</p>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-2">
          Réessayer
        </Button>
      )}
    </div>
  );
}
