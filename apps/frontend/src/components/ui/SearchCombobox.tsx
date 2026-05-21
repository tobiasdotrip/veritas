import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./Input.js";
import { Search, Loader2 } from "lucide-react";

export interface SearchOption {
  id: string;
  label: string;
  group?: string;
  meta?: string;
}

export interface SearchComboboxProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (option: SearchOption) => void;
  options: SearchOption[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  inputClassName?: string;
  label?: string;
}

export function SearchCombobox({
  placeholder = "Rechercher…",
  value = "",
  onChange,
  onSelect,
  options,
  isLoading,
  emptyMessage = "Aucun résultat",
  className,
  inputClassName,
  label,
}: SearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const listRef = React.useRef<HTMLUListElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const id = React.useId();
  const listId = `${id}-listbox`;

  const groups = React.useMemo(() => {
    const map = new Map<string, SearchOption[]>();
    for (const opt of options) {
      const g = opt.group ?? "";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(opt);
    }
    return Array.from(map.entries());
  }, [options]);

  React.useEffect(() => {
    setActiveIndex(-1);
  }, [options]);

  const totalOptions = options.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
      } else {
        setActiveIndex((prev) => Math.min(prev + 1, totalOptions - 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && activeIndex >= 0 && options[activeIndex]) {
        onSelect?.(options[activeIndex]);
        setOpen(false);
        setActiveIndex(-1);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  React.useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector<HTMLElement>(
        `[data-index="${activeIndex}"]`,
      );
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1 block text-sm font-medium text-text-primary"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
          }
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange?.(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          iconLeft={<Search className="h-4 w-4" aria-hidden="true" />}
          className={inputClassName}
        />
        {isLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          </span>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-surface shadow-md">
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="max-h-72 overflow-auto py-1"
          >
            {totalOptions === 0 && !isLoading ? (
              <li className="px-3 py-2 text-sm text-text-muted">
                {emptyMessage}
              </li>
            ) : (
              groups.map(([group, items]) => (
                <React.Fragment key={group}>
                  {group && (
                    <li className="px-3 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wide">
                      {group}
                    </li>
                  )}
                  {items.map((opt) => {
                    const globalIndex = options.indexOf(opt);
                    return (
                      <li
                        key={opt.id}
                        id={`${id}-option-${globalIndex}`}
                        role="option"
                        aria-selected={globalIndex === activeIndex}
                        data-index={globalIndex}
                        className={cn(
                          "cursor-pointer px-3 py-2 text-sm text-text-primary",
                          globalIndex === activeIndex && "bg-primary/10",
                        )}
                        onMouseEnter={() => setActiveIndex(globalIndex)}
                        onClick={() => {
                          onSelect?.(opt);
                          setOpen(false);
                          setActiveIndex(-1);
                        }}
                      >
                        <span className="block">{opt.label}</span>
                        {opt.meta && (
                          <span className="block text-xs text-text-muted">
                            {opt.meta}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
