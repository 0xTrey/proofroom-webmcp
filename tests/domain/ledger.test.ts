import { describe, expect, it } from "vitest";
import {
  LEDGER_PAGE_SIZE,
  filterLedger,
  ledgerPage,
  ledgerTotals,
} from "../../src/domain/actions/ledger.ts";
import { MERIDIAN_CONTEXT_DRAFT } from "../../src/fixtures/buyer.ts";
import { createMemoryRoomStorage } from "../../src/state/persistence.ts";
import { createToolDefinitions } from "../../src/webmcp/toolDefinitions.ts";
import { registerRoomTools } from "../../src/webmcp/registerTools.ts";
import { createModelContextShim } from "../../src/webmcp/testShim.ts";
import { createTestRoom } from "../support/room.ts";

describe("activity ledger projections", () => {
  it("combines origin, kind, and panel filters without classifying System as a read", () => {
    const handle = createTestRoom();
    expect(handle.agentActions.getRoomState().ok).toBe(true);
    expect(handle.actions.calculateRoi(handle.room().roiAssumptions).ok).toBe(true);
    expect(
      handle.actions.applyRoiAssumptions({
        ...handle.room().roiAssumptions,
        budgetCeiling: 100000,
      }).ok,
    ).toBe(true);

    expect(filterLedger(handle.room().activityLedger).map((event) => event.sequence)).toEqual([
      4, 3, 2, 1,
    ]);
    expect(
      filterLedger(handle.room().activityLedger, {
        origin: "ui",
        kind: "read",
        panel: "roi",
      }).map((event) => event.action),
    ).toEqual(["calculate_roi"]);
    expect(
      filterLedger(handle.room().activityLedger, { origin: "system", kind: "read" }),
    ).toEqual([]);
    expect(
      filterLedger(handle.room().activityLedger, { kind: "mutate" }).map(
        (event) => event.action,
      ),
    ).toEqual(["apply_roi_assumptions"]);

    expect(ledgerTotals(handle.room().activityLedger)).toMatchObject({
      total: 4,
      reads: 2,
      mutations: 1,
      byOrigin: { ui: 2, webmcp: 1, system: 1 },
    });
  });

  it("slices twenty-five newest events at a time and reports exact totals", () => {
    const handle = createTestRoom();
    for (let index = 0; index < 60; index += 1) {
      expect(handle.agentActions.getRoomState().ok).toBe(true);
    }

    const first = ledgerPage(handle.room().activityLedger, {}, LEDGER_PAGE_SIZE);
    expect(first.events).toHaveLength(25);
    expect(first.visibleCount).toBe(25);
    expect(first.filteredTotal).toBe(61);
    expect(first.allTotal).toBe(61);
    expect(first.hasMore).toBe(true);
    expect(first.events[0]?.sequence).toBe(61);
    expect(first.events.at(-1)?.sequence).toBe(37);

    const second = ledgerPage(handle.room().activityLedger, {}, LEDGER_PAGE_SIZE * 2);
    expect(second.events).toHaveLength(50);
    expect(second.events.at(-1)?.sequence).toBe(12);
  });

  it("keeps the four-hundred-event cap while sequence values remain monotonic", () => {
    const handle = createTestRoom();
    for (let index = 0; index < 405; index += 1) {
      expect(handle.agentActions.getRoomState().ok).toBe(true);
    }

    expect(handle.room().activityLedger).toHaveLength(400);
    expect(handle.room().activityLedger[0]?.sequence).toBe(7);
    expect(handle.room().activityLedger.at(-1)?.sequence).toBe(406);

    expect(handle.agentActions.getRoomState().ok).toBe(true);
    expect(handle.room().activityLedger).toHaveLength(400);
    expect(handle.room().activityLedger[0]?.sequence).toBe(8);
    expect(handle.room().activityLedger.at(-1)?.sequence).toBe(407);
    expect(
      filterLedger(handle.room().activityLedger, {
        origin: "webmcp",
        kind: "read",
        panel: "product",
      }),
    ).toHaveLength(400);
  });
});

describe("ledger privacy", () => {
  it("keeps raw buyer and brief strings out of ledger fields, tool responses, and persisted events", async () => {
    const storage = createMemoryRoomStorage();
    const handle = createTestRoom({ storage });
    const sensitiveBuyer = "Fictional Moonvault Committee 947";
    const sensitiveBrief = "Fictional sealed phrase orchard-lantern-583";
    const shim = createModelContextShim();
    await registerRoomTools(createToolDefinitions(handle.agentActions), {
      modelContext: shim.modelContext,
      signal: new AbortController().signal,
    });

    const buyerResponse = await shim.callTool("propose_buyer_context", {
      ...MERIDIAN_CONTEXT_DRAFT,
      companyName: sensitiveBuyer,
    });
    const briefResponse = await shim.callTool("save_stakeholder_brief", {
      role: "cfo",
      summary: `${sensitiveBrief} is restricted committee context.`,
      evidenceIds: [],
      risks: [`Do not repeat ${sensitiveBrief} outside this fictional review.`],
      openQuestions: [`Who may inspect ${sensitiveBrief}?`],
      nextStep: `Review ${sensitiveBrief} with the fictional committee.`,
    });

    expect(buyerResponse.isError).not.toBe(true);
    expect(briefResponse.isError).not.toBe(true);
    for (const raw of [sensitiveBuyer, sensitiveBrief]) {
      expect(JSON.stringify(buyerResponse)).not.toContain(raw);
      expect(JSON.stringify(briefResponse)).not.toContain(raw);
      expect(JSON.stringify(handle.room().activityLedger)).not.toContain(raw);
    }

    const persisted = storage.load();
    expect(persisted.status).toBe("found");
    if (persisted.status !== "found") {
      return;
    }
    const persistedEvents = (persisted.raw as { room: { activityLedger: unknown[] } }).room
      .activityLedger;
    expect(JSON.stringify(persistedEvents)).not.toContain(sensitiveBuyer);
    expect(JSON.stringify(persistedEvents)).not.toContain(sensitiveBrief);
  });
});
