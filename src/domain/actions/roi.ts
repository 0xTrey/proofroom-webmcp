/**
 * Commercial model actions.
 *
 * `calculate_roi` is read only. It returns a result for a supplied assumption
 * set and never replaces the assumptions on the page. Applying assumptions is a
 * visible UI action, because the numbers belong to the buyer.
 */
import { failure } from "../errors.ts";
import { calculateRoi, paybackMeetsTarget } from "../roi.ts";
import type { RoiAssumptions, RoiResult, RoomState } from "../types.ts";
import { applyRoiAssumptionsInputSchema, calculateRoiInputSchema } from "./inputs.ts";
import { defineAction, outcome } from "./runtime.ts";

export type RoiCalculation = RoiResult & {
  applied: false;
  budgetComparison: {
    annualSubscriptionCost: number;
    budgetCeiling: number;
    withinBudget: boolean;
    headroom: number;
  };
  paybackTargetMonths: number | null;
  meetsPaybackTarget: boolean | null;
  explanation: string[];
  nextAction: string;
};

export type RoiApplied = {
  revision: number;
  assumptions: RoiAssumptions;
  result: RoiResult;
  changedFields: string[];
};

function explain(result: RoiResult): string[] {
  return [
    `annual_hours_saved = ${result.assumptions.campaignsPerMonth} * 12 * ${result.assumptions.hoursSavedPerCampaign} = ${result.annualHoursSaved}`,
    `annual_labor_value = ${result.annualHoursSaved} * ${result.assumptions.loadedHourlyCost} = ${result.annualLaborValue}`,
    `first_year_cost = ${result.assumptions.annualSubscriptionCost} + ${result.assumptions.implementationCost} = ${result.firstYearCost}`,
    `first_year_net_value = ${result.annualLaborValue} - ${result.firstYearCost} = ${result.firstYearNetValue}`,
    `monthly_labor_value = ${result.annualLaborValue} / 12 = ${result.monthlyLaborValue}`,
    result.paybackMonths === null
      ? "payback_months is null because monthly_labor_value is zero"
      : `payback_months = ${result.firstYearCost} / ${result.monthlyLaborValue} = ${result.paybackMonths}`,
    "The model values operator hours only. It makes no revenue or conversion claim.",
  ];
}

export const calculateRoiAction = defineAction({
  action: "calculate_roi",
  toolName: "calculate_roi",
  panel: "roi",
  mutating: false,
  schema: calculateRoiInputSchema,
  run: (state, input) => {
    const result = calculateRoi(input);
    const target = state.approvedBuyerContext?.paybackTargetMonths ?? null;

    const value: RoiCalculation = {
      ...result,
      applied: false,
      budgetComparison: {
        annualSubscriptionCost: input.annualSubscriptionCost,
        budgetCeiling: input.budgetCeiling,
        withinBudget: result.withinBudget,
        headroom: Math.round((input.budgetCeiling - input.annualSubscriptionCost) * 100) / 100,
      },
      paybackTargetMonths: target,
      meetsPaybackTarget: target === null ? null : paybackMeetsTarget(result, target),
      explanation: explain(result),
      nextAction:
        "Review the assumptions in the page. A person applies them to the room; this tool does not.",
    };

    return outcome({
      value,
      inputSummary: `Calculated ROI for a supplied assumption set without applying it to the room.`,
      affectedIds: [state.roomId],
    });
  },
});

export const applyRoiAssumptionsAction = defineAction({
  action: "apply_roi_assumptions",
  toolName: null,
  panel: "roi",
  mutating: true,
  schema: applyRoiAssumptionsInputSchema,
  run: (state, input, context) => {
    const changedFields = (Object.keys(input) as Array<keyof RoiAssumptions>).filter(
      (field) => state.roiAssumptions[field] !== input[field],
    );

    if (changedFields.length === 0) {
      return failure("INVALID_INPUT", "No ROI assumptions changed.");
    }

    const result = calculateRoi(input);

    const value: RoiApplied = {
      revision: context.nextRevision,
      assumptions: input,
      result,
      changedFields: changedFields.map(String),
    };

    return outcome({
      value,
      patch: (current: RoomState) => ({
        ...current,
        roiAssumptions: input,
        roiResult: result,
      }),
      affectedIds: [state.roomId],
      inputSummary: `Applied ${changedFields.length} assumption changes to the room model.`,
    });
  },
});
