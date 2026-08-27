import { useState } from "react";
import type { RoomReset } from "../domain/actions/index.ts";
import type { ActionResult } from "../domain/errors.ts";

export type ResetResultPanelProps = {
  result: RoomReset;
  persistenceFailed: boolean;
  onRetryPersist: () => ActionResult<{ persisted: true }>;
  onDismiss: () => void;
};

export function ResetResultPanel(props: ResetResultPanelProps) {
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [retrySucceeded, setRetrySucceeded] = useState(false);

  return (
    <section className="reset-result" aria-labelledby="reset-result-heading">
      <div>
        <h2 id="reset-result-heading">The canonical fixture is active.</h2>
        <p>
          This confirmation is a page readback, not authoritative room state. The prior ledger was
          replaced by one new canonical System event.
        </p>
      </div>

      {props.persistenceFailed && !retrySucceeded ? (
        <div className="reset-result__warning">
          <p>
            The current tab reset succeeded, but browser persistence failed. Reload may restore old
            or empty state until saving succeeds.
          </p>
          <button
            className="button button--quiet"
            type="button"
            onClick={() => {
              const retried = props.onRetryPersist();
              setRetrySucceeded(retried.ok);
              setRetryMessage(
                retried.ok
                  ? "The canonical fixture is now saved in this browser."
                  : `${retried.error.code}: ${retried.error.issues[0]?.message ?? retried.error.message}`,
              );
            }}
          >
            Try saving again
          </button>
          {retryMessage ? <p role="status">{retryMessage}</p> : null}
        </div>
      ) : null}
      {retrySucceeded && retryMessage ? <p role="status">{retryMessage}</p> : null}

      <dl>
        <div>
          <dt>Receipt ID</dt>
          <dd className="mono">{props.result.receipt.id}</dd>
        </div>
        <div>
          <dt>Kind</dt>
          <dd className="mono">{props.result.receipt.kind}</dd>
        </div>
        <div>
          <dt>Input digest</dt>
          <dd className="mono">{props.result.receipt.inputDigest}</dd>
        </div>
        <div>
          <dt>Timestamp</dt>
          <dd className="mono">{props.result.receipt.issuedAt}</dd>
        </div>
        <div>
          <dt>Requirements</dt>
          <dd>{props.result.requirementCount}</dd>
        </div>
        <div>
          <dt>Evidence records</dt>
          <dd>{props.result.evidenceCount}</dd>
        </div>
        <div>
          <dt>Revision</dt>
          <dd>{props.result.revision}</dd>
        </div>
      </dl>

      <button className="button button--quiet" type="button" onClick={props.onDismiss}>
        Dismiss reset confirmation
      </button>
    </section>
  );
}
