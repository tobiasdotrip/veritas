import { z } from "zod";

export const OgDeputeQuery = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^(PA[A-Z0-9_]+|[a-z0-9][a-z0-9-]*[a-z0-9])$/, {
      error: "Invalid deputy slug or ID",
    }),
  legislature: z.string().default("17"),
});

export const OgScrutinQuery = z.object({
  id: z.string().min(1).max(50),
});

export const OgCompareQuery = z.object({
  score: z.coerce.number().min(0).max(100),
});
