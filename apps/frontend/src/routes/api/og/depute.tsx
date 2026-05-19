// @ts-nocheck
// Stub — createAPIFileRoute n'est pas exporté par @tanstack/react-start 1.168.6
// Nécessite une mise à jour vers >=1.170 pour les routes API file-based.
import { createAPIFileRoute } from "@tanstack/react-start";
import satori from "satori";

export const APIRoute = createAPIFileRoute("/api/og/depute")({
  GET: async ({ request }: { request: Request }) => {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "depute";

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
            alignItems: "center",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "9999px",
              backgroundColor: "#f3f4f6",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "48px", fontWeight: 700, color: "#111827" }}>
              {slug}
            </div>
            <div style={{ fontSize: "24px", color: "#4b5563" }}>
              Fiche député — Veritas
            </div>
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
            { label: "Participation", value: "—" },
            { label: "Loyauté", value: "—" },
            { label: "Votes", value: "—" },
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
              <div style={{ fontSize: "32px", fontWeight: 700, color: "#111827" }}>
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
