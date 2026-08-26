/**
 * The canonical demo room.
 *
 * `createCanonicalRoom` is the single source of the reset state. Reset must
 * reproduce this value exactly, apart from the timestamp on the one system
 * event that records the reset.
 */
import { deriveRequirement } from "../domain/evidence.ts";
import { inputDigest } from "../domain/hash.ts";
import { calculateRoi } from "../domain/roi.ts";
import type { ActivityEvent, RoiAssumptions, RoomState } from "../domain/types.ts";
import { MERIDIAN_BANK } from "./buyer.ts";
import { CANONICAL_EVIDENCE } from "./evidence.ts";
import { CANONICAL_REQUIREMENTS } from "./requirements.ts";
import { NORTHSTAR } from "./vendor.ts";

export const CANONICAL_ROOM_ID = "northstar_meridian_room";

export const CANONICAL_SCHEMA_VERSION = 1 as const;

/**
 * Starting assumptions shown on the page. They are the buyer's numbers, not the
 * vendor's, and every one of them is editable.
 */
export const CANONICAL_ROI_ASSUMPTIONS: RoiAssumptions = {
  campaignsPerMonth: 20,
  hoursSavedPerCampaign: 6,
  loadedHourlyCost: 85,
  annualSubscriptionCost: 96000,
  implementationCost: 18000,
  budgetCeiling: 120000,
};

export const CANONICAL_SYSTEM_ACTION = "room_ready";

function canonicalSystemEvent(nowIso: string): ActivityEvent {
  return {
    id: "evt_0001",
    sequence: 1,
    origin: "system",
    action: CANONICAL_SYSTEM_ACTION,
    toolName: null,
    inputDigest: inputDigest({ roomId: CANONICAL_ROOM_ID, schemaVersion: CANONICAL_SCHEMA_VERSION }),
    inputSummary: "Canonical fixture loaded with 6 requirements and 12 evidence records.",
    resultStatus: "ok",
    revisionBefore: 0,
    revisionAfter: 0,
    affectedIds: [CANONICAL_ROOM_ID],
    panel: "system",
    mutating: false,
    untrustedContent: false,
    createdAt: nowIso,
  };
}

export function createCanonicalRoom(nowIso: string): RoomState {
  const evidenceCatalog = CANONICAL_EVIDENCE.map((record) => ({ ...record }));

  return {
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    roomId: CANONICAL_ROOM_ID,
    revision: 0,
    vendor: NORTHSTAR,
    canonicalBuyer: MERIDIAN_BANK,
    buyerContextProposal: null,
    approvedBuyerContext: null,
    requirements: CANONICAL_REQUIREMENTS.map((requirement) =>
      deriveRequirement({ ...requirement }, evidenceCatalog, nowIso),
    ),
    evidenceCatalog,
    roiAssumptions: { ...CANONICAL_ROI_ASSUMPTIONS },
    roiResult: calculateRoi({ ...CANONICAL_ROI_ASSUMPTIONS }),
    stakeholderBriefs: {},
    decisionProposal: null,
    approvedDecision: null,
    activityLedger: [canonicalSystemEvent(nowIso)],
    recoveryNotice: null,
  };
}

/**
 * The prompt the demo script uses. Kept in the repository so the eval manifest
 * and the README describe the same journey.
 */
export const CANONICAL_AGENT_PROMPT =
  "Evaluate Northstar for Meridian Bank, a 1,000 person fintech. We need bidirectional Salesforce integration, EU data residency, SAML single sign on, a current SOC 2 Type II report, twenty campaigns per month, and payback inside twelve months.";
