/**
 * Error boundary.
 *
 * A render failure must not strand the demo. The boundary shows a safe message
 * and a recovery path, never a stack trace.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  onReset?: () => void;
};

type ErrorBoundaryState = {
  failed: boolean;
  message: string | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false, message: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      failed: true,
      message: error instanceof Error ? error.message.slice(0, 200) : null,
    };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("ProofRoom render failure", error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <div className="errorpanel" role="alert">
        <h1 className="display">This surface stopped rendering</h1>
        <p>
          The room state is still in your browser. Reset the demo to return to the canonical fixture,
          or reload the page to try this surface again.
        </p>
        {this.state.message ? <p className="mono">{this.state.message}</p> : null}
        <div>
          <button
            className="button"
            type="button"
            onClick={() => {
              this.props.onReset?.();
              this.setState({ failed: false, message: null });
            }}
          >
            Reset the room and continue
          </button>
        </div>
      </div>
    );
  }
}
