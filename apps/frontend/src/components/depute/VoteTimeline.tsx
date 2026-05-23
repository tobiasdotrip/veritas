import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { cn } from "@/lib/utils";
import { ChevronDown, Calendar } from "lucide-react";
import { VoteCard } from "./VoteCard";
import type { DeputeVoteItem } from "@/lib/api-types";

export interface VoteTimelineProps {
  votes: DeputeVoteItem[];
  className?: string;
}

interface YearGroup {
  year: number;
  label: string;
  votes: DeputeVoteItem[];
}

function groupByYear(votes: DeputeVoteItem[]): YearGroup[] {
  const map = new Map<number, DeputeVoteItem[]>();
  for (const vote of votes) {
    const year = new Date(vote.dateScrutin).getFullYear();

    const existing = map.get(year);
    if (existing) {
      existing.push(vote);
    } else {
      map.set(year, [vote]);
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b - a) // plus récent d'abord
    .map(([year, yearVotes]) => ({
      year,
      label: year.toString(),
      votes: yearVotes,
    }));
}

export function VoteTimeline({ votes, className }: VoteTimelineProps) {
  const groups = groupByYear(votes);

  if (groups.length === 0) return null;

  // Premier groupe ouvert par défaut (le plus récent)
  const firstGroup = groups[0]!;

  return (
    <AccordionPrimitive.Root
      type="multiple"
      defaultValue={[firstGroup.year.toString()]}
      className={cn("space-y-3", className)}
    >
      {groups.map((group) => (
        <AccordionPrimitive.Item
          key={group.year}
          value={group.year.toString()}
          className="overflow-hidden rounded-xl border border-border-light bg-surface shadow-sm"
        >
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-primary-bg-subtle focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 [&[data-state=open]>svg]:rotate-180">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-bg text-primary">
                  <Calendar className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-base font-bold text-text-primary">
                    {group.label}
                  </span>
                  <span className="ml-2 text-sm text-text-muted">
                    {group.votes.length} scrutin
                    {group.votes.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <ChevronDown
                className="h-5 w-5 shrink-0 text-text-muted transition-transform duration-200"
                aria-hidden="true"
              />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="space-y-2 border-t border-border-light px-5 py-4">
              {group.votes.map((vote) => (
                <VoteCard key={vote.scrutinId} vote={vote} />
              ))}
            </div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
