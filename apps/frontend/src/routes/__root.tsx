/// <reference types="vite/client" />
import type { ReactNode } from "react";
import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { SkipLink } from "@/components/layout/SkipLink.js";
import { Header } from "@/components/layout/Header.js";
import { Footer } from "@/components/layout/Footer.js";
import { queryClient } from "@/lib/api-client.js";
import { QueryClientProvider } from "@tanstack/react-query";
import appCss from "../app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Veritas — Transparence des votes parlementaires" },
      {
        name: "description",
        content:
          "Découvrez comment votent vos députés, comparez leurs positions et explorez les scrutins de l'Assemblée nationale.",
      },
    ],
    links: [
      {
        rel: "apple-touch-icon",
        href: "/dsfr/favicon/apple-touch-icon.png",
      },
      { rel: "icon", href: "/dsfr/favicon/favicon.svg", type: "image/svg+xml" },
      {
        rel: "shortcut icon",
        href: "/dsfr/favicon/favicon.ico",
        type: "image/x-icon",
      },
      {
        rel: "manifest",
        href: "/dsfr/favicon/manifest.webmanifest",
        crossOrigin: "use-credentials",
      },
      { rel: "stylesheet", href: "/dsfr/dsfr.min.css" },
      { rel: "stylesheet", href: "/dsfr/utility/icons/icons.min.css" },
      { rel: "stylesheet", href: appCss },
      {
        rel: "preload",
        href: "/dsfr/fonts/Marianne-Regular.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/dsfr/fonts/Marianne-Medium.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/dsfr/fonts/Marianne-Bold.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <div className="flex min-h-dvh flex-col">
          <SkipLink />
          <Header />
          <main id="main-content" className="flex-1">
            <div className="fr-container fr-py-4w">
              <Outlet />
            </div>
          </main>
          <Footer />
        </div>
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
