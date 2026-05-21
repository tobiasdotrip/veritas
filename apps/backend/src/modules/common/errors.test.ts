import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  TooManyRequestsError,
} from "./errors.js";

describe("AppError", () => {
  it("sets all properties correctly", () => {
    const err = new AppError("Something failed", "ERR_CODE", 500, {
      extra: true,
    });
    expect(err.message).toBe("Something failed");
    expect(err.code).toBe("ERR_CODE");
    expect(err.statusCode).toBe(500);
    expect(err.details).toEqual({ extra: true });
    expect(err.name).toBe("AppError");
  });

  it("captures stack trace", () => {
    const err = new AppError("test", "TEST", 400);
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain("AppError");
  });
});

describe("NotFoundError", () => {
  it("formats message with identifier", () => {
    const err = new NotFoundError("Deputy", "PA123");
    expect(err.message).toBe("Deputy 'PA123' not found");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.statusCode).toBe(404);
  });

  it("formats message without identifier", () => {
    const err = new NotFoundError("Resource");
    expect(err.message).toBe("Resource not found");
  });
});

describe("ValidationError", () => {
  it("sets correct code and status", () => {
    const err = new ValidationError("Bad input", { field: "name" });
    expect(err.message).toBe("Bad input");
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.statusCode).toBe(400);
    expect(err.details).toEqual({ field: "name" });
  });
});

describe("ConflictError", () => {
  it("sets correct code and status", () => {
    const err = new ConflictError("Already exists");
    expect(err.message).toBe("Already exists");
    expect(err.code).toBe("CONFLICT");
    expect(err.statusCode).toBe(409);
  });
});

describe("UnauthorizedError", () => {
  it("uses default message", () => {
    const err = new UnauthorizedError();
    expect(err.message).toBe("Unauthorized");
    expect(err.statusCode).toBe(401);
  });

  it("allows custom message", () => {
    const err = new UnauthorizedError("Custom auth error");
    expect(err.message).toBe("Custom auth error");
  });
});

describe("ForbiddenError", () => {
  it("uses default message", () => {
    const err = new ForbiddenError();
    expect(err.message).toBe("Forbidden");
    expect(err.statusCode).toBe(403);
  });
});

describe("TooManyRequestsError", () => {
  it("uses default message", () => {
    const err = new TooManyRequestsError();
    expect(err.message).toBe("Too many requests");
    expect(err.statusCode).toBe(429);
  });
});
