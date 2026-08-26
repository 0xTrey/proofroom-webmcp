/**
 * Surfaces.
 *
 * ProofRoom has three surfaces on purpose. More surfaces would dilute the one
 * transformation the demo has to land.
 */

export const ROUTES = [
  {
    id: "product",
    label: "Product",
    hash: "#product",
    heading: "Northstar, the fictional campaign operations platform",
    purpose: "Understand the product and its documented proof before any agent runs.",
  },
  {
    id: "evaluation",
    label: "Evaluation",
    hash: "#evaluation",
    heading: "Requirements and evidence",
    purpose: "See how each requirement is proven, partially proven, or still open.",
  },
  {
    id: "decision",
    label: "Decision",
    hash: "#decision",
    heading: "Commercial model and decision",
    purpose: "Review the assumptions, the blockers, and the recorded decision trail.",
  },
] as const;

export type RouteId = (typeof ROUTES)[number]["id"];

export type Route = (typeof ROUTES)[number];

export const DEFAULT_ROUTE: RouteId = "product";

export function findRoute(id: RouteId): Route {
  const route = ROUTES.find((entry) => entry.id === id);
  // ROUTES is exhaustive for RouteId, so this fallback is unreachable in practice.
  return route ?? ROUTES[0];
}
