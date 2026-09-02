import { useState } from "react";
import type { RoomActions } from "../domain/actions/index.ts";
import type { ActionResult } from "../domain/errors.ts";
import type { RecoveryNotice } from "../domain/types.ts";

function safeDetail(detail: string | null): string | null {
  if (!detail) {
    return null;
  }
  if (/(api[_ -]?key|password|secret|token|credential)/i.test(detail)) {
    return "Technical detail was withheld because it resembled credential content.";
  }
  return detail.slice(0, 240);
}

function recoveryCopy(notice: RecoveryNotice): {
  heading: string;
  message: string;
  action: string | null;
} {
  switch (notice.code) {
    case "invalid_persisted_state":
      return {
        heading: "The demo starting point is active.",
        message:
          "Untrusted saved data failed strict validation. It was not merged or partially repaired.",
        action: "Continue with recovered demo",
      };
    case "unsupported_schema_version": {
      const version = notice.message.match(/schema version (\d+)/i)?.[1] ?? "unknown";
      return {
        heading: "The demo starting point is active.",
        message: `Saved schema version ${version} is not supported by this build. The saved room was not trusted.`,
        action: "Continue with recovered demo",
      };
    }
    case "persisted_state_migrated":
      return {
        heading: "The saved room was upgraded in place.",
        message:
          "An older schema-version-1 room kept its official room state while the missing buyer-profile receipt was reconstructed from its existing approval event.",
        action: "Continue with upgraded room",
      };
    case "storage_unavailable":
      return {
        heading: "Browser persistence is unavailable.",
        message:
          "Current-tab work remains usable in memory, but it may not survive a reload until saving succeeds.",
        action: null,
      };
  }
}

function formatDetectedAt(value: string): string {
  return `${new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  })} UTC`;
}

export type RecoveryPanelProps = {
  notice: RecoveryNotice | null;
  storageStatus: "ok" | "unavailable";
  storageDetail: string | null;
  actions: RoomActions;
  onRetryPersist: () => ActionResult<{ persisted: true }>;
};

export function RecoveryPanel(props: RecoveryPanelProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const notice = props.notice;
  const showStorageWarning =
    props.storageStatus === "unavailable" || notice?.code === "storage_unavailable";

  function continueRecovery(): void {
    const result = props.actions.dismissRecoveryNotice();
    if (!result.ok) {
      setFeedback(`${result.error.code}: ${result.error.message}`);
      return;
    }
    setFeedback(null);
  }

  function retryPersist(): void {
    const result = props.onRetryPersist();
    if (!result.ok) {
      const issue = result.error.issues[0]?.message;
      setFeedback(`${result.error.code}: ${issue ?? result.error.message}`);
      return;
    }
    setFeedback("The current room is saved in this browser.");
  }

  return (
    <>
      {notice && notice.code !== "storage_unavailable" ? (
        <section
          className={`global-recovery ${
            notice.code === "persisted_state_migrated" ? "global-recovery--migrated" : ""
          }`}
          aria-labelledby="recovery-heading"
        >
          <h2 id="recovery-heading">{recoveryCopy(notice).heading}</h2>
          <p>{recoveryCopy(notice).message}</p>
          <p className="global-recovery__meta mono">
            Notice code: {notice.code} / detected {formatDetectedAt(notice.detectedAt)}
          </p>
          {safeDetail(notice.detail) ? (
            <details>
              <summary>Technical detail</summary>
              <p>{safeDetail(notice.detail)}</p>
            </details>
          ) : null}
          <button className="button" type="button" onClick={continueRecovery}>
            {recoveryCopy(notice).action}
          </button>
          {feedback ? (
            <p className="global-recovery__error" role="alert">
              {feedback}
            </p>
          ) : null}
        </section>
      ) : null}

      {showStorageWarning ? (
        <section className="global-recovery" aria-labelledby="storage-warning-heading">
          <h2 id="storage-warning-heading">Browser persistence is unavailable.</h2>
          <p>
            Current-tab work remains usable in memory, but it may not survive a reload until saving
            succeeds.
          </p>
          <p className="global-recovery__meta mono">
            Notice code: storage_unavailable
            {notice?.code === "storage_unavailable"
              ? ` / detected ${formatDetectedAt(notice.detectedAt)}`
              : ""}
          </p>
          {safeDetail(props.storageDetail ?? notice?.detail ?? null) ? (
            <details>
              <summary>Technical detail</summary>
              <p>{safeDetail(props.storageDetail ?? notice?.detail ?? null)}</p>
            </details>
          ) : null}
          <button className="button" type="button" onClick={retryPersist}>
            Try saving again
          </button>
          {feedback ? (
            <p
              className={feedback.startsWith("PERSISTENCE_") ? "global-recovery__error" : ""}
              role="status"
            >
              {feedback}
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
