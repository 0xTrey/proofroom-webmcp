/**
 * Application root.
 *
 * The root wires shared room state, WebMCP registration, and route composition.
 * Interactive surfaces and WebMCP tools call the same domain action layer, while
 * the rendered routes project the resulting canonical room state.
 */
import { DecisionSurface } from "../features/decision/DecisionSurface.tsx";
import { EvaluationSurface } from "../features/evaluation/EvaluationSurface.tsx";
import { BuyerContextWorkspace } from "../features/context/BuyerContextWorkspace.tsx";
import { ProductSurface } from "../features/product/ProductSurface.tsx";
import { agentActions, roomActions, useRoomStore } from "../state/roomStore.ts";
import { selectLastError, selectRoom } from "../state/selectors.ts";
import { useWebMcpTools } from "../webmcp/useWebMCPTools.ts";
import { AppShell } from "./AppShell.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { useRouteState } from "./navigation.ts";
import { findRoute } from "./routes.ts";

export function App() {
  const [route, navigate] = useRouteState();
  const status = useWebMcpTools(agentActions);
  const room = useRoomStore(selectRoom);
  const lastError = useRoomStore(selectLastError);
  const storageStatus = useRoomStore((value) => value.storageStatus);
  const activeRoute = findRoute(route);
  const contextWorkspace = (
    <BuyerContextWorkspace room={room} actions={roomActions} lastError={lastError} />
  );

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

        {route === "product" ? <ProductSurface room={room} context={contextWorkspace} /> : null}
        {route === "evaluation" ? (
          <EvaluationSurface
            room={room}
            actions={roomActions}
            lastError={lastError}
            context={contextWorkspace}
          />
        ) : null}
        {route === "decision" ? <DecisionSurface room={room} context={contextWorkspace} /> : null}
      </ErrorBoundary>
    </AppShell>
  );
}
