import { createRootRoute, Outlet } from "@tanstack/react-router";
import { SkipLink } from "@/components/layout/SkipLink.js";
import { Header } from "@/components/layout/Header.js";
import { Footer } from "@/components/layout/Footer.js";
import { Container } from "@/components/layout/Container.js";
import { queryClient } from "@/lib/api-client.js";
import { QueryClientProvider } from "@tanstack/react-query";

export const Route = createRootRoute({
  component: () => (
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
  ),
});
