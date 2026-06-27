import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConcordanceScore } from "./ConcordanceScore";

describe("ConcordanceScore", () => {
  it("renders score and common votes", () => {
    const { container } = render(<ConcordanceScore score={75.5} votesCommuns={42} />);

    expect(container.textContent).toContain("76%");
    expect(screen.getByText("42 votes communs")).toBeInTheDocument();
  });

  it("uses danger color for low score", () => {
    const { container } = render(<ConcordanceScore score={20} votesCommuns={5} />);
    expect(container.querySelector(".stroke-danger")).toBeInTheDocument();
  });

  it("uses success color for high score", () => {
    const { container } = render(<ConcordanceScore score={85} votesCommuns={10} />);
    expect(container.querySelector(".stroke-success")).toBeInTheDocument();
  });
});
