import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import {
  createSerializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { getRedis } from "./modules/common/cache.js";
import { createRedisV5RateLimitStore } from "./modules/common/redis-rate-limit-store.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerJsonBodyParser } from "./plugins/json-body.js";
import { registerRequestLogger } from "./plugins/request-logger.js";
import { registerSecurityHeaders } from "./plugins/security-headers.js";
import { registerSwagger } from "./plugins/swagger.js";

import deputiesRoutes from "./modules/deputies/routes.js";
import scrutinsRoutes from "./modules/scrutins/routes.js";
import compareRoutes from "./modules/compare/routes.js";
import groupsRoutes from "./modules/groups/routes.js";
import searchRoutes from "./modules/search/routes.js";
import themesRoutes from "./modules/themes/routes.js";

const customSerializerCompiler = createSerializerCompiler({
  replacer(_key, value) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
});

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
    trustProxy: process.env.TRUSTED_PROXIES
      ? process.env.TRUSTED_PROXIES.split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : false,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(customSerializerCompiler);
  registerJsonBodyParser(app);

  await app.register(cors, {
    origin: process.env.NODE_ENV === "production" ? false : true,
  });

  await registerSecurityHeaders(app);

  const redisClient = await getRedis();

  await app.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute",
    keyGenerator: (req) => req.ips?.[0] ?? req.ip,
    store: createRedisV5RateLimitStore(redisClient),
    errorResponseBuilder: (_req, context) => ({
      type: "https://veritas.fr/errors/rate-limit",
      title: "Too Many Requests",
      status: 429,
      detail: `Rate limit exceeded. Retry after ${context.after}`,
      instance: _req.url,
    }),
  });

  registerRequestLogger(app);
  registerErrorHandler(app);
  await registerSwagger(app);

  await app.register(deputiesRoutes, { prefix: "/api/v1" });
  await app.register(scrutinsRoutes, { prefix: "/api/v1" });
  await app.register(compareRoutes, { prefix: "/api/v1" });
  await app.register(groupsRoutes, { prefix: "/api/v1" });
  await app.register(searchRoutes, { prefix: "/api/v1" });
  await app.register(themesRoutes, { prefix: "/api/v1" });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  return app;
}
