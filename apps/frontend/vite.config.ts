import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  server: {
    port: Number(process.env.PORT ?? 3001),
  },
  ssr: {
    noExternal: ["@codegouvfr/react-dsfr"],
  },
  optimizeDeps: {
    include: ["@codegouvfr/react-dsfr"],
  },
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    process.env.VITEST !== "true" &&
      tanstackStart({
        client: {
          entry: "./src/client.tsx",
        },
      }),
    react(),
  ],
});
