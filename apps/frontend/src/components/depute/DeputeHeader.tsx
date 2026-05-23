import { cn } from "@/lib/utils";
import type { DeputeProfile } from "@/lib/api-types";

export interface DeputeHeaderProps {
  depute: DeputeProfile;
  className?: string;
}

export function DeputeHeader({ depute, className }: DeputeHeaderProps) {
  const fullName = `${depute.firstName} ${depute.lastName}`;
  const isActive = !depute.mandateEnd;

  return (
    <div className={cn("flex items-start gap-5", className)}>
      <div className="shrink-0">
        {depute.photoUrl ? (
          <img
            src={depute.photoUrl}
            alt={`Photo de ${fullName}`}
            width={112}
            height={112}
            className="h-24 w-24 rounded-full border-2 border-primary-bg object-cover shadow-md sm:h-28 sm:w-28"
            loading="eager"
          />
        ) : (
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary-bg bg-primary-bg-subtle text-primary sm:h-28 sm:w-28 shadow-md"
            aria-hidden="true"
          >
            <span className="text-3xl font-bold">
              {depute.firstName.charAt(0)}
              {depute.lastName.charAt(0)}
            </span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <h1 className="text-2xl font-bold leading-tight text-text-primary sm:text-3xl">
          {fullName}
        </h1>
        <p className="text-sm font-medium text-text-secondary">
          {depute.circoLabel
            ? depute.circoLabel
            : depute.departmentId
              ? `Département ${depute.departmentId}`
              : "Circonscription inconnue"}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {depute.groupAbbreviation && (
            <span className="inline-flex items-center rounded-full bg-primary-bg px-3 py-0.5 text-xs font-semibold text-primary">
              {depute.groupAbbreviation}
            </span>
          )}
          {isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-semibold text-success">
              <span
                className="h-1.5 w-1.5 rounded-full bg-success"
                aria-hidden="true"
              />
              En fonction
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-neutral-bg px-2.5 py-0.5 text-xs font-semibold text-neutral">
              Mandat terminé
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
