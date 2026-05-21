import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  iconLeft?: React.ReactNode;
  clearable?: boolean;
  wrapperClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      iconLeft,
      clearable,
      wrapperClassName,
      type = "text",
      value,
      onChange,
      ...props
    },
    ref,
  ) => {
    const hasValue = String(value ?? "").length > 0;

    return (
      <div className={cn("relative flex items-center", wrapperClassName)}>
        {iconLeft && (
          <span className="pointer-events-none absolute left-3 text-text-muted">
            {iconLeft}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            "flex h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50",
            iconLeft && "pl-10",
            clearable && "pr-10",
            className,
          )}
          value={value}
          onChange={onChange}
          {...props}
        />
        {clearable && hasValue && (
          <button
            type="button"
            onClick={() => {
              const input = (ref as React.RefObject<HTMLInputElement | null>)
                ?.current;
              if (input) {
                input.value = "";
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.focus();
              }
              onChange?.({
                target: { value: "" },
              } as React.ChangeEvent<HTMLInputElement>);
            }}
            className="absolute right-3 inline-flex h-6 w-6 items-center justify-center rounded-full text-text-muted hover:bg-neutral-bg hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label="Effacer la saisie"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
