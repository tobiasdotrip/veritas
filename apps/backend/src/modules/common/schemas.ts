import { z } from "zod";

/**
 * Zod schema that accepts both Date instances and ISO datetime strings.
 * Used for response validation where Drizzle returns Date objects
 * but the API serializes them as ISO strings.
 */
export const DateString = z.preprocess(
  (val) => (val instanceof Date ? val.toISOString() : val),
  z.string().datetime()
);

export const NullableDateString = DateString.nullable();
