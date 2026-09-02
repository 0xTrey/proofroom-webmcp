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

function mobileStatusLine(status: WebMcpController): string {
  if (status.phase === "unavailable") {
    return "No agent connection. Page buttons still work.";
  }
  if (status.phase === "registered") {
    return "Browser agent connected.";
  }
  if (status.phase === "registering") {
    return "Connecting browser agent.";
  }
  if (status.phase === "partial") {
    return `${status.registeredToolNames.length} of ${status.expectedToolCount} agent tools connected.`;
  }
  return "Agent tools need attention.";
}

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
  const isHome = props.route === "home";
  const mobileLine = mobileStatusLine(props.status);

  return (
    <div className={`shell ${isHome ? "shell--landing" : "shell--room"}`}>
      <a className="skip-link" href={isHome ? "#landing" : "#room"}>
        {isHome ? "Skip to the explanation" : "Skip to the room"}
      </a>

      <header className="masthead">
        <button
          className="masthead__identity"
          type="button"
          onClick={() => props.onNavigate("home")}
          aria-label="ProofRoom, how it works"
        >
          <span className="masthead__monogram" aria-hidden="true">
            PR
          </span>
          <p className="masthead__wordmark">
            ProofRoom
            <span>Software buying workspace</span>
          </p>
        </button>
        {isHome ? (
          <nav className="masthead__nav masthead__nav--landing" aria-label="Landing routes">
            <a className="navlink" href="#how-it-works">
              How it works
            </a>
            <a className="navlink navlink--action" href="#product">
              Enter review
            </a>
          </nav>
        ) : (
          <nav className="masthead__nav" aria-label="Room sections">
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
        )}
      </header>

      {!isHome ? (
        <div className="statusstrip">
          <div className="statusstrip__compact">
            <p className="statusstrip__mobile-line" aria-live="polite">
              <span
                className={`statusstrip__mobile-glyph statusmark--${mark.tone}`}
                aria-hidden="true"
              >
                {mark.glyph}
              </span>
              <span>{mobileLine}</span>
            </p>
            <button
              className="reset-trigger"
              type="button"
              onClick={(event) => props.onRequestReset(event.currentTarget)}
            >
              Reset demo
            </button>
          </div>
          {props.status.phase === "partial" || props.status.phase === "error" ? (
            <div className="statusstrip__retry-row">
              <p className="statusstrip__detail" aria-live="polite">
                {props.status.message}
                {props.status.failures.length > 0
                  ? ` Failed: ${props.status.failures.map((failure) => failure.name).join(", ")}.`
                  : ""}
              </p>
              <button
                className="button button--quiet registration-retry"
                type="button"
                onClick={props.status.retry}
              >
                Retry agent tools
              </button>
            </div>
          ) : null}
          <div className="statusstrip__tools statusstrip__tools--desktop">
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
          <div className="statusstrip__room statusstrip__room--desktop mono">
            <span>{props.status.expectedToolCount} browser-agent actions</span>
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
          <details className="statusstrip__details">
            <summary>Room details</summary>
            <dl className="statusstrip__details-list mono">
              <div>
                <dt>Browser-agent actions</dt>
                <dd>{props.status.expectedToolCount}</dd>
              </div>
              <div>
                <dt>Revision</dt>
                <dd>{String(props.revision).padStart(3, "0")}</dd>
              </div>
              <div>
                <dt>Storage</dt>
                <dd>
                  {props.storageStatus === "unavailable"
                    ? "browser persistence unavailable"
                    : "saved in this browser"}
                </dd>
              </div>
            </dl>
          </details>
        </div>
      ) : null}

      <main className="main" id={isHome ? "landing" : "room"}>
        {props.children}
      </main>

      <footer className="footer">
        <p>
          <strong>ProofRoom</strong> keeps agent work visible and the final call with the person.
        </p>
        <p className="mono">Northstar and every named entity are fictional demo content.</p>
        <p className="mono">
          {props.status.expectedToolCount} agent actions / 2 person-only approvals / browser-local
          room
        </p>
      </footer>
    </div>
  );
}
