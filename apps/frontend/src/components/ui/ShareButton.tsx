import * as React from "react";
import { cn } from "@/lib/utils";
import { Share2, Check } from "lucide-react";

export interface ShareButtonProps {
  title?: string;
  text?: string;
  url: string;
  className?: string;
}

export function ShareButton({ title, text, url, className }: ShareButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const shareData: ShareData = { url };
        if (title) shareData.title = title;
        if (text) shareData.text = text;
        await navigator.share(shareData);
        return;
      } catch {
        // fallthrough to copy fallback
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "inline-flex h-10 min-w-[44px] items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30",
        className
      )}
      aria-label={copied ? "Lien copié" : "Partager"}
      title={copied ? "Lien copié" : "Partager"}
    >
      {copied ? (
        <Check className="h-4 w-4 text-success" aria-hidden="true" />
      ) : (
        <Share2 className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="sr-only sm:not-sr-only">
        {copied ? "Copié" : "Partager"}
      </span>
    </button>
  );
}
