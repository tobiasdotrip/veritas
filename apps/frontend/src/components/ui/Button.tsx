import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-base focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 disabled:pointer-events-none disabled:opacity-50 min-h-[44px] min-w-[44px] cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-sm",
        secondary:
          "bg-surface-raised text-text-primary border border-border-light hover:bg-primary-bg-subtle hover:border-primary-bg",
        ghost:
          "bg-transparent text-text-secondary hover:bg-primary-bg-subtle hover:text-primary",
        danger: "bg-danger text-white hover:bg-accent-hover shadow-sm",
        outline:
          "border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-white",
      },
      size: {
        sm: "px-3 py-1.5 text-sm rounded-md",
        md: "px-5 py-2.5 text-base rounded-lg",
        lg: "px-6 py-3 text-lg rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, isLoading, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
