/**
 * Application root.
 *
 * The root wires the store, the WebMCP registration lifecycle, and the three
 * surfaces. Every value on screen is read from room state through selectors, and
 * every change goes through `RoomActions`. This milestone renders the baseline
 * surfaces and the honest status of the room; the feature workspaces arrive in
 * later milestones.
 *
 * Surfaces subscribe to the room object itself and derive their projections
 * during render. Subscribing with a selector that builds a new array would make
 * every read a new snapshot and loop the renderer.
 */
import { RequirementStatusMark } from "../components/StatusMark.tsx";
import { conditionLabel } from "../domain/conditions.ts";
import type { RoomState } from "../domain/types.ts";
import { agentActions, roomActions, useRoomStore } from "../state/roomStore.ts";
import {
  selectLedgerTotals,
  selectRequirementSummaries,
  selectRequirementTotals,
  selectRoiSummary,
  selectRoom,
} from "../state/selectors.ts";
import { TOOL_NAMES } from "../webmcp/toolDefinitions.ts";
import { useWebMcpTools } from "../webmcp/useWebMCPTools.ts";
import { AppShell } from "./AppShell.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { useRouteState } from "./navigation.ts";
import { findRoute } from "./routes.ts";

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function ProductSurface({ room }: { room: RoomState }) {
  const { vendor, canonicalBuyer: buyer } = room;

  return (
    <>
      <section className="opening" aria-labelledby="opening-headline">
        <div>
          <h1 className="opening__headline" id="opening-headline">
            {vendor.headline}
          </h1>
          <p className="opening__lede">{vendor.primaryValue}</p>
        </div>
        <div className="opening__panel">
          <h2>Evaluation room</h2>
          <dl>
            <div>
              <dt>Vendor</dt>
              <dd>{vendor.name}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{vendor.category}</dd>
            </div>
            <div>
              <dt>Buyer in this demo</dt>
              <dd>{buyer.companyName}</dd>
            </div>
            <div>
              <dt>Implementation</dt>
              <dd>{vendor.implementation.typicalDays} days</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="notice">
        <p className="notice__title">This is fictional demo content</p>
        <p>{vendor.fictionalDisclosure}</p>
        <p>{buyer.fictionalDisclosure}</p>
      </div>

      <section className="section" aria-labelledby="capabilities-heading">
        <div className="section__head">
          <h2 className="display" id="capabilities-heading">
            What the platform does
          </h2>
          <p className="mono">{vendor.capabilities.length} documented capabilities</p>
        </div>
        <ul className="records">
          {vendor.capabilities.map((capability) => (
            <li className="record" key={capability.id}>
              <div className="record__label">
                <h3>{capability.label}</h3>
                <span className="mono">{capability.id}</span>
              </div>
              <p>{capability.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="packaging-heading">
        <div className="section__head">
          <h2 className="display" id="packaging-heading">
            Packaging and implementation
          </h2>
          <p className="mono">{vendor.implementation.milestones.length} implementation phases</p>
        </div>
        <ul className="records">
          {vendor.packaging.map((tier) => (
            <li className="record" key={tier.id}>
              <div className="record__label">
                <h3>{tier.name}</h3>
                <span className="mono">{formatUsd(tier.annualListPrice)} per year</span>
              </div>
              <p>{tier.seatBand}</p>
              <ul className="record__meta">
                {tier.includes.map((entry) => (
                  <li className="mono" key={entry}>
                    {entry}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p>{vendor.implementation.summary}</p>
      </section>
    </>
  );
}

function EvaluationSurface({ room }: { room: RoomState }) {
  const requirements = selectRequirementSummaries(room);
  const totals = selectRequirementTotals(room);

  return (
    <section className="section" aria-labelledby="requirements-heading">
      <div className="section__head">
        <h2 className="display" id="requirements-heading">
          {totals.total} requirements, {room.evidenceCatalog.length} evidence records
        </h2>
        <p className="mono">
          {totals.supported} supported | {totals.partially_supported} partial | {totals.unsupported}{" "}
          unsupported | {totals.unknown} unknown
        </p>
      </div>
      <ul className="records">
        {requirements.map((requirement) => (
          <li className="record" key={requirement.id}>
            <div className="record__label">
              <h3>{requirement.label}</h3>
              <RequirementStatusMark status={requirement.status} />
            </div>
            <p className="mono">{requirement.id}</p>
            <ul className="record__meta">
              <li className="mono">{requirement.priority} priority</li>
              <li className="mono">{requirement.attachedEvidenceCount} attached records</li>
              <li className="mono">{requirement.limitationCount} limitations</li>
              <li className="mono">{requirement.openQuestionCount} open questions</li>
            </ul>
            {requirement.gaps.length > 0 ? (
              <p>
                Open conditions:{" "}
                {requirement.gaps.map((conditionId) => conditionLabel(conditionId)).join(", ")}.
              </p>
            ) : (
              <p>Every hard condition is covered by active eligible evidence.</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DecisionSurface({ room }: { room: RoomState }) {
  const roi = selectRoiSummary(room);
  const ledger = selectLedgerTotals(room);
  const blockers = selectRequirementSummaries(room).filter(
    (requirement) => requirement.blocksReadyDecision,
  );
  const decision = room.approvedDecision;

  return (
    <>
      <section className="section" aria-labelledby="roi-heading">
        <div className="section__head">
          <h2 className="display" id="roi-heading">
            Commercial model
          </h2>
          <p className="mono">
            {roi.withinBudget ? "inside the budget ceiling" : "above the budget ceiling"}
          </p>
        </div>
        <ul className="records">
          <li className="record">
            <div className="record__label">
              <h3>Annual hours saved</h3>
              <span className="mono">{roi.annualHoursSaved}</span>
            </div>
            <p>Operator hours only. The model makes no revenue or conversion claim.</p>
          </li>
          <li className="record">
            <div className="record__label">
              <h3>First year net value</h3>
              <span className="mono">{formatUsd(roi.firstYearNetValue)}</span>
            </div>
            <p>Annual labor value {formatUsd(roi.annualLaborValue)} less first year cost.</p>
          </li>
          <li className="record">
            <div className="record__label">
              <h3>Payback</h3>
              <span className="mono">
                {roi.paybackMonths === null ? "not expressible" : `${roi.paybackMonths} months`}
              </span>
            </div>
            <p>Budget ceiling {formatUsd(roi.budgetCeiling)}.</p>
          </li>
        </ul>
      </section>

      <section className="section" aria-labelledby="decision-heading">
        <div className="section__head">
          <h2 className="display" id="decision-heading">
            Decision state
          </h2>
          <p className="mono">
            {decision ? `approved as ${decision.status}` : "no decision approved yet"}
          </p>
        </div>
        <p>
          {blockers.length === 0
            ? "Every hard requirement is fully supported, so none blocks a ready decision."
            : `A ready decision requires every hard requirement to be fully supported. Current blockers: ${blockers
                .map((entry) => entry.label)
                .join(", ")}.`}
        </p>
        <p className="mono">
          activity events {ledger.total} | reads {ledger.reads} | mutations {ledger.mutations} | agent{" "}
          {ledger.byOrigin.webmcp} | person {ledger.byOrigin.ui} | system {ledger.byOrigin.system}
        </p>
      </section>

      <section className="section" aria-labelledby="tools-heading">
        <div className="section__head">
          <h2 className="display" id="tools-heading">
            Agent tools on this page
          </h2>
          <p className="mono">{TOOL_NAMES.length} tools, no approval tool</p>
        </div>
        <ul className="toollist">
          {TOOL_NAMES.map((name) => (
            <li key={name}>
              <span className="mono">{name}</span>
            </li>
          ))}
        </ul>
        <p>
          Approving buyer context and approving a decision are page controls, not tools. The browser
          agent can research, calculate, and stage work; the person decides.
        </p>
      </section>
    </>
  );
}

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
