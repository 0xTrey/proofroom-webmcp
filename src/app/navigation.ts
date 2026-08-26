/**
 * Hash based navigation.
 *
 * Hash routing keeps the Cloudflare single page application fallback trivial and
 * makes every surface linkable for the demo script without a router dependency.
 */
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_ROUTE, ROUTES, type RouteId } from "./routes.ts";

export function routeFromHash(hash: string): RouteId {
  const normalized = hash.replace(/^#/, "").toLowerCase();
  const match = ROUTES.find((route) => route.id === normalized);
  return match?.id ?? DEFAULT_ROUTE;
}

export function useRouteState(): [RouteId, (next: RouteId) => void] {
  const [route, setRoute] = useState<RouteId>(() =>
    routeFromHash(globalThis.location?.hash ?? ""),
  );

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash(globalThis.location?.hash ?? ""));
    globalThis.addEventListener("hashchange", onHashChange);
    return () => globalThis.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((next: RouteId) => {
    setRoute(next);
    if (globalThis.location) {
      globalThis.location.hash = next;
    }
  }, []);

  return [route, navigate];
}
