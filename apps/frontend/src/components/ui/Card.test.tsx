import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Contenu</Card>);
    expect(screen.getByText("Contenu")).toBeInTheDocument();
  });

  it("forwards native div attributes", () => {
    render(<Card data-testid="my-card">Contenu</Card>);
    expect(screen.getByTestId("my-card")).toBeInTheDocument();
  });
});
