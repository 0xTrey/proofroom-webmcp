/**
 * Surfaces.
 *
 * ProofRoom has three surfaces on purpose. More surfaces would dilute the one
 * transformation the demo has to land.
 */

export const HOME_ROUTE = {
  id: "home",
  label: "How it works",
  hash: "",
  heading: "Check a software vendor's claims before you buy.",
  purpose: "See how ProofRoom checks vendor claims against buying requirements.",
} as const;

export const ROUTES = [
  {
    id: "product",
    label: "Set priorities",
    hash: "#product",
    heading: "Start with what Meridian Bank needs.",
    purpose: "Confirm the budget, payback target, and buying priorities before checking evidence.",
  },
  {
    id: "evaluation",
    label: "Check evidence",
    hash: "#evaluation",
    heading: "Check six buying requirements against the vendor's evidence.",
    purpose: "See what each requirement proves, partly proves, contradicts, or leaves unknown.",
  },
  {
    id: "decision",
    label: "Review decision",
    hash: "#decision",
    heading: "Review the recommendation, then make the final call.",
    purpose: "Review the business case, briefs, and recommendation before you approve or reject it.",
  },
] as const;

export type RoomRouteId = (typeof ROUTES)[number]["id"];

export type Route = (typeof ROUTES)[number];

export type RouteId = typeof HOME_ROUTE.id | RoomRouteId;

export type AppRoute = typeof HOME_ROUTE | Route;

export const DEFAULT_ROUTE: RouteId = "home";

export function findRoute(id: RouteId): AppRoute {
  if (id === HOME_ROUTE.id) {
    return HOME_ROUTE;
  }
  const route = ROUTES.find((entry) => entry.id === id);
  // ROUTES is exhaustive for RouteId, so this fallback is unreachable in practice.
  return route ?? ROUTES[0];
}
