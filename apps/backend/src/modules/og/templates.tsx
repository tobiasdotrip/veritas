import type { ReactNode } from "react";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

function OgShell({
  children,
  align = "flex-start",
}: {
  children: ReactNode;
  align?: "flex-start" | "center";
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align,
        justifyContent: align === "center" ? "center" : "flex-start",
        width: `${OG_WIDTH}px`,
        height: `${OG_HEIGHT}px`,
        backgroundColor: "#ffffff",
        padding: "48px",
        fontFamily: "sans-serif",
        gap: "24px",
      }}
    >
      {children}
    </div>
  );
}

function StatBox({
  label,
  value,
  color = "#111827",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
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
      <div style={{ display: "flex", fontSize: "16px", color: "#6b7280" }}>
        {label}
      </div>
      <div
        style={{ display: "flex", fontSize: "32px", fontWeight: 700, color }}
      >
        {value}
      </div>
    </div>
  );
}

export function DeputyOgTemplate(props: {
  firstName: string;
  lastName: string;
  groupAbbreviation: string | null;
  participationRate: number;
  loyaltyRate: number;
  votesCast: number;
}) {
  return (
    <OgShell>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "120px",
            height: "120px",
            borderRadius: "9999px",
            backgroundColor: "#f3f4f6",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "48px",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            {`${props.firstName} ${props.lastName}`}
          </div>
          <div style={{ display: "flex", fontSize: "24px", color: "#4b5563" }}>
            {`${props.groupAbbreviation ?? "Groupe inconnu"} — Veritas`}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "24px", marginTop: "auto" }}>
        <StatBox
          label="Participation"
          value={`${props.participationRate.toFixed(0)}%`}
        />
        <StatBox label="Loyauté" value={`${props.loyaltyRate.toFixed(0)}%`} />
        <StatBox label="Votes" value={String(props.votesCast)} />
      </div>
    </OgShell>
  );
}

export function ScrutinOgTemplate(props: {
  numero: number;
  titre: string;
  sortCode: string | null;
  nombrePour: number | null;
  nombreContre: number | null;
  nombreAbstentions: number | null;
}) {
  return (
    <OgShell>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", fontSize: "24px", color: "#4b5563" }}>
          {`Scrutin n°${props.numero}`}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: "40px",
            fontWeight: 700,
            color: "#111827",
            lineHeight: 1.2,
          }}
        >
          {props.titre}
        </div>
        {props.sortCode ? (
          <div style={{ display: "flex", fontSize: "20px", color: "#6b7280" }}>
            {`Résultat : ${props.sortCode}`}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: "24px", marginTop: "auto" }}>
        <StatBox
          label="Pour"
          value={String(props.nombrePour ?? "—")}
          color="#15803d"
        />
        <StatBox
          label="Contre"
          value={String(props.nombreContre ?? "—")}
          color="#b91c1c"
        />
        <StatBox
          label="Abstentions"
          value={String(props.nombreAbstentions ?? "—")}
          color="#b45309"
        />
      </div>
    </OgShell>
  );
}

export function CompareOgTemplate(props: { score: number }) {
  return (
    <OgShell align="center">
      <div style={{ display: "flex", fontSize: "32px", color: "#4b5563" }}>
        Comparateur de votes
      </div>
      <div
        style={{
          display: "flex",
          fontSize: "96px",
          fontWeight: 700,
          color: "#111827",
        }}
      >
        {`${props.score.toFixed(0)}%`}
      </div>
      <div style={{ display: "flex", fontSize: "24px", color: "#6b7280" }}>
        Concordance entre les députés sélectionnés
      </div>
    </OgShell>
  );
}

export const OG_DIMENSIONS = { width: OG_WIDTH, height: OG_HEIGHT };
