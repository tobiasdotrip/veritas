import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BadgeResultat } from "./BadgeResultat";

describe("BadgeResultat", () => {
  it.each([
    ["adopté", "Adopté"],
    ["rejeté", "Rejeté"],
  ] as const)("renders label for %s", (resultat, label) => {
    render(<BadgeResultat resultat={resultat} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("renders unknown state", () => {
    render(<BadgeResultat resultat={null} />);
    expect(screen.getByText("En cours")).toBeInTheDocument();
  });
});
