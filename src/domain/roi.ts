/**
 * Deterministic ROI model.
 *
 * The model only values labor hours the buyer already pays for. It makes no
 * revenue, conversion, or pipeline claim, because the evidence catalog cannot
 * support one.
 */
import type { RoiAssumptions, RoiResult } from "./types.ts";

const MONTHS_PER_YEAR = 12;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundHours(value: number): number {
  return Math.round(value * 10) / 10;
}

export const ROI_FORMULA: readonly string[] = [
  "annual_hours_saved = campaigns_per_month * 12 * hours_saved_per_campaign",
  "annual_labor_value = annual_hours_saved * loaded_hourly_cost",
  "first_year_cost = annual_subscription_cost + implementation_cost",
  "first_year_net_value = annual_labor_value - first_year_cost",
  "monthly_labor_value = annual_labor_value / 12",
  "payback_months = first_year_cost / monthly_labor_value",
  "within_budget = annual_subscription_cost <= budget_ceiling",
];

export function calculateRoi(assumptions: RoiAssumptions): RoiResult {
  const annualHoursSaved = roundHours(
    assumptions.campaignsPerMonth * MONTHS_PER_YEAR * assumptions.hoursSavedPerCampaign,
  );
  const annualLaborValue = roundMoney(annualHoursSaved * assumptions.loadedHourlyCost);
  const monthlyLaborValue = roundMoney(annualLaborValue / MONTHS_PER_YEAR);
  const firstYearCost = roundMoney(
    assumptions.annualSubscriptionCost + assumptions.implementationCost,
  );
  const firstYearNetValue = roundMoney(annualLaborValue - firstYearCost);

  // A zero monthly value means the model cannot express payback at all. Reporting
  // `null` is honest; reporting Infinity or a large number would not be.
  const paybackMonths =
    monthlyLaborValue === 0 ? null : roundHours(firstYearCost / monthlyLaborValue);

  return {
    currency: "USD",
    assumptions,
    annualHoursSaved,
    annualLaborValue,
    monthlyLaborValue,
    firstYearCost,
    firstYearNetValue,
    paybackMonths,
    withinBudget: assumptions.annualSubscriptionCost <= assumptions.budgetCeiling,
    formula: [...ROI_FORMULA],
  };
}

export function paybackMeetsTarget(result: RoiResult, targetMonths: number): boolean {
  return result.paybackMonths !== null && result.paybackMonths <= targetMonths;
}
