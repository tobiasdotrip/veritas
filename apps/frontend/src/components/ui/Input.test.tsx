import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input", () => {
  it("renders an input with placeholder", () => {
    render(<Input placeholder="Rechercher…" />);
    expect(screen.getByPlaceholderText("Rechercher…")).toBeInTheDocument();
  });

  it("forwards aria-label", () => {
    render(<Input aria-label="Champ de recherche" />);
    expect(screen.getByLabelText("Champ de recherche")).toBeInTheDocument();
  });

  it("triggers onChange when typing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input value="" onChange={onChange} />);

    await user.type(screen.getByRole("textbox"), "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("clears value when clear button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input value="test" onChange={onChange} clearable />);

    await user.click(screen.getByRole("button", { name: "Effacer la saisie" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: "" } }),
    );
  });
});
