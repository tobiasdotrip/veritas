import { useSyncExternalStore } from "react";

function subscribe(callback: () => void, query: string) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(query: string) {
  if (typeof window === "undefined") return false;
  return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => subscribe(cb, query),
    () => getSnapshot(query),
    () => false,
  );
}
