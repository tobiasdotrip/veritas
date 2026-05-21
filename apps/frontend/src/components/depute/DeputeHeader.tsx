import { cn } from "@/lib/utils";
import { BadgeResultat } from "@/components/ui/BadgeResultat";
import type { DeputeProfile } from "@/lib/api-types";

export interface DeputeHeaderProps {
  depute: DeputeProfile;
  className?: string;
}

export function DeputeHeader({ depute, className }: DeputeHeaderProps) {
  const fullName = `${depute.firstName} ${depute.lastName}`;
  const isActive = !depute.mandateEnd;

  return (
    <div className={cn("flex items-start gap-4", className)}>
      <div className="shrink-0">
        {depute.photoUrl ? (
          <img
            src={depute.photoUrl}
            alt={`Photo de ${fullName}`}
            width={96}
            height={96}
            className="h-20 w-20 rounded-full object-cover sm:h-24 sm:w-24"
            loading="eager"
          />
        ) : (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-bg text-text-muted sm:h-24 sm:w-24"
            aria-hidden="true"
          >
            <span className="text-2xl font-bold">
              {depute.firstName.charAt(0)}
              {depute.lastName.charAt(0)}
            </span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h1 className="text-xl font-bold leading-tight text-text-primary sm:text-2xl">
          {fullName}
        </h1>
        <p className="text-sm text-text-secondary">
          {depute.circoLabel
            ? `${depute.circoLabel}`
            : depute.departmentId
              ? `Département ${depute.departmentId}`
              : "Circonscription inconnue"}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {depute.groupAbbreviation && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {depute.groupAbbreviation}
            </span>
          )}
          <BadgeResultat resultat={isActive ? "adopté" : "rejeté"} size="sm" />
          <span className="sr-only">
            {isActive ? "Mandat en cours" : "Mandat terminé"}
          </span>
        </div>
      </div>
    </div>
  );
}
