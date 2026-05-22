import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./EmptyState";
import { ErrorFallback } from "./ErrorFallback";
import { SkeletonCard } from "./SkeletonCard";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState title="Aucun vote" description="Aucun résultat trouvé." />,
    );

    expect(screen.getByText("Aucun vote")).toBeInTheDocument();
    expect(screen.getByText("Aucun résultat trouvé.")).toBeInTheDocument();
  });

  it("renders optional action", () => {
    render(
      <EmptyState
        title="Vide"
        action={<button type="button">Réessayer</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });
});

describe("ErrorFallback", () => {
  it("exposes alert role with custom message", () => {
    render(
      <ErrorFallback
        title="Erreur réseau"
        description="Le serveur ne répond pas."
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Erreur réseau")).toBeInTheDocument();
    expect(screen.getByText("Le serveur ne répond pas.")).toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<ErrorFallback onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("SkeletonCard", () => {
  it("marks loading state for assistive technologies", () => {
    render(<SkeletonCard lines={2} />);

    const busy = document.querySelector("[aria-busy='true']");
    expect(busy).toBeInTheDocument();
    expect(busy).toHaveAttribute("aria-live", "polite");
  });
});
