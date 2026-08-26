/**
 * Domain types. Every shape is inferred from a strict schema so a schema change
 * cannot silently drift away from the types the application compiles against.
 */
import type { z } from "zod";
import type {
  activityEventSchema,
  approvedDecisionSchema,
  buyerContextProposalSchema,
  buyerContextSchema,
  buyerProfileSchema,
  capabilitySchema,
  decisionPayloadSchema,
  decisionProposalSchema,
  decisionStatusSchema,
  evidenceRecordSchema,
  evidenceTypeSchema,
  packagingTierSchema,
  panelSchema,
  proposalStatusSchema,
  proposalTypeSchema,
  receiptSchema,
  recoveryNoticeSchema,
  requirementPrioritySchema,
  requirementSchema,
  requirementStatusSchema,
  roiAssumptionsSchema,
  roiResultSchema,
  roomStateSchema,
  stakeholderBriefSchema,
  stakeholderRoleSchema,
  trustClassSchema,
  vendorProfileSchema,
  actionOriginSchema,
  persistedRoomSchema,
} from "./schemas.ts";

export type EvidenceType = z.infer<typeof evidenceTypeSchema>;
export type TrustClass = z.infer<typeof trustClassSchema>;
export type RequirementStatus = z.infer<typeof requirementStatusSchema>;
export type RequirementPriority = z.infer<typeof requirementPrioritySchema>;
export type DecisionStatus = z.infer<typeof decisionStatusSchema>;
export type StakeholderRole = z.infer<typeof stakeholderRoleSchema>;
export type ActionOrigin = z.infer<typeof actionOriginSchema>;
export type Panel = z.infer<typeof panelSchema>;
export type ProposalType = z.infer<typeof proposalTypeSchema>;
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

export type Capability = z.infer<typeof capabilitySchema>;
export type PackagingTier = z.infer<typeof packagingTierSchema>;
export type VendorProfile = z.infer<typeof vendorProfileSchema>;
export type BuyerProfile = z.infer<typeof buyerProfileSchema>;
export type BuyerContext = z.infer<typeof buyerContextSchema>;
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type RoiAssumptions = z.infer<typeof roiAssumptionsSchema>;
export type RoiResult = z.infer<typeof roiResultSchema>;
export type StakeholderBrief = z.infer<typeof stakeholderBriefSchema>;
export type DecisionPayload = z.infer<typeof decisionPayloadSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
export type ApprovedDecision = z.infer<typeof approvedDecisionSchema>;
export type BuyerContextProposal = z.infer<typeof buyerContextProposalSchema>;
export type DecisionProposal = z.infer<typeof decisionProposalSchema>;
export type ActivityEvent = z.infer<typeof activityEventSchema>;
export type RecoveryNotice = z.infer<typeof recoveryNoticeSchema>;
export type RoomState = z.infer<typeof roomStateSchema>;
export type PersistedRoom = z.infer<typeof persistedRoomSchema>;

/**
 * Structural proposal envelope. `BuyerContextProposal` and `DecisionProposal`
 * are the only concrete instances in this release.
 */
export type Proposal<Payload> = {
  id: string;
  type: ProposalType;
  baseRevision: number;
  inputDigest: string;
  createdBy: "webmcp" | "ui";
  createdAt: string;
  expiresAt: string;
  status: ProposalStatus;
  payload: Payload;
};
