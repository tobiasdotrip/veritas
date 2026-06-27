import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KPIGrid } from "./KPIGrid";
import type { DeputyStats } from "@veritas/shared";

const baseStats: DeputyStats = {
  participationRate: 87.5,
  votesCast: 350,
  totalScrutins: 400,
  loyaltyRate: 92.1,
  votesAgainstGroup: 12,
};

describe("KPIGrid", () => {
  it("renders all KPI labels", () => {
    render(<KPIGrid stats={baseStats} />);

    expect(screen.getByText("Participation")).toBeInTheDocument();
    expect(screen.getByText("Votes exprimés")).toBeInTheDocument();
    expect(screen.getByText("Loyauté groupe")).toBeInTheDocument();
    expect(screen.getByText("Dissidences")).toBeInTheDocument();
  });

  it("displays formatted values", () => {
    render(<KPIGrid stats={baseStats} />);

    expect(screen.getByText("87.5")).toBeInTheDocument();
    expect(screen.getByText("350")).toBeInTheDocument();
    expect(screen.getByText("92.1")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders skeleton when stats is null", () => {
    const { container } = render(<KPIGrid stats={null} />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
