import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeputeHeader } from "./DeputeHeader";
import type { DeputeProfile } from "@/lib/api-types";

const baseDepute = {
  id: "PA123",
  slug: "jean-dupont",
  firstName: "Jean",
  lastName: "Dupont",
  circoLabel: "Paris (1re)",
  groupAbbreviation: "LFI-NFP",
  photoUrl: null,
  mandateEnd: null,
  departmentId: "75",
} as DeputeProfile;

describe("DeputeHeader", () => {
  it("renders full name", () => {
    render(<DeputeHeader depute={baseDepute} />);
    expect(
      screen.getByRole("heading", { name: "Jean Dupont" }),
    ).toBeInTheDocument();
  });

  it("renders active mandate badge", () => {
    render(<DeputeHeader depute={baseDepute} />);
    expect(screen.getByText("En fonction")).toBeInTheDocument();
  });

  it("renders ended mandate badge", () => {
    render(
      <DeputeHeader
        depute={{ ...baseDepute, mandateEnd: "2024-06-09" } as DeputeProfile}
      />,
    );
    expect(screen.getByText("Mandat terminé")).toBeInTheDocument();
  });

  it("renders photo when provided", () => {
    render(
      <DeputeHeader
        depute={{
          ...baseDepute,
          photoUrl: "https://example.com/photo.jpg",
        } as DeputeProfile}
      />,
    );
    expect(
      screen.getByAltText("Photo de Jean Dupont"),
    ).toBeInTheDocument();
  });
});
