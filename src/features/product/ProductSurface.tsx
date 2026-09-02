import type { ReactNode } from "react";
import type { RoomState } from "../../domain/types.ts";
import {
  prioritizedCapabilities,
  prioritizedEvidence,
  prioritizedPackages,
} from "./personalization.ts";

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function ProductSurface({ room, context }: { room: RoomState; context?: ReactNode }) {
  const { vendor, canonicalBuyer: buyer } = room;
  const approved = room.approvedBuyerContext;
  const capabilities = prioritizedCapabilities(room);
  const proofRecords = prioritizedEvidence(room);
  const packages = prioritizedPackages(room);
  const euRequirement = room.requirements.find((requirement) => requirement.id === "req_eu_residency");

  return (
    <article className="surface surface--product motion-rise">
      <section className="product-opening" aria-labelledby="product-headline">
        <div className="product-opening__story">
          <h1 id="product-headline">Start with what Meridian Bank needs.</h1>
          {approved ? (
            <p className="approved-story-mark">
              <span aria-hidden="true">✓</span> Buying priorities approved for this review
            </p>
          ) : null}
          <p className="product-standfirst">
            Meridian Bank is considering the fictional Northstar platform. Before checking the
            vendor&apos;s claims, confirm the budget, payback target, and six requirements that
            should guide the review.
          </p>
          <dl className="product-facts" aria-label="Northstar product facts">
            <div>
              <dt>Fictional vendor</dt>
              <dd>{vendor.name}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{vendor.category}</dd>
            </div>
            <div>
              <dt>Buyer scenario</dt>
              <dd>{buyer.companyName}</dd>
            </div>
            <div>
              <dt>Typical implementation</dt>
              <dd>{vendor.implementation.typicalDays} days</dd>
            </div>
          </dl>
        </div>

        <aside className="proof-rail" aria-labelledby="proof-rail-heading">
          <div className="proof-rail__line" aria-hidden="true" />
          <div className="proof-rail__content">
            <h2 id="proof-rail-heading">See the proof behind the pitch</h2>
            <p>
              ProofRoom sits on this product page so a buyer and browser agent can test the pitch
              against structured evidence before a decision is approved.
            </p>
            <ol className="proof-rail__index">
              <li>
                <span className="proof-rail__number">01</span>
                <strong>9 browser-agent actions</strong>
                <span>Find proof, test fit, and prepare a recommendation</span>
              </li>
              <li>
                <span className="proof-rail__number">02</span>
                <strong>2 decisions only you can make</strong>
                <span>Buying priorities and the final recommendation stay with you</span>
              </li>
              <li>
                <span className="proof-rail__number">03</span>
                <strong>6 buying questions checked against 12 records</strong>
                <span>Gaps remain visible when the catalog cannot prove a claim</span>
              </li>
            </ol>
          </div>
        </aside>
      </section>

      {context}

      <aside className="fiction-note" aria-label="Fictional demo disclosure">
        <strong>Fictional demonstration</strong>
        <span>{vendor.fictionalDisclosure}</span>
        <span>{buyer.fictionalDisclosure}</span>
      </aside>

      <section className="editorial-section" aria-labelledby="workflow-heading">
        <header className="editorial-section__head">
          <h2 id="workflow-heading">A campaign operating system with the audit trail built in.</h2>
          <p>
            Briefs, approvals, access, and audience handoffs stay in one operational record. The
            story is persuasive; the adjacent proof check shows which parts are actually proven.
          </p>
        </header>
        <ol className="capability-ledger">
          {capabilities.map(({ capability, reason }, index) => (
            <li
              key={capability.id}
              className={reason ? "capability-ledger__priority" : ""}
              data-capability-id={capability.id}
            >
              <span className="ledger-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{capability.label}</h3>
                <p>{capability.summary}</p>
                {reason ? <p className="personalization-reason">{reason}</p> : null}
              </div>
              <span className="mono capability-ledger__id">{capability.id}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="proof-desk" aria-labelledby="proof-desk-heading">
        <div className="proof-desk__intro">
          <h2 id="proof-desk-heading">A vendor claim is not proof.</h2>
          <p>
            Integration and security statements below point to fictional source records. A source
            can support a condition, carry a limitation, or leave the answer open.
          </p>
        </div>
        <ol className="proof-desk__records">
          {proofRecords.map(({ record, relationship, unresolved }, index) => (
            <li
              key={record.id}
              className={unresolved ? "proof-desk__gap" : ""}
              data-evidence-id={record.id}
            >
              <div className="evidence-stamp">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span className="mono">{record.id}</span>
              </div>
              <div>
                <h3>{record.title}</h3>
                <p>{record.summary}</p>
                <p className="proof-desk__source mono">
                  {record.sourceLabel} | {record.trustClass} | {record.limitations.length} limitations
                </p>
                {relationship ? (
                  <p className="proof-desk__relationship">
                    Buyer requirement: {relationship}
                  </p>
                ) : null}
                {unresolved ? (
                  <p className="proof-desk__unresolved">
                    <strong>Requirement status: {euRequirement?.status ?? "unknown"}.</strong> The
                    catalog does not prove EU residency. It names only North American hosting
                    regions and gives no EU processing commitment.
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="editorial-section" aria-labelledby="packaging-heading">
        <header className="editorial-section__head editorial-section__head--narrow">
          <h2 id="packaging-heading">See price and implementation details before deciding.</h2>
          <p>
            List pricing and implementation timing are fictional demo inputs. They remain visible
            so the commercial model can be challenged later.
          </p>
        </header>
        <div className="commercial-sheet">
          <div className="commercial-sheet__tiers">
            {packages.map(({ tier, candidate, reason }) => (
              <section
                key={tier.id}
                aria-labelledby={`${tier.id}-heading`}
                className={candidate ? "commercial-sheet__candidate" : ""}
                data-package-id={tier.id}
              >
                <div>
                  <h3 id={`${tier.id}-heading`}>{tier.name}</h3>
                  <p className="commercial-sheet__price">{formatUsd(tier.annualListPrice)}</p>
                  <p className="mono">{tier.seatBand} | annual list price</p>
                  {candidate ? <p className="candidate-mark">Evaluation candidate</p> : null}
                </div>
                <div>
                  <ul>
                    {tier.includes.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                  {reason ? <p className="personalization-reason">{reason}</p> : null}
                </div>
              </section>
            ))}
          </div>
          <div className="implementation-file">
            <div>
              <h3>Implementation file</h3>
              <p>{vendor.implementation.summary}</p>
            </div>
            <ol>
              {vendor.implementation.milestones.map((milestone, index) => (
                <li key={milestone}>
                  <span className="mono">{String(index + 1).padStart(2, "0")}</span>
                  <span>{milestone}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </article>
  );
}
