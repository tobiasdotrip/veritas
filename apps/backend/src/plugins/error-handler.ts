import type { FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from "fastify-type-provider-zod";
import { AppError } from "../modules/common/errors.js";

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code?: string;
  errors?: unknown[];
}

function isErrorWithStatusCode(err: unknown): err is { statusCode: number; name?: string; message?: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    typeof (err as { statusCode: unknown }).statusCode === "number"
  );
}

function isErrorWithCode(err: unknown): err is { code: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
  );
}

const FASTIFY_CLIENT_ERROR_DETAILS: Record<string, string> = {
  FST_ERR_VALIDATION: "Request validation failed",
  FST_ERR_CTP_EMPTY_JSON_BODY: "Request body is empty",
  FST_ERR_CTP_INVALID_MEDIA_TYPE: "Unsupported media type",
  FST_ERR_CTP_INVALID_CONTENT_LENGTH: "Invalid content length",
  FST_ERR_NOT_FOUND: "Route not found",
  FST_ERR_BAD_URL: "Malformed URL",
};

const STATUS_CLIENT_ERROR_DETAILS: Record<number, string> = {
  400: "Bad request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not found",
  405: "Method not allowed",
  409: "Conflict",
  413: "Payload too large",
  415: "Unsupported media type",
  422: "Unprocessable entity",
  429: "Too many requests",
};

const STATUS_CLIENT_ERROR_TITLES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  413: "Payload Too Large",
  415: "Unsupported Media Type",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
};

function getSafeClientErrorDetail(err: unknown, statusCode: number): string {
  if (isErrorWithCode(err)) {
    const mapped = FASTIFY_CLIENT_ERROR_DETAILS[err.code];
    if (mapped) return mapped;
  }
  return STATUS_CLIENT_ERROR_DETAILS[statusCode] ?? "Client error";
}

function getSafeClientErrorTitle(statusCode: number): string {
  return STATUS_CLIENT_ERROR_TITLES[statusCode] ?? "Client Error";
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err: unknown, req, reply) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    req.log.error({ err: errorMessage, stack: errorStack }, "Request error");

    if (hasZodFastifySchemaValidationErrors(err)) {
      const problem: ProblemDetails = {
        type: "https://veritas.fr/errors/validation",
        title: "Validation Error",
        status: 400,
        detail: "Request validation failed",
        instance: req.url,
        code: "VALIDATION_ERROR",
        errors: err.validation,
      };
      return reply.status(400).header("Content-Type", "application/problem+json").send(problem);
    }

    if (isResponseSerializationError(err)) {
      const problem: ProblemDetails = {
        type: "https://veritas.fr/errors/serialization",
        title: "Response Serialization Error",
        status: 500,
        detail: "Internal server error",
        instance: req.url,
        code: "SERIALIZATION_ERROR",
      };
      return reply.status(500).header("Content-Type", "application/problem+json").send(problem);
    }

    if (err instanceof AppError) {
      const problem: ProblemDetails = {
        type: `https://veritas.fr/errors/${err.code.toLowerCase()}`,
        title: err.name,
        status: err.statusCode,
        detail: err.message,
        instance: req.url,
        code: err.code,
      };
      return reply.status(err.statusCode).header("Content-Type", "application/problem+json").send(problem);
    }

    // Fastify / third-party client errors — never expose raw err.message
    if (isErrorWithStatusCode(err) && err.statusCode >= 400 && err.statusCode < 500) {
      const problem: ProblemDetails = {
        type: "https://veritas.fr/errors/client-error",
        title: getSafeClientErrorTitle(err.statusCode),
        status: err.statusCode,
        detail: getSafeClientErrorDetail(err, err.statusCode),
        instance: req.url,
        ...(isErrorWithCode(err) && err.code.startsWith("FST_") ? { code: err.code } : {}),
      };
      return reply.status(err.statusCode).header("Content-Type", "application/problem+json").send(problem);
    }

    // Unknown server errors
    const problem: ProblemDetails = {
      type: "https://veritas.fr/errors/internal",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred",
      instance: req.url,
      code: "INTERNAL_ERROR",
    };

    return reply.status(500).header("Content-Type", "application/problem+json").send(problem);
  });
}
