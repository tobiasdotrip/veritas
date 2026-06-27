import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { VoteCard } from "./VoteCard";
import { renderWithRouter } from "@/test-utils";
import type { DeputeVoteItem } from "@/lib/api-types";

const vote: DeputeVoteItem = {
  scrutinId: "S1",
  numero: 1234,
  titre: "Projet de loi sur l'énergie",
  dateScrutin: "2024-01-15",
  position: "pour",
  alignment: "aligned",
  codeTypeVote: "SPO",
  sortCode: "adopté",
  parDelegation: false,
  groupPosition: "pour",
};

describe("VoteCard", () => {
  it("renders vote title", async () => {
    renderWithRouter(<VoteCard vote={vote} />);
    expect(
      await screen.findByText("Projet de loi sur l'énergie"),
    ).toBeInTheDocument();
  });

  it("renders vote badge", async () => {
    renderWithRouter(<VoteCard vote={vote} />);
    expect(await screen.findByText("Pour")).toBeInTheDocument();
  });
});
