# Context approval visual audit

These deterministic captures document work order 004 at the two required edge viewports.
`tests/e2e/contextVisual.spec.ts` recreates them and checks approved-state page overflow.

| State | Route | 390 x 900 | 1600 x 900 |
| --- | --- | --- | --- |
| Before approval | Product | `product-before-390.png` | `product-before-1600.png` |
| After approval | Product | `product-after-390.png` | `product-after-1600.png` |
| Approved rail | Evaluation | `evaluation-approved-rail-390.png` | `evaluation-approved-rail-1600.png` |
| Approved rail | Decision | `decision-approved-rail-390.png` | `decision-approved-rail-1600.png` |

Approval changes four product regions:

1. The opening story names the buyer-approved context and leads with Meridian Bank priorities.
2. The capability ledger raises Salesforce, hosting, and SAML-related capabilities with reasons.
3. The proof desk follows hard-requirement order and names each relationship.
4. The commercial sheet raises Enterprise as an evaluation candidate because it contains SAML and
   remains under the fictional buyer-approved budget ceiling.

The EU hosting record remains visible after approval. Its copy says the requirement is `unknown`
because the catalog names only North American regions and does not prove EU residency.
