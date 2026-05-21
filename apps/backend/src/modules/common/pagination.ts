import { z } from "zod";
import { ValidationError } from "./errors.js";

export const CursorPaginationQuery = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const OffsetPaginationQuery = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type CursorPaginationInput = z.infer<typeof CursorPaginationQuery>;
export type OffsetPaginationInput = z.infer<typeof OffsetPaginationQuery>;

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface OffsetPaginationResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export function encodeCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

const MAX_CURSOR_LENGTH = 1024;

export function decodeCursor(cursor: string): { date: string; id: string } {
  if (cursor.length > MAX_CURSOR_LENGTH) {
    throw new ValidationError("Cursor too large");
  }
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8")) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "date" in parsed &&
      "id" in parsed &&
      typeof (parsed as Record<string, unknown>).date === "string" &&
      typeof (parsed as Record<string, unknown>).id === "string"
    ) {
      return parsed as { date: string; id: string };
    }
    throw new ValidationError("Invalid cursor structure");
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError("Invalid cursor format");
  }
}

export function buildCursorResponse<T extends Record<string, unknown>>(
  items: T[],
  limit: number,
  cursorBuilder: (item: T) => { date: string; id: string }
): CursorPaginationResult<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const lastItem = data[data.length - 1];
  const nextCursor = lastItem ? encodeCursor(cursorBuilder(lastItem)) : null;

  return {
    data,
    nextCursor: hasMore ? nextCursor : null,
    hasMore,
  };
}

export function buildOffsetResponse<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number
): OffsetPaginationResult<T> {
  return {
    data: items,
    total,
    limit,
    offset,
  };
}
