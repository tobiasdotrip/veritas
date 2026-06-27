import * as React from "react";
import { Input as DsfrInput } from "@codegouvfr/react-dsfr/Input";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "label"> {
  iconLeft?: React.ReactNode;
  clearable?: boolean;
  wrapperClassName?: string;
  label?: React.ReactNode;
  hideLabel?: boolean;
  iconId?: "fr-icon-search-line";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      iconLeft,
      iconId,
      clearable,
      wrapperClassName,
      label,
      hideLabel,
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
        <DsfrInput
          label={label ?? ""}
          hideLabel={hideLabel ?? false}
          className="w-full"
          {...(iconId || iconLeft ? { iconId: iconId ?? "fr-icon-search-line" } : {})}
          nativeInputProps={{
            ref,
            type,
            value,
            onChange,
            className: cn(clearable && "pr-10", className),
            ...props,
          }}
        />
        {clearable && hasValue && (
          <button
            type="button"
            onClick={() => {
              onChange?.({
                target: { value: "" },
              } as React.ChangeEvent<HTMLInputElement>);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full text-text-muted hover:bg-neutral-bg hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
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
