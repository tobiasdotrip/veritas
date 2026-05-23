import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "hoverable" | "flat";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-border-light bg-surface",
          variant === "default" && "p-4 shadow-sm",
          variant === "flat" && "p-4",
          variant === "hoverable" &&
            "p-4 shadow-sm transition-all duration-base hover:shadow-md hover:-translate-y-px",
          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

export { Card };
