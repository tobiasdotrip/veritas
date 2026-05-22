import { describe, it, expect } from "vitest";
import {
  encodeCursor,
  decodeCursor,
  buildCursorResponse,
  buildOffsetResponse,
} from "./pagination.js";
import { ValidationError } from "./errors.js";

describe("encodeCursor / decodeCursor", () => {
  it("encodes and decodes a cursor correctly", () => {
    const original = { date: "2024-01-15", id: "PA123" };
    const encoded = encodeCursor(original);
    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual(original);
  });

  it("produces base64url-safe output", () => {
    const encoded = encodeCursor({ date: "2024-01-15", id: "PA123" });
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");
  });

  it("throws ValidationError on invalid base64", () => {
    expect(() => decodeCursor("!!!not-valid!!!")).toThrow(ValidationError);
    expect(() => decodeCursor("!!!not-valid!!!")).toThrow(
      "Invalid cursor format",
    );
  });

  it("throws ValidationError on missing date field", () => {
    const encoded = encodeCursor({ id: "PA123" });
    expect(() => decodeCursor(encoded)).toThrow(ValidationError);
    expect(() => decodeCursor(encoded)).toThrow("Invalid cursor structure");
  });

  it("throws ValidationError on missing id field", () => {
    const encoded = encodeCursor({ date: "2024-01-15" });
    expect(() => decodeCursor(encoded)).toThrow(ValidationError);
  });

  it("throws ValidationError on non-object payload", () => {
    const encoded = Buffer.from('"just-a-string"').toString("base64url");
    expect(() => decodeCursor(encoded)).toThrow(ValidationError);
  });

  it("throws ValidationError on oversized cursor", () => {
    const huge = "a".repeat(2049);
    expect(() => decodeCursor(huge)).toThrow(ValidationError);
    expect(() => decodeCursor(huge)).toThrow("Cursor too large");
  });
});

describe("buildCursorResponse", () => {
  it("returns empty result for empty items", () => {
    const result = buildCursorResponse(
      [] as Array<{ date: string; id: string }>,
      20,
      (item) => ({ date: item.date, id: item.id }),
    );
    expect(result.data).toEqual([]);
    expect(result.nextCursor).toBeNull();
    expect(result.hasMore).toBe(false);
  });

  it("returns items without cursor when length <= limit", () => {
    const items = [{ date: "2024-01-01", id: "PA1" }];
    const result = buildCursorResponse(items, 20, (item) => ({
      date: item.date,
      id: item.id,
    }));
    expect(result.data).toEqual(items);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("truncates to limit and returns cursor when there are more items", () => {
    const items = [
      { date: "2024-01-03", id: "PA3" },
      { date: "2024-01-02", id: "PA2" },
      { date: "2024-01-01", id: "PA1" },
    ];
    const result = buildCursorResponse(items, 2, (item) => ({
      date: item.date,
      id: item.id,
    }));
    expect(result.data).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBeDefined();
    // cursor should encode the last item in the truncated list
    const decoded = decodeCursor(result.nextCursor!);
    expect(decoded).toEqual({ date: "2024-01-02", id: "PA2" });
  });
});

describe("buildOffsetResponse", () => {
  it("returns correct offset response", () => {
    const items = [{ id: 1 }, { id: 2 }];
    const result = buildOffsetResponse(items, 100, 20, 0);
    expect(result.data).toEqual(items);
    expect(result.total).toBe(100);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });
});
