import type { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";

const isProduction = process.env.NODE_ENV === "production";

export async function registerSecurityHeaders(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", "data:", "https:"],
        objectSrc: ["'none'"],
        scriptSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"],
        ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
      },
    },
  });

  app.addHook("onSend", async (_req, reply) => {
    reply.header("X-Robots-Tag", "noindex, nofollow");
  });

  app.get("/robots.txt", async (_req, reply) => {
    return reply.type("text/plain").send("User-agent: *\nDisallow: /\n");
  });
}
