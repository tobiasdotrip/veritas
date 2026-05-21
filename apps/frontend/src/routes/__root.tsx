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
import { Container } from "@/components/layout/Container.js";
import { queryClient } from "@/lib/api-client.js";
import { QueryClientProvider } from "@tanstack/react-query";
import appCss from "../app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Veritas" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <div className="flex min-h-screen flex-col">
          <SkipLink />
          <Header />
          <main id="main-content" className="flex-1">
            <Container>
              <Outlet />
            </Container>
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
