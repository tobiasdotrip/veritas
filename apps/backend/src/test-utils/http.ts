import type { FastifyInstance, InjectOptions } from "fastify";
import { buildApp } from "../app.js";
import { closeDb } from "../db/client.js";
import { closeRedis } from "../modules/common/cache.js";

export async function createTestApp(): Promise<FastifyInstance> {
  return buildApp();
}

export async function destroyTestApp(app: FastifyInstance): Promise<void> {
  await app.close();
  await closeRedis();
  await closeDb();
}

export interface InjectedResponse<T> {
  status: number;
  body: T;
  headers: Record<string, string>;
}

export async function injectJson<T>(
  app: FastifyInstance,
  options: InjectOptions,
): Promise<InjectedResponse<T>> {
  const response = await app.inject(options);
  const contentType = response.headers["content-type"] ?? "";

  let body: T;
  if (contentType.includes("application/json") && response.body.length > 0) {
    body = JSON.parse(response.body) as T;
  } else {
    body = response.body as T;
  }

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(response.headers)) {
    if (typeof value === "string") headers[key] = value;
  }

  return {
    status: response.statusCode,
    body,
    headers,
  };
}
