import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Cliquez</Button>);
    expect(screen.getByRole("button", { name: "Cliquez" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Action</Button>);

    await user.click(screen.getByRole("button", { name: "Action" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled and shows loading state", () => {
    render(<Button isLoading>Chargement</Button>);

    const button = screen.getByRole("button", { name: "Chargement" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("forwards type submit", () => {
    render(<Button type="submit">Envoyer</Button>);
    expect(screen.getByRole("button", { name: "Envoyer" })).toHaveAttribute(
      "type",
      "submit",
    );
  });
});
