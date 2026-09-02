/**
 * Error boundary.
 *
 * A render failure must not strand the demo. The boundary shows a safe message
 * and a recovery path, never a stack trace.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  onOpenReset?: (trigger: HTMLElement) => void;
};

type ErrorBoundaryState = {
  failed: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("ProofRoom render failure", error, info.componentStack);
    }
  }

  override render(): ReactNode {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <div className="errorpanel" role="alert">
        <h1 className="display">This surface stopped rendering</h1>
        <p>
          The room state is still available. Try rendering this surface again, or open the shared
          reset confirmation to return to the demo starting point.
        </p>
        <div className="reset-dialog__actions">
          <button
            className="button"
            type="button"
            onClick={() => {
              this.setState({ failed: false });
            }}
          >
            Try this surface again
          </button>
          <button
            className="button button--quiet"
            type="button"
            onClick={(event) => this.props.onOpenReset?.(event.currentTarget)}
          >
            Open reset confirmation
          </button>
        </div>
      </div>
    );
  }
}
