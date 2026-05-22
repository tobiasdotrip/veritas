import { describe, it, expect } from "vitest";
import { renderOgSvg } from "./render.js";
import {
  CompareOgTemplate,
  DeputyOgTemplate,
  ScrutinOgTemplate,
  OG_DIMENSIONS,
} from "./templates.js";

describe("OG templates", () => {
  it("renders deputy card as valid SVG", async () => {
    const svg = await renderOgSvg(
      DeputyOgTemplate({
        firstName: "Jean",
        lastName: "Dupont",
        groupAbbreviation: "RE",
        participationRate: 100,
        loyaltyRate: 67,
        votesCast: 3,
      }),
    );

    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain(`width="${OG_DIMENSIONS.width}"`);
    expect(svg.length).toBeGreaterThan(500);
  });

  it("renders scrutin card as valid SVG", async () => {
    const svg = await renderOgSvg(
      ScrutinOgTemplate({
        numero: 100,
        titre: "Projet de loi santé",
        sortCode: "adopté",
        nombrePour: 280,
        nombreContre: 120,
        nombreAbstentions: 30,
      }),
    );

    expect(svg).toMatch(/^<svg/);
    expect(svg.length).toBeGreaterThan(500);
  });

  it("renders compare card as valid SVG", async () => {
    const svg = await renderOgSvg(CompareOgTemplate({ score: 75.4 }));

    expect(svg).toMatch(/^<svg/);
    expect(svg.length).toBeGreaterThan(500);
  });
});
