import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type { Font } from "satori";

const require = createRequire(import.meta.url);
const fontPath = require.resolve(
  "@fontsource/inter/files/inter-latin-400-normal.woff",
);

let cachedFonts: Font[] | undefined;

export async function getOgFonts(): Promise<Font[]> {
  if (cachedFonts) return cachedFonts;

  const data = await readFile(fontPath);

  cachedFonts = [
    {
      name: "sans-serif",
      data,
      weight: 400,
      style: "normal",
    },
  ];

  return cachedFonts;
}
