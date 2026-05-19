import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Filter, X } from "lucide-react";

export interface VoteFiltersState {
  from?: string | undefined;
  to?: string | undefined;
  type?: string | undefined;
  theme?: string | undefined;
  position?: string | undefined;
}

export interface VoteFiltersProps {
  filters: VoteFiltersState;
  onChange: (filters: VoteFiltersState) => void;
  className?: string;
}

const types = [
  { value: "", label: "Tous" },
  { value: "solennel", label: "Solennel" },
  { value: "motion_censure", label: "Motion de censure" },
  { value: "amendement", label: "Amendement" },
  { value: "budget", label: "Budget" },
  { value: "autre", label: "Autre" },
];

const positions = [
  { value: "", label: "Toutes" },
  { value: "pour", label: "Pour" },
  { value: "contre", label: "Contre" },
  { value: "abstention", label: "Abstention" },
  { value: "nonVotant", label: "Absent" },
];

export function VoteFilters({ filters, onChange, className }: VoteFiltersProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const hasFilters =
    filters.from || filters.to || filters.type || filters.theme || filters.position;

  const clear = () =>
    onChange({
      from: undefined,
      to: undefined,
      type: undefined,
      theme: undefined,
      position: undefined,
    });

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="sm:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filtres
          {hasFilters && (
            <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
              {[
                filters.from,
                filters.to,
                filters.type,
                filters.theme,
                filters.position,
              ].filter(Boolean).length}
            </span>
          )}
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <X className="h-4 w-4" aria-hidden="true" />
            Réinitialiser
          </Button>
        )}
      </div>

      <div
        className={cn(
          "grid gap-3",
          mobileOpen ? "block" : "hidden sm:grid",
          "sm:grid-cols-2 lg:grid-cols-5"
        )}
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Du</label>
          <Input
            type="date"
            value={filters.from ?? ""}
            onChange={(e) => onChange({ ...filters, from: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Au</label>
          <Input
            type="date"
            value={filters.to ?? ""}
            onChange={(e) => onChange({ ...filters, to: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Type</label>
          <select
            value={filters.type ?? ""}
            onChange={(e) => onChange({ ...filters, type: e.target.value || undefined })}
            className="flex h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
          >
            {types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Position</label>
          <select
            value={filters.position ?? ""}
            onChange={(e) => onChange({ ...filters, position: e.target.value || undefined })}
            className="flex h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
          >
            {positions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Thématique</label>
          <Input
            placeholder="Ex. environnement"
            value={filters.theme ?? ""}
            onChange={(e) => onChange({ ...filters, theme: e.target.value || undefined })}
          />
        </div>
      </div>
    </div>
  );
}
