import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BadgeVote } from "./BadgeVote";

describe("BadgeVote", () => {
  it.each([
    ["pour", "Pour"],
    ["contre", "Contre"],
    ["abstention", "Abstention"],
    ["absent", "Absent"],
  ] as const)("renders label for %s", (position, label) => {
    render(<BadgeVote position={position} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("hides label when showLabel is false", () => {
    render(<BadgeVote position="pour" showLabel={false} />);
    expect(screen.queryByText("Pour")).not.toBeInTheDocument();
  });
});
