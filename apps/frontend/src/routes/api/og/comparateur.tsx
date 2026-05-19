// @ts-nocheck
// Stub — createAPIFileRoute n'est pas exporté par @tanstack/react-start 1.168.6
// Nécessite une mise à jour vers >=1.170 pour les routes API file-based.
import { createAPIFileRoute } from "@tanstack/react-start";
import satori from "satori";

export const APIRoute = createAPIFileRoute("/api/og/comparateur")({
  GET: async ({ request }: { request: Request }) => {
    const { searchParams } = new URL(request.url);
    const score = searchParams.get("score") ?? "0";

    const svg = await satori(
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "1200px",
          height: "630px",
          backgroundColor: "#ffffff",
          padding: "48px",
          fontFamily: "sans-serif",
          gap: "24px",
        }}
      >
        <div style={{ fontSize: "32px", color: "#4b5563" }}>
          Comparateur de votes
        </div>
        <div style={{ fontSize: "96px", fontWeight: 700, color: "#111827" }}>
          {score}%
        </div>
        <div style={{ fontSize: "24px", color: "#6b7280" }}>
          Concordance entre les députés sélectionnés
        </div>
      </div>,
      { width: 1200, height: 630, fonts: [] }
    );

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  },
});
