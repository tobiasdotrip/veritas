import { cn } from "@/lib/utils";

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100]",
        "rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-md",
      )}
    >
      Aller au contenu principal
    </a>
  );
}
