import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
  component: () => (
    <>
      <header>
        <Link to="/">Veritas</Link>
      </header>
      <main>
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </>
  ),
});
