import { StatusMark, type StatusTone } from "../components/StatusMark.tsx";
import type { WebMcpController } from "../webmcp/useWebMCPTools.ts";

const WORKFLOW = [
  {
    title: "Set the buying priorities",
    detail: "Confirm the budget, payback target, and requirements that matter to the team.",
  },
  {
    title: "Check the vendor's evidence",
    detail: "The agent matches source records to each buying requirement.",
  },
  {
    title: "Review the missing answers",
    detail: "See what is proven, partly proven, contradicted, or still unknown.",
  },
  {
    title: "Make the final decision",
    detail: "Review the recommendation and approve or reject it yourself.",
  },
] as const;

const EU_EXAMPLE = [
  {
    label: "Buying question",
    text: "Does this product keep our customer data in the EU?",
  },
  {
    label: "What the agent found",
    text: "The available records name North American hosting regions. They do not include an EU processing commitment.",
  },
  {
    label: "Answer",
    text: "Unknown: not proven by the available records.",
    tone: "gap" as const,
    glyph: "?",
  },
  {
    label: "Next step",
    text: "Ask the vendor for an EU region commitment before approving the purchase.",
  },
] as const;

const DECISION_CHAIN = [
  {
    title: "Set priorities",
    detail: "The buyer chooses what matters.",
  },
  {
    title: "Check evidence",
    detail: "The agent matches claims to source records.",
  },
  {
    title: "Approve the decision",
    detail: "Only the person can make it final.",
  },
] as const;

const REHEARSAL_PROMPT =
  "Evaluate Northstar for Meridian Bank, a 1,000-person fintech that needs bidirectional Salesforce integration, EU data residency, SAML single sign-on, a current SOC 2 Type II report, 20 campaigns per month, and payback inside 12 months. Read the room and available evidence, then prepare the buyer profile for review. Do not approve the buyer profile or a final decision. Stop when a person must review.";

const REHEARSAL_CHECKPOINTS = [
  "Read the current room.",
  "Search and evaluate the vendor evidence.",
  "Prepare the buyer profile for review.",
  "Stop for the person to approve or reject it.",
] as const;

const EVIDENCE_STATES = [
  {
    status: "Supported",
    glyph: "✓",
    detail: "Every required condition is proven by eligible records.",
  },
  {
    status: "Partial",
    glyph: "◐",
    detail: "Some conditions are proven, but at least one is still open.",
  },
  {
    status: "Unknown",
    glyph: "?",
    detail: "No eligible record proves the required conditions yet.",
  },
  {
    status: "Unsupported",
    glyph: "×",
    detail: "An eligible record directly contradicts a required condition.",
  },
] as const;

const STATUS_TONES: Record<WebMcpController["phase"], StatusTone> = {
  idle: "neutral",
  registering: "agent",
  registered: "verified",
  partial: "gap",
  unavailable: "neutral",
  error: "gap",
};

export function LandingPage({ status }: { status: WebMcpController }) {
  return (
    <article className="landing motion-rise">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero__copy">
          <h1 id="landing-title">Check a software vendor&apos;s claims before you buy.</h1>
          <div className="landing-definition">
            <p>
              ProofRoom is a workspace for teams buying business software. It compares your
              requirements with the vendor&apos;s documents, then shows what is proven, contradicted,
              or still missing.
            </p>
            <p>
              An AI browser agent can do the research and prepare a recommendation. You approve the
              priorities and make the final call.
            </p>
          </div>
          <div className="landing-actions">
            <a className="button landing-actions__primary" href="#product" aria-label="Open the fictional review from the introduction">
              Open the fictional review <span aria-hidden="true">↗</span>
            </a>
            <a className="landing-actions__secondary" href="#eu-example">
              See the EU data example <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
        <aside
          id="eu-example"
          className="landing-example"
          aria-label="Fictional EU data residency example"
        >
          <p className="landing-example__label mono">Fictional demo example</p>
          <ol className="landing-example__steps">
            {EU_EXAMPLE.map((step) => (
              <li key={step.label} data-example-tone={"tone" in step ? step.tone : undefined}>
                <p className="landing-example__step-label mono">{step.label}</p>
                {"tone" in step ? (
                  <p className="landing-example__answer">
                    <StatusMark tone={step.tone} glyph={step.glyph ?? "?"} label="unknown" />
                    <span>{step.text}</span>
                  </p>
                ) : (
                  <p>{step.text}</p>
                )}
              </li>
            ))}
          </ol>
        </aside>
        <ol
          className="landing-decision-chain landing-hero__chain"
          aria-label="How buyer requirements become a human-approved decision"
        >
          {DECISION_CHAIN.map((step, index) => (
            <li key={step.title}>
              <span className="landing-decision-chain__glyph" aria-hidden="true">
                {String(index + 1)}
              </span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </div>
              {index < DECISION_CHAIN.length - 1 ? (
                <span className="landing-decision-chain__arrow" aria-hidden="true">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-facts" aria-label="Room scale facts">
        <dl>
          <dt>Buying questions</dt>
          <dd>06</dd>
        </dl>
        <dl>
          <dt>Source records</dt>
          <dd>12</dd>
        </dl>
        <dl>
          <dt>Browser-agent actions</dt>
          <dd>09</dd>
        </dl>
        <dl>
          <dt>Decisions only you can make</dt>
          <dd>02</dd>
        </dl>
      </section>

      <section className="landing-workflow" id="how-it-works" aria-labelledby="workflow-title">
        <h2 id="workflow-title">The agent prepares the review. You make the decision.</h2>
        <ol>
          {WORKFLOW.map((step, index) => (
            <li key={step.title}>
              <span className="landing-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="authority-band" aria-labelledby="authority-title">
        <h2 id="authority-title">The agent can prepare the work. Only you can approve it.</h2>
        <div className="authority-band__grid">
          <article>
            <p className="authority-label">
              <span aria-hidden="true">A</span> Agent can
            </p>
            <ul>
              <li>Search the available vendor records</li>
              <li>Match records to buying requirements</li>
              <li>Calculate the labor-based business case</li>
              <li>Prepare finance and security summaries</li>
              <li>Prepare a recommendation for review</li>
            </ul>
          </article>
          <div className="authority-gate" aria-label="Person review gate">
            <span aria-hidden="true">→</span>
            <strong>Person reviews</strong>
            <span aria-hidden="true">→</span>
          </div>
          <article className="authority-band__person">
            <p className="authority-label">
              <span aria-hidden="true">P</span> Only a person can
            </p>
            <ul>
              <li>Approve which buying priorities guide the review</li>
              <li>Change the approved assumptions or requirements</li>
              <li>Approve or reject the final recommendation</li>
            </ul>
            <p className="authority-warning">
              The agent cannot accept terms, send data, contact a vendor, buy anything, or approve
              either gate.
            </p>
          </article>
        </div>
      </section>

      <section className="evidence-band" aria-labelledby="evidence-title">
        <div>
          <h2 id="evidence-title">Missing proof stays missing.</h2>
          <p>
            In this fictional demo, EU data residency stays <strong>Unknown</strong>. The records
            do not prove an EU region commitment, so ProofRoom keeps the question open.
          </p>
        </div>
        <ol aria-label="Evidence status meanings">
          {EVIDENCE_STATES.map((state) => (
            <li key={state.status}>
              <span className="evidence-state__glyph" aria-hidden="true">
                {state.glyph}
              </span>
              <strong>{state.status}</strong>
              <span>{state.detail}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-repeat-cta" aria-label="Open the fictional review">
        <a className="button landing-actions__primary" href="#product" aria-label="Open the fictional review after the evidence explanation">
          Open the fictional review <span aria-hidden="true">↗</span>
        </a>
      </section>

      <section className="agent-connection" aria-labelledby="agent-connection-title">
        <div>
          <h2 id="agent-connection-title">Browser agent status</h2>
          <p>
            A compatible AI browser can use ProofRoom&apos;s nine built-in actions. If it cannot,
            every task still works through the buttons on this page.
          </p>
          <p className="agent-connection__webmcp">
            Those actions are exposed through WebMCP when the browser supports it.
          </p>
        </div>
        <div className="agent-connection__status" aria-live="polite">
          <StatusMark
            tone={STATUS_TONES[status.phase]}
            glyph={status.phase === "registered" ? "✓" : status.phase === "unavailable" ? "○" : "◇"}
            label={`Agent tools ${status.phase}`}
          />
          <p>{status.message}</p>
          {status.phase === "partial" || status.phase === "error" ? (
            <button className="button button--quiet" type="button" onClick={status.retry}>
              Retry agent tools
            </button>
          ) : null}
        </div>
      </section>

      <details className="agent-rehearsal">
        <summary>Try the browser-agent path</summary>
        <div className="agent-rehearsal__body">
          <p>
            A compatible AI browser can discover ProofRoom&apos;s nine built-in WebMCP actions. The
            prompt below asks the agent to read state, inspect evidence, and prepare work for
            review. The agent must stop at the person-only approval boundary.
          </p>
          <p>
            If the browser does not support WebMCP, the same review remains usable through page
            controls.
          </p>
          <p className="agent-rehearsal__label mono">Exact natural-language prompt</p>
          <blockquote className="agent-rehearsal__prompt">{REHEARSAL_PROMPT}</blockquote>
          <p className="agent-rehearsal__label mono">Expected safe checkpoint</p>
          <ol className="agent-rehearsal__checkpoints">
            {REHEARSAL_CHECKPOINTS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="agent-rehearsal__note">
            This is a rehearsal guide only. Natural-language tool selection has not been verified in
            this repository.
          </p>
        </div>
      </details>

      <aside className="landing-disclosures" aria-label="Demo and storage disclosures">
        <p>
          <strong>Fictional demo:</strong> Northstar, Meridian Bank, every person, claim,
          testimonial, and evidence record are fictional.
        </p>
        <p>
          <strong>Browser-local room:</strong> Work is saved only in this browser&apos;s local
          storage. There is no account, database, telemetry, or live multi-user room.
        </p>
      </aside>
    </article>
  );
}
