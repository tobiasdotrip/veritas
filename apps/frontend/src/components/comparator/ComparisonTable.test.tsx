import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComparisonTable } from "./ComparisonTable";
import type { ComparisonResult } from "@/lib/api-types";

const result: ComparisonResult = {
  deputies: [
    {
      id: "PA1",
      slug: "jean-dupont",
      firstName: "Jean",
      lastName: "Dupont",
      photoUrl: null,
    },
    {
      id: "PA2",
      slug: "marie-durand",
      firstName: "Marie",
      lastName: "Durand",
      photoUrl: null,
    },
  ],
  identicalVotes: 8,
  concordanceRate: 80,
  totalCommonVotes: 10,
  divergences: [
    {
      scrutinId: "S1",
      numero: 1234,
      titre: "Projet de loi sur l'énergie",
      dateScrutin: "2024-01-15",
      sortCode: "adopté",
      positions: [
        {
          deputyId: "PA1",
          firstName: "Jean",
          lastName: "Dupont",
          slug: "jean-dupont",
          groupAbbreviation: "LFI-NFP",
          position: "pour",
        },
        {
          deputyId: "PA2",
          firstName: "Marie",
          lastName: "Durand",
          slug: "marie-durand",
          groupAbbreviation: "RE",
          position: "contre",
        },
      ],
    },
  ],
  pairwise: [],
};

describe("ComparisonTable", () => {
  it("renders deputy names in header", () => {
    render(<ComparisonTable result={result} />);
    expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    expect(screen.getByText("Marie Durand")).toBeInTheDocument();
  });

  it("renders scrutin details", () => {
    render(<ComparisonTable result={result} />);
    expect(
      screen.getByText("Projet de loi sur l'énergie"),
    ).toBeInTheDocument();
    expect(screen.getByText("Adopté")).toBeInTheDocument();
  });
});
