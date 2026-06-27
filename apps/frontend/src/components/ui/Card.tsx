import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "hoverable" | "flat";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border bg-surface p-5 shadow-sm",
          variant !== "flat" && "border-border-light",
          variant === "flat" && "border-transparent bg-surface-raised shadow-none",
          variant === "hoverable" &&
            "transition-all duration-base hover:-translate-y-1 hover:border-primary-bg hover:shadow-md hover:shadow-primary/5",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";

export { Card };
