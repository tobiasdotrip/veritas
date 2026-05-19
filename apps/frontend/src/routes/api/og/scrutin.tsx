// @ts-nocheck
// Stub — createAPIFileRoute n'est pas exporté par @tanstack/react-start 1.168.6
// Nécessite une mise à jour vers >=1.170 pour les routes API file-based.
import { createAPIFileRoute } from "@tanstack/react-start";
import satori from "satori";

export const APIRoute = createAPIFileRoute("/api/og/scrutin")({
  GET: async ({ request }: { request: Request }) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") ?? "scrutin";

    const svg = await satori(
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          backgroundColor: "#ffffff",
          padding: "48px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div style={{ fontSize: "24px", color: "#4b5563" }}>
            Scrutin n°{id}
          </div>
          <div style={{ fontSize: "48px", fontWeight: 700, color: "#111827" }}>
            Résultat du scrutin
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "auto",
          }}
        >
          {[
            { label: "Pour", value: "—", color: "#15803d" },
            { label: "Contre", value: "—", color: "#b91c1c" },
            { label: "Abstentions", value: "—", color: "#b45309" },
          ].map((k) => (
            <div
              key={k.label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                padding: "16px 24px",
                borderRadius: "12px",
                backgroundColor: "#f9fafb",
                minWidth: "160px",
              }}
            >
              <div style={{ fontSize: "16px", color: "#6b7280" }}>{k.label}</div>
              <div
                style={{ fontSize: "32px", fontWeight: 700, color: k.color }}
              >
                {k.value}
              </div>
            </div>
          ))}
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
