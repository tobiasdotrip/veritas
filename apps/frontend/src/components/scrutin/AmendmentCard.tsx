import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { cn } from "@/lib/utils";
import { FileText, ChevronDown, ExternalLink } from "lucide-react";
import type { Amendment } from "@/lib/api-types";

// ─── Constantes ────────────────────────────────────────────────

/** Seuil au-delà duquel le dispositif est tronqué */
const TRUNCATE_THRESHOLD = 800;
/** Nombre de caractères affichés avant troncature */
const TRUNCATE_PREVIEW = 500;

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Construit l'URL du site de l'Assemblée Nationale pour un amendement.
 * Format : https://www.assemblee-nationale.fr/dyn/17/amendements/{id}
 */
function buildAssembleeUrl(amendmentId: string): string {
  return `https://www.assemblee-nationale.fr/dyn/17/amendements/${amendmentId}`;
}

/**
 * Détermine si le dispositif doit être tronqué.
 */
function shouldTruncate(dispositif: string): boolean {
  return dispositif.length > TRUNCATE_THRESHOLD;
}

// ─── Sous-composants ───────────────────────────────────────────

interface AmendmentMetaProps {
  amendment: Amendment;
}

/** Étiquette info : "Amendement n°X · Article Y · par Auteur" */
function AmendmentMeta({ amendment }: AmendmentMetaProps) {
  const parts: string[] = [];

  if (amendment.numero) {
    parts.push(`Amendement n°${amendment.numero}`);
  }
  if (amendment.articleRef) {
    parts.push(amendment.articleRef);
  }
  if (amendment.auteurs) {
    parts.push(`par ${amendment.auteurs}`);
  }

  if (parts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className="inline-flex items-center rounded-md bg-primary-bg px-2.5 py-1 text-xs font-semibold text-primary"
        aria-label={parts.join(" · ")}
      >
        {parts.join(" · ")}
      </span>
    </div>
  );
}

interface DispositifContentProps {
  dispositif: string;
}

/** Corps du texte de l'amendement avec troncature si > 800 car. */
function DispositifContent({ dispositif }: DispositifContentProps) {
  const needsTruncation = shouldTruncate(dispositif);

  if (needsTruncation) {
    const preview = dispositif.slice(0, TRUNCATE_PREVIEW);
    return (
      <div>
        <p className="text-base leading-relaxed text-text-primary whitespace-pre-line max-w-[72ch]">
          {preview}…
        </p>
        <details className="mt-2">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 rounded min-h-[44px] min-w-[44px]">
            Lire la suite
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </summary>
          <p className="mt-2 text-base leading-relaxed text-text-primary whitespace-pre-line max-w-[72ch]">
            {dispositif}
          </p>
        </details>
      </div>
    );
  }

  return (
    <p className="text-base leading-relaxed text-text-primary whitespace-pre-line max-w-[72ch]">
      {dispositif}
    </p>
  );
}

interface ExposeAccordionProps {
  exposeSommaire: string;
}

/** Sous-accordéon pour l'exposé des motifs */
function ExposeAccordion({ exposeSommaire }: ExposeAccordionProps) {
  return (
    <AccordionPrimitive.Root type="single" collapsible>
      <AccordionPrimitive.Item
        value="expose"
        className="overflow-hidden rounded-lg border border-border-light"
      >
        <AccordionPrimitive.Header>
          <AccordionPrimitive.Trigger className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-text-secondary transition-colors hover:bg-primary-bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 [&[data-state=open]>svg]:rotate-180 min-h-[44px]">
            <span>Voir l&apos;exposé des motifs</span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-200"
              aria-hidden="true"
            />
          </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
        <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="border-t border-border-light px-4 py-3">
            <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line max-w-[72ch]">
              {exposeSommaire}
            </p>
          </div>
        </AccordionPrimitive.Content>
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  );
}

interface AssembleeLinkProps {
  amendmentId: string;
}

/** Lien vers le site de l'Assemblée Nationale */
function AssembleeLink({ amendmentId }: AssembleeLinkProps) {
  return (
    <a
      href={buildAssembleeUrl(amendmentId)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 rounded min-h-[44px] min-w-[44px]"
      aria-label="Voir sur le site de l'Assemblée Nationale (nouvelle fenêtre)"
    >
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      Voir sur le site de l&apos;Assemblée Nationale
    </a>
  );
}

// ─── Composant principal ────────────────────────────────────────

export interface AmendmentCardProps {
  amendment: Amendment | null;
  className?: string;
}

/**
 * Carte accordéon affichant le texte d'un amendement.
 *
 * - Accordéon principal "Lire le texte de l'amendement" (fermé par défaut)
 * - Texte du dispositif, tronqué à 500 car. si > 800 car.
 * - Sous-accordéon "Voir l'exposé des motifs" si présent
 * - Lien vers le site de l'Assemblée Nationale
 *
 * Si `amendment` est `null`, le composant ne rend rien.
 */
export function AmendmentCard({ amendment, className }: AmendmentCardProps) {
  // ── Rien à afficher ──
  if (!amendment) {
    return null;
  }

  const hasDispositif = !!amendment.dispositif;
  const hasExpose = !!amendment.exposeSommaire;
  const hasLink = !!amendment.id;

  return (
    <section
      className={cn("space-y-3", className)}
      aria-label="Texte de l'amendement"
    >
      <AccordionPrimitive.Root type="single" collapsible>
        <AccordionPrimitive.Item
          value="amendment"
          className="overflow-hidden rounded-xl border border-border-light bg-surface shadow-sm"
        >
          {/* ── Trigger ── */}
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-bg-subtle focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 [&[data-state=open]>[data-chevron]]:rotate-180 min-h-[48px]">
              <div className="flex min-w-0 items-center gap-2.5">
                <FileText
                  className="h-[18px] w-[18px] shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-text-primary truncate">
                  Lire le texte de l&apos;amendement
                </span>
              </div>
              <ChevronDown
                data-chevron
                className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-200"
                aria-hidden="true"
              />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>

          {/* ── Contenu ── */}
          <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="border-t border-border-light px-4 py-4 space-y-4">
              {/* Métadonnées de l'amendement */}
              <AmendmentMeta amendment={amendment} />

              {/* Dispositif (corps du texte) */}
              {hasDispositif ? (
                <DispositifContent dispositif={amendment.dispositif!} />
              ) : (
                <p className="text-sm text-text-muted italic">
                  Texte non disponible.
                </p>
              )}

              {/* Exposé des motifs */}
              {hasExpose && (
                <ExposeAccordion exposeSommaire={amendment.exposeSommaire!} />
              )}

              {/* Lien Assemblée Nationale */}
              {hasLink && <AssembleeLink amendmentId={amendment.id!} />}
            </div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      </AccordionPrimitive.Root>
    </section>
  );
}

export default AmendmentCard;
