import { z } from "zod";

/** Slug thématique (ex. "sante", "economie-budget"). */
export const ThemeSlug = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
  .max(50);

export const ThemeSlugOptional = ThemeSlug.optional();

export const CursorPaginationQuery = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const OffsetPaginationQuery = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const SearchDeputiesQuery = z.object({
  q: z.string().min(1).max(100).optional(),
  department: z.string().length(2).optional(),
  circo: z.coerce.number().min(1).max(21).optional(),
  group: z.string().optional(),
  legislature: z.string().default("17"),
  ...OffsetPaginationQuery.shape,
});

export const DeputyVotesQuery = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  type: z
    .enum(["solennel", "motion_censure", "amendement", "budget", "autre"])
    .optional(),
  theme: ThemeSlugOptional,
  position: z.enum(["pour", "contre", "abstention", "nonVotant"]).optional(),
  ...CursorPaginationQuery.shape,
});

export const SearchScrutinsQuery = z.object({
  q: z.string().min(1).max(200).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  type: z.string().optional(),
  theme: ThemeSlugOptional,
  sort: z.enum(["date_desc", "date_asc", "relevance"]).default("date_desc"),
  ...CursorPaginationQuery.shape,
});

export const ScrutinVotesQuery = z.object({
  group: z.string().optional(),
  position: z.enum(["pour", "contre", "abstention", "nonVotant"]).optional(),
  ...OffsetPaginationQuery.shape,
});

export const CompareQuery = z.object({
  deputies: z.string().regex(/^PA\d+(,PA\d+){1,4}$/, {
    error: "2 à 5 députés requis (séparés par des virgules)",
  }),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
