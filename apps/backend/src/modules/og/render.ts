import type { ReactElement } from "react";
import satori from "satori";
import { OG_DIMENSIONS } from "./templates.js";
import { getOgFonts } from "./fonts.js";

export async function renderOgSvg(element: ReactElement): Promise<string> {
  return satori(element, {
    width: OG_DIMENSIONS.width,
    height: OG_DIMENSIONS.height,
    fonts: await getOgFonts(),
  });
}

export const OG_CACHE_HEADERS = {
  "Content-Type": "image/svg+xml",
  "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
} as const;
