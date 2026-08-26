/**
 * Application shell.
 *
 * The shell carries the masthead, the three surface navigation, the live agent
 * tool status, and the fictional content disclosure. It holds no product logic.
 */
import type { ReactNode } from "react";
import { RevisionTag } from "../components/RevisionTag.tsx";
import { StatusMark, type StatusTone } from "../components/StatusMark.tsx";
import type { WebMcpStatus } from "../webmcp/useWebMCPTools.ts";
import { ROUTES, type RouteId } from "./routes.ts";

const PHASE_MARKS: Record<WebMcpStatus["phase"], { tone: StatusTone; glyph: string; label: string }> = {
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
  status: WebMcpStatus;
  revision: number;
  storageStatus: "ok" | "unavailable";
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
        <p className="masthead__wordmark">
          ProofRoom <span className="mono">northstar evaluation room</span>
        </p>
        <nav className="masthead__nav" aria-label="Surfaces">
          {ROUTES.map((route) => (
            <button
              key={route.id}
              type="button"
              className="navlink"
              aria-current={props.route === route.id ? "page" : undefined}
              onClick={() => props.onNavigate(route.id)}
            >
              {route.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="statusstrip">
        <StatusMark tone={mark.tone} glyph={mark.glyph} label={mark.label} />
        <p className="statusstrip__detail mono" aria-live="polite">
          {props.status.message}
          {props.status.failures.length > 0
            ? ` (${props.status.failures.map((failure) => failure.name).join(", ")})`
            : ""}
        </p>
        <p className="mono">
          <RevisionTag revision={props.revision} />
          {props.storageStatus === "unavailable"
            ? " | this browser will not save the room"
            : " | saved in this browser"}
        </p>
      </div>

      <main className="main" id="room">
        {props.children}
      </main>

      <footer className="footer">
        <p className="mono">
          Northstar, Meridian Bank, Larkfield Mutual, and Ridgeline Research are fictional. All
          evidence is demo content.
        </p>
        <p className="mono">
          {props.status.expectedToolCount} WebMCP tools, 2 human only approvals, MIT licensed.
        </p>
      </footer>
    </div>
  );
}
