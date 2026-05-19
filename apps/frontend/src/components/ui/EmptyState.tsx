import * as React from "react";
import { cn } from "@/lib/utils";
import { SearchX } from "lucide-react";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = "Aucun résultat",
  description = "Essayez d'ajuster vos filtres ou votre recherche.",
  icon = <SearchX className="h-10 w-10 text-text-muted" aria-hidden="true" />,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-center",
        className
      )}
    >
      {icon}
      <div className="space-y-1">
        <p className="text-base font-medium text-text-primary">{title}</p>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
