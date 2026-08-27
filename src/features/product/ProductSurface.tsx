import type { RoomState } from "../../domain/types.ts";

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function ProductSurface({ room }: { room: RoomState }) {
  const { vendor, canonicalBuyer: buyer } = room;
  const proofRecords = room.evidenceCatalog.filter((record) =>
    ["ev_002", "ev_004", "ev_007"].includes(record.id),
  );

  return (
    <article className="surface surface--product motion-rise">
      <section className="product-opening" aria-labelledby="product-headline">
        <div className="product-opening__story">
          <h1 id="product-headline">{vendor.headline}</h1>
          <p className="product-standfirst">{vendor.primaryValue}</p>
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
            <h2 id="proof-rail-heading">Open the diligence file</h2>
            <p>
              ProofRoom sits on this product page so a buyer and browser agent can test the pitch
              against structured evidence before a decision is approved.
            </p>
            <ol className="proof-rail__index">
              <li>
                <span className="proof-rail__number">01</span>
                <strong>9 agent tools</strong>
                <span>Research, calculate, and stage work</span>
              </li>
              <li>
                <span className="proof-rail__number">02</span>
                <strong>2 human boundaries</strong>
                <span>Context and final decision stay with the person</span>
              </li>
              <li>
                <span className="proof-rail__number">03</span>
                <strong>6 requirements, 12 records</strong>
                <span>Gaps remain visible when the catalog cannot prove a claim</span>
              </li>
            </ol>
          </div>
        </aside>
      </section>

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
            story is persuasive; the adjacent diligence file shows which parts are actually proven.
          </p>
        </header>
        <ol className="capability-ledger">
          {vendor.capabilities.map((capability, index) => (
            <li key={capability.id}>
              <span className="ledger-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{capability.label}</h3>
                <p>{capability.summary}</p>
              </div>
              <span className="mono capability-ledger__id">{capability.id}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="proof-desk" aria-labelledby="proof-desk-heading">
        <div className="proof-desk__intro">
          <h2 id="proof-desk-heading">The product claim and the proof record stay separate.</h2>
          <p>
            Integration and security statements below point to fictional source records. A source
            can support a condition, carry a limitation, or leave the answer open.
          </p>
        </div>
        <ol className="proof-desk__records">
          {proofRecords.map((record, index) => (
            <li key={record.id}>
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
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="editorial-section" aria-labelledby="packaging-heading">
        <header className="editorial-section__head editorial-section__head--narrow">
          <h2 id="packaging-heading">Packaging is legible before the buying work begins.</h2>
          <p>
            List pricing and implementation timing are fictional demo inputs. They remain visible
            so the commercial model can be challenged later.
          </p>
        </header>
        <div className="commercial-sheet">
          <div className="commercial-sheet__tiers">
            {vendor.packaging.map((tier) => (
              <section key={tier.id} aria-labelledby={`${tier.id}-heading`}>
                <div>
                  <h3 id={`${tier.id}-heading`}>{tier.name}</h3>
                  <p className="commercial-sheet__price">{formatUsd(tier.annualListPrice)}</p>
                  <p className="mono">{tier.seatBand} | annual list price</p>
                </div>
                <ul>
                  {tier.includes.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
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
