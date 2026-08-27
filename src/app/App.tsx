/**
 * Application root.
 *
 * The root wires shared room state, WebMCP registration, and route composition.
 * Interactive surfaces and WebMCP tools call the same domain action layer, while
 * the rendered routes project the resulting canonical room state.
 */
import { useState } from "react";
import type { RoomReset } from "../domain/actions/index.ts";
import { DecisionSurface } from "../features/decision/DecisionSurface.tsx";
import { EvaluationSurface } from "../features/evaluation/EvaluationSurface.tsx";
import { BuyerContextWorkspace } from "../features/context/BuyerContextWorkspace.tsx";
import { ProductSurface } from "../features/product/ProductSurface.tsx";
import {
  agentActions,
  roomActions,
  roomStoreHandle,
  useRoomStore,
} from "../state/roomStore.ts";
import { selectLastError, selectRoom } from "../state/selectors.ts";
import { useWebMcpTools } from "../webmcp/useWebMCPTools.ts";
import { AppShell } from "./AppShell.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { useRouteState } from "./navigation.ts";
import { RecoveryPanel } from "./RecoveryPanel.tsx";
import { ResetDialog } from "./ResetDialog.tsx";
import { ResetResultPanel } from "./ResetResultPanel.tsx";
import { findRoute } from "./routes.ts";

export function App() {
  const [route, navigate] = useRouteState();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetOpener, setResetOpener] = useState<HTMLElement | null>(null);
  const [resetResult, setResetResult] = useState<{
    result: RoomReset;
    persistenceFailed: boolean;
  } | null>(null);
  const [boundaryKey, setBoundaryKey] = useState(0);
  const status = useWebMcpTools(agentActions);
  const room = useRoomStore(selectRoom);
  const lastError = useRoomStore(selectLastError);
  const storageStatus = useRoomStore((value) => value.storageStatus);
  const storageDetail = useRoomStore((value) => value.storageDetail);
  const activeRoute = findRoute(route);
  const dismissError = () => roomStoreHandle.clearError();
  const contextWorkspace = (
    <BuyerContextWorkspace
      room={room}
      actions={roomActions}
      lastError={lastError}
      onDismissError={dismissError}
    />
  );

  function requestReset(trigger: HTMLElement): void {
    setResetOpener(trigger);
    setResetOpen(true);
  }

  function confirmReset(): void {
    const result = roomActions.resetRoom();
    if (!result.ok) {
      return;
    }

    roomStoreHandle.clearError();
    setResetResult({
      result: result.value,
      persistenceFailed: roomStoreHandle.store.getState().storageStatus === "unavailable",
    });
    setResetOpen(false);
    navigate("product");
    setBoundaryKey((key) => key + 1);
  }

  return (
    <>
      <AppShell
        route={route}
        onNavigate={navigate}
        status={status}
        revision={room.revision}
        storageStatus={storageStatus}
        onRequestReset={requestReset}
      >
        <RecoveryPanel
          notice={room.recoveryNotice}
          storageStatus={storageStatus}
          storageDetail={storageDetail}
          actions={roomActions}
          onRetryPersist={roomStoreHandle.retryPersist}
        />

        {resetResult ? (
          <ResetResultPanel
            result={resetResult.result}
            persistenceFailed={resetResult.persistenceFailed}
            onRetryPersist={roomStoreHandle.retryPersist}
            onDismiss={() => setResetResult(null)}
          />
        ) : null}

        <ErrorBoundary key={boundaryKey} onOpenReset={requestReset}>
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
              onDismissError={dismissError}
            />
          ) : null}
          {route === "decision" ? (
            <DecisionSurface
              room={room}
              actions={roomActions}
              lastError={lastError}
              context={contextWorkspace}
              onDismissError={dismissError}
            />
          ) : null}
        </ErrorBoundary>
      </AppShell>

      <ResetDialog
        open={resetOpen}
        opener={resetOpener}
        onCancel={() => setResetOpen(false)}
        onConfirm={confirmReset}
      />
    </>
  );
}
