/**
 * Application root.
 *
 * The root wires stable room state, WebMCP registration, and route composition.
 * Product logic remains in the domain action layer. These surfaces are read-only
 * projections of the canonical room for the baseline milestone.
 */
import { DecisionSurface } from "../features/decision/DecisionSurface.tsx";
import { EvaluationSurface } from "../features/evaluation/EvaluationSurface.tsx";
import { ProductSurface } from "../features/product/ProductSurface.tsx";
import { agentActions, roomActions, useRoomStore } from "../state/roomStore.ts";
import { selectRoom } from "../state/selectors.ts";
import { useWebMcpTools } from "../webmcp/useWebMCPTools.ts";
import { AppShell } from "./AppShell.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { useRouteState } from "./navigation.ts";
import { findRoute } from "./routes.ts";

export function App() {
  const [route, navigate] = useRouteState();
  const status = useWebMcpTools(agentActions);
  const room = useRoomStore(selectRoom);
  const storageStatus = useRoomStore((value) => value.storageStatus);
  const activeRoute = findRoute(route);

  return (
    <AppShell
      route={route}
      onNavigate={navigate}
      status={status}
      revision={room.revision}
      storageStatus={storageStatus}
    >
      <ErrorBoundary onReset={() => roomActions.resetRoom()}>
        {room.recoveryNotice ? (
          <div className="notice" role="status">
            <p className="notice__title">Recovered to the canonical room</p>
            <p>{room.recoveryNotice.message}</p>
          </div>
        ) : null}

        <p className="visually-hidden" aria-live="polite">
          {activeRoute.heading}. {activeRoute.purpose}
        </p>

        {route === "product" ? <ProductSurface room={room} /> : null}
        {route === "evaluation" ? <EvaluationSurface room={room} /> : null}
        {route === "decision" ? <DecisionSurface room={room} /> : null}
      </ErrorBoundary>
    </AppShell>
  );
}
