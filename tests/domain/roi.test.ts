import { describe, expect, it } from "vitest";
import { calculateRoi, paybackMeetsTarget } from "../../src/domain/roi.ts";
import { roiAssumptionsSchema } from "../../src/domain/schemas.ts";
import { CANONICAL_ROI_ASSUMPTIONS } from "../../src/fixtures/demoScenario.ts";

describe("ROI model", () => {
  it("calculates the canonical assumption set exactly", () => {
    const result = calculateRoi(CANONICAL_ROI_ASSUMPTIONS);

    expect(result.annualHoursSaved).toBe(1440);
    expect(result.annualLaborValue).toBe(122400);
    expect(result.monthlyLaborValue).toBe(10200);
    expect(result.firstYearCost).toBe(114000);
    expect(result.firstYearNetValue).toBe(8400);
    expect(result.paybackMonths).toBe(11.2);
    expect(result.withinBudget).toBe(true);
    expect(result.currency).toBe("USD");
  });

  it("reports the budget ceiling breach when the ceiling drops", () => {
    const result = calculateRoi({ ...CANONICAL_ROI_ASSUMPTIONS, budgetCeiling: 90000 });
    expect(result.withinBudget).toBe(false);
    expect(result.paybackMonths).toBe(11.2);
  });

  it("returns null payback when there is no monthly labor value", () => {
    const result = calculateRoi({
      ...CANONICAL_ROI_ASSUMPTIONS,
      campaignsPerMonth: 0,
      hoursSavedPerCampaign: 0,
    });

    expect(result.annualHoursSaved).toBe(0);
    expect(result.monthlyLaborValue).toBe(0);
    expect(result.paybackMonths).toBeNull();
    expect(result.firstYearNetValue).toBe(-114000);
  });

  it("rounds money to cents and hours to a tenth", () => {
    const result = calculateRoi({
      campaignsPerMonth: 7,
      hoursSavedPerCampaign: 1.33,
      loadedHourlyCost: 77.77,
      annualSubscriptionCost: 12345.67,
      implementationCost: 987.65,
      budgetCeiling: 20000,
    });

    expect(result.annualHoursSaved).toBe(111.7);
    expect(result.annualLaborValue).toBe(8686.91);
    expect(result.firstYearCost).toBe(13333.32);
    expect(result.firstYearNetValue).toBe(-4646.41);
  });

  it("compares payback against a target", () => {
    const result = calculateRoi(CANONICAL_ROI_ASSUMPTIONS);
    expect(paybackMeetsTarget(result, 12)).toBe(true);
    expect(paybackMeetsTarget(result, 6)).toBe(false);
  });

  it("rejects assumptions outside the bounded ranges", () => {
    expect(
      roiAssumptionsSchema.safeParse({ ...CANONICAL_ROI_ASSUMPTIONS, campaignsPerMonth: 501 }).success,
    ).toBe(false);
    expect(
      roiAssumptionsSchema.safeParse({ ...CANONICAL_ROI_ASSUMPTIONS, loadedHourlyCost: -1 }).success,
    ).toBe(false);
    expect(
      roiAssumptionsSchema.safeParse({ ...CANONICAL_ROI_ASSUMPTIONS, campaignsPerMonth: 3.5 }).success,
    ).toBe(false);
    expect(
      roiAssumptionsSchema.safeParse({ ...CANONICAL_ROI_ASSUMPTIONS, unexpected: true }).success,
    ).toBe(false);
  });
});
