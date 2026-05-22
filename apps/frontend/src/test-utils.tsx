import * as React from "react";
import { expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

export function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

export async function waitForHook<T>(
  result: { current: T },
  predicate: (v: T) => boolean,
) {
  await waitFor(() => {
    expect(predicate(result.current)).toBe(true);
  });
}

export { renderHook, waitFor };
