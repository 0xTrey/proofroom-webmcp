import { useEffect, useEffectEvent, useRef } from "react";
import { createPortal } from "react-dom";

export type ResetDialogProps = {
  open: boolean;
  opener: HTMLElement | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ResetDialog(props: ResetDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmingRef = useRef(false);
  const cancel = useEffectEvent(() => props.onCancel());
  const { open, opener } = props;

  useEffect(() => {
    if (!open) {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      opener?.focus();
      confirmingRef.current = false;
    };
  }, [open, opener]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="reset-dialog-layer">
      <div
        ref={dialogRef}
        className="reset-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-dialog-heading"
        aria-describedby="reset-dialog-description"
      >
        <h2 id="reset-dialog-heading">Reset this fictional demonstration?</h2>
        <p id="reset-dialog-description">
          The reset replaces the current room with the demo starting point. Review the exact
          consequences before continuing.
        </p>

        <div className="reset-dialog__consequences">
          <section aria-labelledby="reset-removes-heading">
            <h3 id="reset-removes-heading">Reset removes</h3>
            <ul>
              <li>Approved buyer profile and its receipt</li>
              <li>Requirement attachments and buyer notes</li>
              <li>ROI changes</li>
              <li>CFO and CISO briefs</li>
              <li>The decision proposal and approved decision</li>
              <li>Prior activity ledger history</li>
            </ul>
          </section>
          <section aria-labelledby="reset-keeps-heading">
            <h3 id="reset-keeps-heading">Demo starting point keeps</h3>
            <ul>
              <li>Six fictional requirements</li>
              <li>Twelve fictional evidence records</li>
              <li>Sample commercial assumptions</li>
              <li>Schema version 1</li>
              <li>One new System event</li>
            </ul>
          </section>
        </div>

        <div className="reset-dialog__actions">
          <button ref={cancelRef} className="button button--quiet" type="button" onClick={props.onCancel}>
            Cancel
          </button>
          <button
            className="button button--danger"
            type="button"
            onClick={() => {
              if (confirmingRef.current) {
                return;
              }
              confirmingRef.current = true;
              props.onConfirm();
            }}
          >
            Reset to the demo starting point
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
