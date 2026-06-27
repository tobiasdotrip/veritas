import { StartClient } from "@tanstack/react-start/client";
import { startReactDsfr } from "@codegouvfr/react-dsfr/spa";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { Link } from "@tanstack/react-router";

declare module "@codegouvfr/react-dsfr/spa" {
  interface RegisterLink {
    Link: typeof Link;
  }
}

startReactDsfr({
  defaultColorScheme: "system",
  Link,
});

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
);
