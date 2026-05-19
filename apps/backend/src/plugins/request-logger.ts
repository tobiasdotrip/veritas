import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export function registerRequestLogger(app: FastifyInstance): void {
  app.addHook("onRequest", async (req: FastifyRequest) => {
    req.log.info(
      {
        req: {
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.ip,
          userAgent: req.headers["user-agent"],
        },
      },
      "Incoming request"
    );
  });

  app.addHook("onResponse", async (req: FastifyRequest, reply: FastifyReply) => {
    req.log.info(
      {
        req: {
          id: req.id,
          method: req.method,
          url: req.url,
        },
        res: {
          statusCode: reply.statusCode,
          responseTime: reply.elapsedTime,
        },
      },
      "Request completed"
    );
  });
}
