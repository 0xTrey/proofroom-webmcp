/**
 * Application shell.
 *
 * The shell carries the masthead, the three surface navigation, the live agent
 * tool status, and the fictional content disclosure. It holds no product logic.
 */
import type { ReactNode } from "react";
import { RevisionTag } from "../components/RevisionTag.tsx";
import { StatusMark, type StatusTone } from "../components/StatusMark.tsx";
import type { WebMcpController } from "../webmcp/useWebMCPTools.ts";
import { ROUTES, type RouteId } from "./routes.ts";

const PHASE_MARKS: Record<WebMcpController["phase"], { tone: StatusTone; glyph: string; label: string }> = {
  idle: { tone: "neutral", glyph: "\u25CB", label: "agent tools idle" },
  registering: { tone: "agent", glyph: "\u25D4", label: "agent tools registering" },
  registered: { tone: "verified", glyph: "\u2713", label: "agent tools registered" },
  partial: { tone: "gap", glyph: "\u25E7", label: "agent tools partial" },
  unavailable: { tone: "neutral", glyph: "\u2015", label: "agent tools unavailable" },
  error: { tone: "gap", glyph: "\u2715", label: "agent tools error" },
};

export type AppShellProps = {
  route: RouteId;
  onNavigate: (route: RouteId) => void;
  status: WebMcpController;
  revision: number;
  storageStatus: "ok" | "unavailable";
  onRequestReset: (trigger: HTMLElement) => void;
  children: ReactNode;
};

export function AppShell(props: AppShellProps) {
  const mark = PHASE_MARKS[props.status.phase];

  return (
    <div className="shell">
      <a className="skip-link" href="#room">
        Skip to the room
      </a>

      <header className="masthead">
        <div className="masthead__identity">
          <span className="masthead__monogram" aria-hidden="true">
            PR
          </span>
          <p className="masthead__wordmark">
            ProofRoom
            <span>Buyer-controlled evaluation</span>
          </p>
        </div>
        <nav className="masthead__nav" aria-label="Surfaces">
          {ROUTES.map((route, index) => (
            <button
              key={route.id}
              type="button"
              className="navlink"
              aria-current={props.route === route.id ? "page" : undefined}
              onClick={() => props.onNavigate(route.id)}
            >
              <span className="mono" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{route.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="statusstrip">
        <div className="statusstrip__tools">
          <StatusMark tone={mark.tone} glyph={mark.glyph} label={mark.label} />
          <p className="statusstrip__detail" aria-live="polite">
            {props.status.message}
            {props.status.failures.length > 0
              ? ` Failed: ${props.status.failures.map((failure) => failure.name).join(", ")}.`
              : ""}
          </p>
          {props.status.phase === "partial" || props.status.phase === "error" ? (
            <button
              className="button button--quiet registration-retry"
              type="button"
              onClick={props.status.retry}
            >
              Retry agent tools
            </button>
          ) : null}
        </div>
        <div className="statusstrip__room mono">
          <span>{props.status.expectedToolCount} WebMCP tools</span>
          <RevisionTag revision={props.revision} />
          <span>
            {props.storageStatus === "unavailable"
              ? "browser persistence unavailable"
              : "saved in this browser"}
          </span>
          <button
            className="reset-trigger"
            type="button"
            onClick={(event) => props.onRequestReset(event.currentTarget)}
          >
            Reset demo
          </button>
        </div>
      </div>

      <main className="main" id="room">
        {props.children}
      </main>

      <footer className="footer">
        <p>
          <strong>ProofRoom</strong> keeps agent work visible and human approval explicit.
        </p>
        <p className="mono">Northstar and every named entity are fictional demo content.</p>
        <p className="mono">{props.status.expectedToolCount} tools / 2 human approvals / local room</p>
      </footer>
    </div>
  );
}
