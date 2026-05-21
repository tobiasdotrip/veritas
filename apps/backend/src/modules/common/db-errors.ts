import { ValidationError } from "./errors.js";

export function isInvalidTextSearchError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  if ("code" in err && (err as { code: unknown }).code === "42601") return true;
  if ("cause" in err && (err as { cause: unknown }).cause) {
    return isInvalidTextSearchError((err as { cause: unknown }).cause);
  }
  return false;
}

export function rethrowTextSearchValidationError(err: unknown): void {
  if (isInvalidTextSearchError(err)) {
    throw new ValidationError("Invalid search query syntax");
  }
}

export async function withTextSearchErrorHandling<T>(
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    rethrowTextSearchValidationError(err);
    throw err;
  }
}
