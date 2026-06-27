import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(
  date: Date | string | null | undefined,
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Met en forme un titre en français : première lettre en majuscule,
 * le reste inchangé. Contraire à `capitalize` CSS qui met chaque mot en majuscule.
 */
export function formatTitle(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (trimmed.length === 0) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Extrait le sujet principal d'un titre de scrutin de l'Assemblée nationale.
 * Les titres suivent souvent le motif : "L'amendement n° X de M. ... au projet de loi ...".
 * On isole le nom du texte pour éviter la répétition visuelle sur les listes.
 */
export function extractScrutinSubject(
  input: string | null | undefined,
): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (trimmed.length === 0) return "";

  const match = trimmed.match(
    /(?:du projet de loi|de la proposition de loi|du texte|sur le projet de loi|sur la proposition de loi|sur le texte)\s+(constitutionnelle?|organique|de finances|de financement|de ratification|de programmation|de simplification|de modernisation|portant|visant|relatif|relative|réformant|instituant|interdisant|autorisant|réprimant|punissant|d'orientation|de lutte|de protection|de sécurité|de défense|de justice|de santé|de l'enseignement|de l'éducation|de la famille|de la justice|de la fonction|de la commande|de la mobilité|de la recherche|de la transition|contre|pour|sur|modifiant|complétant|abrogeant|prorogeant|étendant|créant|supprimant|fixant|définissant|renforçant|assouplissant|allongeant|prolongeant|raccourcissant|allégeant|améliorant|accélérant|facilitant|favorisant|permettant|maintenant|rétablissant)(?:\s+.+?)?(?:\s*\(premi[èe]re lecture\)|\s*\(deuxi[èe]me lecture\)|\s*\(lecture unique\)|\s*\(nouvelle lecture\)|\s*$)/i,
  );
  if (match?.[0]) {
    const subject = match[0]
      .replace(/^(du |de la |sur le |de |sur )/i, "")
      .trim()
      .replace(/[.,;:!?]+$/, "");
    return formatTitle(subject);
  }

  return formatTitle(trimmed.slice(0, 80));
}

/**
 * URL de la photo officielle d'un député.
 * L'AN utilise un schéma standard : ID numérique sans le préfixe PA.
 * Ex: PA793214 → https://www2.assemblee-nationale.fr/static/tribun/17/photos/793214.jpg
 */
export function getDeputyPhotoUrl(deputyId: string): string {
  const numericId = deputyId.replace(/^PA/i, "");
  return `https://www2.assemblee-nationale.fr/static/tribun/17/photos/${numericId}.jpg`;
}
