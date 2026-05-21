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
            className="rounded-lg border border-border bg-surface"
          >
            <AccordionPrimitive.Header>
              <AccordionPrimitive.Trigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30 [&[data-state=open]>svg]:rotate-180">
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
            <AccordionPrimitive.Content className="overflow-hidden px-4 pb-3 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div className="rounded bg-success-bg px-2 py-1 text-success">
                  Pour : {g.nombrePour ?? 0}
                </div>
                <div className="rounded bg-danger-bg px-2 py-1 text-danger">
                  Contre : {g.nombreContre ?? 0}
                </div>
                <div className="rounded bg-warning-bg px-2 py-1 text-warning">
                  Abstentions : {g.nombreAbstentions ?? 0}
                </div>
                <div className="rounded bg-neutral-bg px-2 py-1 text-neutral">
                  Absents : {g.nombreNonVotants ?? 0}
                </div>
              </div>
              {g.positionMajoritaire && (
                <p className="mt-2 text-xs text-text-secondary">
                  Position majoritaire du groupe :{" "}
                  <span className="font-medium capitalize text-text-primary">
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
