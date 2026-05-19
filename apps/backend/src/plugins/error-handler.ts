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

    // Fastify built-in errors (e.g. rate limit)
    if (isErrorWithStatusCode(err) && err.statusCode >= 400 && err.statusCode < 500) {
      const problem: ProblemDetails = {
        type: "https://veritas.fr/errors/client-error",
        title: err.name ?? "Client Error",
        status: err.statusCode,
        detail: err.message ?? "Client error",
        instance: req.url,
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
