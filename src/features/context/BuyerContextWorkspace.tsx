import { useState } from "react";
import type { RoomActions } from "../../domain/actions/index.ts";
import type { DomainError } from "../../domain/errors.ts";
import { buyerContextReceipt } from "../../domain/receipts.ts";
import type { BuyerContext, BuyerContextProposal, Receipt, RoomState } from "../../domain/types.ts";
import { MERIDIAN_CONTEXT_DRAFT } from "../../fixtures/buyer.ts";

type Feedback = {
  kind: "success" | "error";
  message: string;
};

export type BuyerContextWorkspaceProps = {
  room: RoomState;
  actions: RoomActions;
  lastError: DomainError | null;
};

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

function rejectionResolution(proposalId: string, hasApprovedContext: boolean): string {
  if (hasApprovedContext) {
    return `Rejected ${proposalId}. The previously approved buyer context remains authoritative, and its personalization remains in place.`;
  }
  return `Rejected ${proposalId}. No buyer context has ever been approved, so baseline product ordering remains in place.`;
}

function ContextFields({ context }: { context: BuyerContext }) {
  return (
    <dl className="context-fields">
      <div>
        <dt>Company name</dt>
        <dd>{context.companyName}</dd>
      </div>
      <div>
        <dt>Industry</dt>
        <dd>{context.industry}</dd>
      </div>
      <div>
        <dt>Employee band</dt>
        <dd>{context.employeeBand}</dd>
      </div>
      <div>
        <dt>Budget ceiling</dt>
        <dd>{formatUsd(context.budgetCeiling)}</dd>
      </div>
      <div>
        <dt>Payback target</dt>
        <dd>{context.paybackTargetMonths} months</dd>
      </div>
      <div className="context-fields__list">
        <dt>Personas</dt>
        <dd>
          <ul>
            {context.personas.map((persona) => (
              <li key={persona}>{persona}</li>
            ))}
          </ul>
        </dd>
      </div>
      <div className="context-fields__list">
        <dt>Priorities</dt>
        <dd>
          <ol>
            {context.priorities.map((priority) => (
              <li key={priority}>{priority}</li>
            ))}
          </ol>
        </dd>
      </div>
      <div className="context-fields__list">
        <dt>Hard requirements</dt>
        <dd>
          <ul>
            {context.hardRequirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </dd>
      </div>
    </dl>
  );
}

function ReceiptDetails({ receipt }: { receipt: Receipt }) {
  return (
    <section className="context-receipt" aria-labelledby="context-receipt-heading">
      <h3 id="context-receipt-heading">Approval receipt</h3>
      <dl>
        <div>
          <dt>Receipt ID</dt>
          <dd className="mono">{receipt.id}</dd>
        </div>
        <div>
          <dt>Proposal ID</dt>
          <dd className="mono">{receipt.proposalId}</dd>
        </div>
        <div>
          <dt>Digest</dt>
          <dd className="mono">{receipt.inputDigest}</dd>
        </div>
        <div>
          <dt>Applied revision</dt>
          <dd className="mono">{receipt.revision}</dd>
        </div>
        <div>
          <dt>Timestamp</dt>
          <dd className="mono">{formatTimestamp(receipt.issuedAt)} UTC</dd>
        </div>
        <div className="context-receipt__summary">
          <dt>Safe summary</dt>
          <dd>{receipt.summary}</dd>
        </div>
      </dl>
    </section>
  );
}

function ProposalReview(props: {
  proposal: BuyerContextProposal;
  currentRevision: number;
  receipt: Receipt | null;
  approvedContextExists: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const pending = props.proposal.status === "pending";

  return (
    <article
      className={`context-proposal context-proposal--${props.proposal.status}`}
      aria-labelledby="context-proposal-heading"
      data-proposal-status={props.proposal.status}
    >
      <header className="context-proposal__head">
        <div>
          <h2 id="context-proposal-heading">Review the exact proposed buyer context.</h2>
          <p>
            This dossier is a staged claim. It cannot influence the product story until a person
            approves it here.
          </p>
        </div>
        <p className="context-proposal__status mono">
          <span aria-hidden="true">{pending ? "◇" : props.proposal.status === "approved" ? "✓" : "×"}</span>
          {props.proposal.status}
        </p>
      </header>

      <dl className="proposal-envelope" aria-label="Proposal envelope">
        <div>
          <dt>Proposal ID</dt>
          <dd className="mono">{props.proposal.id}</dd>
        </div>
        <div>
          <dt>Base revision</dt>
          <dd className="mono">{props.proposal.baseRevision}</dd>
        </div>
        <div>
          <dt>Current room revision</dt>
          <dd className="mono">{props.currentRevision}</dd>
        </div>
        <div>
          <dt>Expiry</dt>
          <dd className="mono">{formatTimestamp(props.proposal.expiresAt)} UTC</dd>
        </div>
        <div>
          <dt>Digest</dt>
          <dd className="mono">{props.proposal.inputDigest}</dd>
        </div>
        <div>
          <dt>Creator origin</dt>
          <dd className="mono">{props.proposal.createdBy}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd className="mono">{props.proposal.status}</dd>
        </div>
      </dl>

      <ContextFields context={props.proposal.payload} />

      {pending ? (
        <div className="context-proposal__actions" aria-label="Human context decision">
          <button className="button" type="button" onClick={props.onApprove}>
            Approve buyer context
          </button>
          <button className="button button--danger" type="button" onClick={props.onReject}>
            Reject proposal
          </button>
          <p>These decisions are page controls only. No WebMCP approval tool exists.</p>
        </div>
      ) : null}

      {props.proposal.status === "rejected" ? (
        <p className="context-proposal__resolution">
          {rejectionResolution(props.proposal.id, props.approvedContextExists)}
        </p>
      ) : null}

      {props.proposal.status === "approved" && props.receipt ? (
        <ReceiptDetails receipt={props.receipt} />
      ) : null}
    </article>
  );
}

export function BuyerContextWorkspace(props: BuyerContextWorkspaceProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const proposal = props.room.buyerContextProposal;
  const approved = props.room.approvedBuyerContext;
  const receipt = buyerContextReceipt(props.room);

  function stageCanonicalDraft(): void {
    const result = props.actions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    if (!result.ok) {
      setFeedback({ kind: "error", message: `${result.error.code}: ${result.error.message}` });
      return;
    }
    setFeedback({
      kind: "success",
      message: `Staged ${result.value.proposalId}. Buyer context is still not approved.`,
    });
  }

  function approve(): void {
    if (!proposal) {
      return;
    }
    const result = props.actions.approveBuyerContext({ proposalId: proposal.id });
    if (!result.ok) {
      setFeedback({ kind: "error", message: `${result.error.code}: ${result.error.message}` });
      return;
    }
    setFeedback({
      kind: "success",
      message: `Approved ${proposal.id}. Buyer-approved context now leads the product story.`,
    });
  }

  function reject(): void {
    if (!proposal) {
      return;
    }
    const result = props.actions.rejectBuyerContext({
      proposalId: proposal.id,
      reason: "The person rejected the staged context in the page.",
    });
    if (!result.ok) {
      setFeedback({ kind: "error", message: `${result.error.code}: ${result.error.message}` });
      return;
    }
    setFeedback({
      kind: "success",
      message: rejectionResolution(proposal.id, approved !== null),
    });
  }

  const visibleFeedback =
    feedback ??
    (props.lastError
      ? { kind: "error" as const, message: `${props.lastError.code}: ${props.lastError.message}` }
      : null);

  return (
    <aside
      className={`context-workspace ${approved ? "context-workspace--approved motion-mark" : ""}`}
      aria-labelledby="buyer-context-heading"
    >
      <div className="context-rail">
        <div className="context-rail__identity">
          <span className="context-rail__mark" aria-hidden="true">
            {approved ? "✓" : "○"}
          </span>
          <div>
            <h2 id="buyer-context-heading">
              {approved
                ? `${approved.companyName} context is buyer-approved.`
                : "No buyer context is approved."}
            </h2>
            <p>
              {approved
                ? `${approved.industry}. Personalization comes only from the approved state.`
                : "Buyer details are not yet shared with the authoritative product view."}
            </p>
          </div>
        </div>

        {approved ? (
          <dl className="context-rail__facts" aria-label="Approved buyer context summary">
            <div>
              <dt>Personas</dt>
              <dd>{approved.personas.join(", ")}</dd>
            </div>
            <div>
              <dt>Budget ceiling</dt>
              <dd>{formatUsd(approved.budgetCeiling)}</dd>
            </div>
            <div>
              <dt>Payback target</dt>
              <dd>{approved.paybackTargetMonths} months</dd>
            </div>
          </dl>
        ) : (
          <div className="context-rail__empty">
            <p>
              A browser agent may stage details, but only the visible controls below can approve
              them.
            </p>
            {proposal?.status !== "pending" ? (
              <button className="button" type="button" onClick={stageCanonicalDraft}>
                Stage fictional Meridian Bank draft
              </button>
            ) : null}
          </div>
        )}

        {approved ? (
          <details className="approved-context-details">
            <summary>
              Inspect full approved context
              {receipt ? " and receipt" : ""}
            </summary>
            <ContextFields context={approved} />
            {receipt ? <ReceiptDetails receipt={receipt} /> : null}
          </details>
        ) : null}
      </div>

      <p
        className={`context-feedback ${visibleFeedback?.kind === "error" ? "context-feedback--error" : ""}`}
        aria-live="polite"
        aria-atomic="true"
      >
        {visibleFeedback?.message ?? "Context actions will be reported here."}
      </p>

      {proposal && proposal.status !== "approved" ? (
        <ProposalReview
          proposal={proposal}
          currentRevision={props.room.revision}
          receipt={receipt}
          approvedContextExists={approved !== null}
          onApprove={approve}
          onReject={reject}
        />
      ) : null}
    </aside>
  );
}
