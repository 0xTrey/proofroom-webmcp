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
  if (normalized === "" || normalized === "home" || normalized === "how-it-works") {
    return DEFAULT_ROUTE;
  }
  const match = ROUTES.find((route) => route.id === normalized);
  return match?.id ?? DEFAULT_ROUTE;
}

export function useRouteState(): [RouteId, (next: RouteId) => void] {
  const [route, setRoute] = useState<RouteId>(() =>
    routeFromHash(globalThis.location?.hash ?? ""),
  );

  useEffect(() => {
    const onLocationChange = () => setRoute(routeFromHash(globalThis.location?.hash ?? ""));
    globalThis.addEventListener("hashchange", onLocationChange);
    globalThis.addEventListener("popstate", onLocationChange);
    return () => {
      globalThis.removeEventListener("hashchange", onLocationChange);
      globalThis.removeEventListener("popstate", onLocationChange);
    };
  }, []);

  const navigate = useCallback((next: RouteId) => {
    setRoute(next);
    if (globalThis.location) {
      if (next === "home") {
        globalThis.history.pushState(
          null,
          "",
          `${globalThis.location.pathname}${globalThis.location.search}`,
        );
      } else {
        globalThis.location.hash = next;
      }
    }
  }, []);

  return [route, navigate];
}
