import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import type { ScrutinGroupVote } from "@/lib/api-types";

export interface GroupAccordionProps {
  groups: ScrutinGroupVote[];
  className?: string;
}

function GroupBar({
  pour,
  contre,
  abstentions,
  nonVotants,
  total,
}: {
  pour: number;
  contre: number;
  abstentions: number;
  nonVotants: number;
  total: number;
}) {
  if (total === 0) return null;
  const wp = (pour / total) * 100;
  const wc = (contre / total) * 100;
  const wa = (abstentions / total) * 100;
  const wn = (nonVotants / total) * 100;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full">
      {wp > 0 && (
        <div
          style={{ width: `${wp}%` }}
          className="bg-success"
          aria-hidden="true"
        />
      )}
      {wc > 0 && (
        <div
          style={{ width: `${wc}%` }}
          className="bg-danger"
          aria-hidden="true"
        />
      )}
      {wa > 0 && (
        <div
          style={{ width: `${wa}%` }}
          className="bg-warning"
          aria-hidden="true"
        />
      )}
      {wn > 0 && (
        <div
          style={{ width: `${wn}%` }}
          className="bg-neutral"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export function GroupAccordion({ groups, className }: GroupAccordionProps) {
  return (
    <AccordionPrimitive.Root
      type="multiple"
      className={cn("space-y-2", className)}
    >
      {groups.map((g) => {
        const total =
          (g.nombrePour ?? 0) +
          (g.nombreContre ?? 0) +
          (g.nombreAbstentions ?? 0) +
          (g.nombreNonVotants ?? 0);
        return (
          <AccordionPrimitive.Item
            key={g.politicalGroupId}
            value={g.politicalGroupId}
            className="overflow-hidden rounded-xl border border-border-light bg-surface shadow-sm"
          >
            <AccordionPrimitive.Header>
              <AccordionPrimitive.Trigger className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-primary-bg-subtle focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 [&[data-state=open]>svg]:rotate-180">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      {g.name}
                    </span>
                    {g.abbreviation && (
                      <span className="text-xs text-text-muted">
                        {g.abbreviation}
                      </span>
                    )}
                  </div>
                  <GroupBar
                    pour={g.nombrePour ?? 0}
                    contre={g.nombreContre ?? 0}
                    abstentions={g.nombreAbstentions ?? 0}
                    nonVotants={g.nombreNonVotants ?? 0}
                    total={total}
                  />
                </div>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-200"
                  aria-hidden="true"
                />
              </AccordionPrimitive.Trigger>
            </AccordionPrimitive.Header>
            <AccordionPrimitive.Content className="overflow-hidden px-5 py-4 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-success-bg px-3 py-2.5 font-medium text-success">
                  <span className="block text-xs uppercase tracking-wider opacity-70">
                    Pour
                  </span>
                  <span className="text-lg font-bold">{g.nombrePour ?? 0}</span>
                </div>
                <div className="rounded-lg bg-danger-bg px-3 py-2.5 font-medium text-danger">
                  <span className="block text-xs uppercase tracking-wider opacity-70">
                    Contre
                  </span>
                  <span className="text-lg font-bold">
                    {g.nombreContre ?? 0}
                  </span>
                </div>
                <div className="rounded-lg bg-warning-bg px-3 py-2.5 font-medium text-warning">
                  <span className="block text-xs uppercase tracking-wider opacity-70">
                    Abstentions
                  </span>
                  <span className="text-lg font-bold">
                    {g.nombreAbstentions ?? 0}
                  </span>
                </div>
                <div className="rounded-lg bg-neutral-bg px-3 py-2.5 font-medium text-neutral">
                  <span className="block text-xs uppercase tracking-wider opacity-70">
                    Absents
                  </span>
                  <span className="text-lg font-bold">
                    {g.nombreNonVotants ?? 0}
                  </span>
                </div>
              </div>
              {g.positionMajoritaire && (
                <p className="mt-2 text-xs text-text-secondary">
                  Consigne du groupe :{" "}
                  <span className="font-semibold capitalize text-text-primary">
                    {g.positionMajoritaire}
                  </span>
                </p>
              )}
            </AccordionPrimitive.Content>
          </AccordionPrimitive.Item>
        );
      })}
    </AccordionPrimitive.Root>
  );
}
