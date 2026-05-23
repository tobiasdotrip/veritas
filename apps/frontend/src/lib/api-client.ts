import { QueryClient } from "@tanstack/react-query";
import type { ApiResponse, ApiSuccess } from "./api-types.js";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  instance?: string;
}

function parseErrorBody(
  body: Record<string, unknown>,
  statusText: string,
): { code: string; message: string } {
  if ("error" in body && body.error && typeof body.error === "object") {
    const err = body.error as { code?: string; message?: string };
    return {
      code: err.code ?? "UNKNOWN",
      message: err.message ?? statusText,
    };
  }

  if ("detail" in body || "title" in body) {
    const problem = body as ProblemDetails;
    return {
      code: problem.code ?? "UNKNOWN",
      message: problem.detail ?? problem.title ?? statusText,
    };
  }

  return { code: "UNKNOWN", message: statusText };
}

const API_BASE_URL =
  typeof import.meta.env !== "undefined" && import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : "http://localhost:3000/api/v1";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiSuccess<T>> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...options,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const { code, message } = parseErrorBody(body, res.statusText);
    throw new ApiError(res.status, code, message);
  }

  const body = (await res.json()) as ApiResponse<T>;
  if ("error" in body && body.error) {
    throw new ApiError(
      body.error.statusCode,
      body.error.code,
      body.error.message,
    );
  }
  const success = body as ApiSuccess<T>;
  if (success.meta !== undefined) {
    return { data: success.data, meta: success.meta };
  }
  return { data: success.data };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});
