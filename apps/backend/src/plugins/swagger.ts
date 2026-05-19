import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

export async function registerSwagger(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Veritas API",
        description: "API de transparence des votes parlementaires",
        version: "1.0.0",
        contact: {
          name: "Veritas Team",
          url: "https://github.com/tobiasdotrip/veritas",
        },
      },
      servers: [
        {
          url: process.env.API_BASE_URL ?? "http://localhost:3000",
          description: "API Server",
        },
      ],
      tags: [
        { name: "Députés", description: "Informations sur les députés" },
        { name: "Scrutins", description: "Votes parlementaires" },
        { name: "Groupes", description: "Groupes politiques" },
        { name: "Comparateur", description: "Comparaison de députés" },
        { name: "Recherche", description: "Suggestions et recherche globale" },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: "apiKey",
            name: "x-api-key",
            in: "header",
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });
}
