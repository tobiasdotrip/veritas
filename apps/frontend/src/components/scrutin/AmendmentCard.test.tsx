import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AmendmentCard } from "./AmendmentCard";
import type { Amendment } from "@/lib/api-types";

const amendmentFixture: Amendment = {
  id: "AMANR5L17N1867",
  numero: "1867 rect.",
  dispositif: "Texte court de dispositif.",
  exposeSommaire: "Exposé détaillé de l'amendement.",
  auteurs: "Jean Dupont ; Groupe RE",
  articleRef: "Art. 4",
  sortCode: "adopté",
};

describe("components/scrutin/AmendmentCard", () => {
  it("ne rend rien quand amendment est null", () => {
    const { container } = render(<AmendmentCard amendment={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("affiche le trigger principal", () => {
    render(<AmendmentCard amendment={amendmentFixture} />);
    expect(
      screen.getByRole("button", { name: /Lire le texte de l'amendement/i }),
    ).toBeInTheDocument();
  });

  it("utilise l'URL AN en dyn/17", async () => {
    const user = userEvent.setup();
    render(<AmendmentCard amendment={amendmentFixture} />);
    await user.click(
      screen.getByRole("button", { name: /Lire le texte de l'amendement/i }),
    );

    const link = screen.getByRole("link", {
      name: /Voir sur le site de l'Assemblée Nationale/i,
    });
    expect(link).toHaveAttribute(
      "href",
      "https://www.assemblee-nationale.fr/dyn/17/amendements/AMANR5L17N1867",
    );
  });

  it("affiche les metadonnees auteurs et article", async () => {
    const user = userEvent.setup();
    render(<AmendmentCard amendment={amendmentFixture} />);
    await user.click(
      screen.getByRole("button", { name: /Lire le texte de l'amendement/i }),
    );

    expect(
      screen.getByText(
        /Amendement n°1867 rect\. · Art\. 4 · par Jean Dupont ; Groupe RE/,
      ),
    ).toBeInTheDocument();
  });

  it("affiche le fallback si dispositif absent", async () => {
    const user = userEvent.setup();
    render(
      <AmendmentCard
        amendment={{
          ...amendmentFixture,
          dispositif: null,
        }}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /Lire le texte de l'amendement/i }),
    );
    expect(screen.getByText("Texte non disponible.")).toBeInTheDocument();
  });

  it("tronque puis deploie le dispositif long", async () => {
    const user = userEvent.setup();
    const longText = "A".repeat(900);
    render(
      <AmendmentCard
        amendment={{
          ...amendmentFixture,
          dispositif: longText,
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Lire le texte de l'amendement/i }),
    );
    expect(screen.getByText("Lire la suite")).toBeInTheDocument();
    await user.click(screen.getByText("Lire la suite"));
    expect(screen.getByText(longText)).toBeInTheDocument();
  });
});
