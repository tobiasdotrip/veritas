import type { FastifyInstance } from "fastify";

const DEFAULT_MAX_JSON_DEPTH = 20;

function parseJsonWithDepthLimit(raw: string, maxDepth: number): unknown {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i]!;
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      depth++;
      if (depth > maxDepth) {
        throw new Error(`JSON nesting depth exceeds maximum of ${maxDepth}`);
      }
    } else if (char === "}" || char === "]") {
      depth--;
    }
  }

  return JSON.parse(raw) as unknown;
}

export function registerJsonBodyParser(
  app: FastifyInstance,
  maxDepth = DEFAULT_MAX_JSON_DEPTH
): void {
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_req, body, done) => {
      try {
        const raw = typeof body === "string" ? body : body.toString("utf8");
        if (raw.length === 0) {
          done(null, undefined);
          return;
        }
        done(null, parseJsonWithDepthLimit(raw, maxDepth));
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );
}
