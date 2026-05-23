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
 * URL de la photo officielle d'un député.
 * L'AN utilise un schéma standard : ID numérique sans le préfixe PA.
 * Ex: PA793214 → https://www2.assemblee-nationale.fr/static/tribun/17/photos/793214.jpg
 */
export function getDeputyPhotoUrl(deputyId: string): string {
  const numericId = deputyId.replace(/^PA/i, "");
  return `https://www2.assemblee-nationale.fr/static/tribun/17/photos/${numericId}.jpg`;
}
