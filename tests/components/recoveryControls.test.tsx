import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { useStore } from "zustand";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../../src/app/ErrorBoundary.tsx";
import { RecoveryPanel } from "../../src/app/RecoveryPanel.tsx";
import { ResetDialog } from "../../src/app/ResetDialog.tsx";
import { ResetResultPanel } from "../../src/app/ResetResultPanel.tsx";
import { createMemoryRoomStorage } from "../../src/state/persistence.ts";
import type { TestRoom } from "../support/room.ts";
import { createTestRoom, FIXED_NOW } from "../support/room.ts";

function RecoveryHarness({ handle }: { handle: TestRoom }) {
  const room = useStore(handle.store, (value) => value.room);
  const storageStatus = useStore(handle.store, (value) => value.storageStatus);
  const storageDetail = useStore(handle.store, (value) => value.storageDetail);
  return (
    <RecoveryPanel
      notice={room.recoveryNotice}
      storageStatus={storageStatus}
      storageDetail={storageDetail}
      actions={handle.actions}
      onRetryPersist={handle.retryPersist}
    />
  );
}

function ResetHarness({ handle }: { handle: TestRoom }) {
  const [open, setOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const [result, setResult] = useState<ReturnType<TestRoom["actions"]["resetRoom"]> | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          setOpener(event.currentTarget);
          setOpen(true);
        }}
      >
        Reset demo
      </button>
      <ResetDialog
        open={open}
        opener={opener}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setResult(handle.actions.resetRoom());
          setOpen(false);
        }}
      />
      {result?.ok ? (
        <ResetResultPanel
          result={result.value}
          persistenceFailed={handle.store.getState().storageStatus === "unavailable"}
          onRetryPersist={handle.retryPersist}
          onDismiss={() => setResult(null)}
        />
      ) : null}
    </>
  );
}

describe("global reset flow", () => {
  it("opens without mutation, traps focus, cancels with Escape, and returns focus", async () => {
    const handle = createTestRoom();
    const user = userEvent.setup();
    const before = structuredClone(handle.room());
    render(<ResetHarness handle={handle} />);
    const trigger = screen.getByRole("button", { name: "Reset demo" });

    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Reset this fictional demonstration?" });
    expect(handle.room()).toEqual(before);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(dialog).toHaveTextContent("Approved buyer context and its receipt");
    expect(dialog).toHaveTextContent("Requirement attachments and buyer notes");
    expect(dialog).toHaveTextContent("ROI changes");
    expect(dialog).toHaveTextContent("CFO and CISO briefs");
    expect(dialog).toHaveTextContent("The decision proposal and approved decision");
    expect(dialog).toHaveTextContent("Prior activity ledger history");
    expect(dialog).toHaveTextContent("Six fictional requirements");
    expect(dialog).toHaveTextContent("Twelve fictional evidence records");
    expect(dialog).toHaveTextContent("Canonical commercial assumptions");
    expect(dialog).toHaveTextContent("Schema version 1");
    expect(dialog).toHaveTextContent("One new canonical System event");

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("button", { name: "Reset to canonical fixture" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(handle.room()).toEqual(before);
  });

  it("confirms once and renders the exact non-authoritative reset receipt", async () => {
    const handle = createTestRoom();
    expect(
      handle.actions.applyRoiAssumptions({
        ...handle.room().roiAssumptions,
        budgetCeiling: 100000,
      }).ok,
    ).toBe(true);
    const reset = vi.spyOn(handle.actions, "resetRoom");
    const user = userEvent.setup();
    render(<ResetHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Reset demo" }));
    await user.click(screen.getByRole("button", { name: "Reset to canonical fixture" }));

    expect(reset).toHaveBeenCalledTimes(1);
    expect(handle.room().revision).toBe(0);
    expect(handle.room().activityLedger).toHaveLength(1);
    const panel = screen.getByRole("region", { name: "The canonical fixture is active." });
    expect(panel).toHaveTextContent("rcp_0001");
    expect(panel).toHaveTextContent("reset");
    expect(panel).toHaveTextContent("6");
    expect(panel).toHaveTextContent("12");
    expect(panel).toHaveTextContent("Revision");
    expect(panel).toHaveTextContent("0");
    expect(panel.textContent).toMatch(/[0-9a-f]{16}/);
  });

  it("states that tab reset succeeded when persistence fails and offers retry", async () => {
    const options = { failWrites: true };
    const handle = createTestRoom({ storage: createMemoryRoomStorage(options) });
    const user = userEvent.setup();
    render(<ResetHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Reset demo" }));
    await user.click(screen.getByRole("button", { name: "Reset to canonical fixture" }));

    expect(screen.getByText(/current tab reset succeeded/i)).toBeVisible();
    expect(screen.getByText(/Reload may restore old or empty state/)).toBeVisible();
    options.failWrites = false;
    await user.click(screen.getByRole("button", { name: "Try saving again" }));

    expect(screen.queryByText(/Reload may restore old or empty state/)).not.toBeInTheDocument();
    expect(screen.getByText("The canonical fixture is now saved in this browser.")).toBeVisible();
    expect(
      screen.getByRole("region", { name: "The canonical fixture is active." }),
    ).toHaveTextContent("rcp_0001");
  });
});

describe("recovery panels", () => {
  it.each([
    {
      name: "invalid state",
      seed: { schemaVersion: 1, savedAt: "bad", room: {} },
      code: "invalid_persisted_state",
      action: "Continue with recovered fixture",
    },
    {
      name: "unsupported version",
      seed: { schemaVersion: 99, savedAt: FIXED_NOW, room: { schemaVersion: 99 } },
      code: "unsupported_schema_version",
      action: "Continue with recovered fixture",
    },
  ])("renders and resolves $name explicitly", async ({ seed, code, action }) => {
    const handle = createTestRoom({ storage: createMemoryRoomStorage({ seed }) });
    const before = handle.room().revision;
    const user = userEvent.setup();
    render(<RecoveryHarness handle={handle} />);

    expect(screen.getByText(new RegExp(`Notice code: ${code}`))).toBeVisible();
    expect(screen.getAllByText(/UTC/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: action }));

    await waitFor(() => expect(screen.queryByText(new RegExp(`Notice code: ${code}`))).not.toBeInTheDocument());
    expect(handle.room().revision).toBe(before + 1);
    expect(handle.room().activityLedger.at(-1)?.action).toBe("dismiss_recovery_notice");
  });

  it("labels legacy receipt reconstruction as an upgrade and persists it after continue", async () => {
    const source = createTestRoom();
    const staged = source.actions.proposeBuyerContext({
      companyName: "Fictional Legacy Buyer",
      industry: "Fictional finance",
      employeeBand: "501 to 1,000",
      personas: ["CFO"],
      priorities: ["Review a fictional purchase."],
      hardRequirements: ["Keep the review deterministic."],
      budgetCeiling: 120000,
      paybackTargetMonths: 12,
    });
    if (!staged.ok) throw new Error("Could not stage legacy context");
    expect(source.actions.approveBuyerContext({ proposalId: staged.value.proposalId }).ok).toBe(true);
    const legacy = structuredClone(source.room()) as unknown as Record<string, unknown>;
    delete legacy.approvedBuyerContextReceipt;
    const storage = createMemoryRoomStorage({
      seed: { schemaVersion: 1, savedAt: FIXED_NOW, room: legacy },
    });
    const handle = createTestRoom({ storage });
    const user = userEvent.setup();
    render(<RecoveryHarness handle={handle} />);

    expect(screen.getByText("The saved room was upgraded in place.")).toBeVisible();
    expect(screen.getByText(/Notice code: persisted_state_migrated/)).toBeVisible();
    expect(handle.room().approvedBuyerContextReceipt).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Continue with upgraded room" }));

    const reloaded = createTestRoom({ storage });
    expect(reloaded.room().recoveryNotice).toBeNull();
    expect(reloaded.room().approvedBuyerContextReceipt).not.toBeNull();
  });

  it("retries unavailable storage without mutating revision or ledger", async () => {
    const options = { failReads: true, failWrites: true };
    const handle = createTestRoom({ storage: createMemoryRoomStorage(options) });
    const before = structuredClone(handle.room());
    const user = userEvent.setup();
    render(<RecoveryHarness handle={handle} />);

    expect(screen.getByText(/Current-tab work remains usable in memory/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Try saving again" }));
    expect(screen.getByText(/PERSISTENCE_UNAVAILABLE/)).toBeVisible();
    expect(handle.room()).toEqual(before);

    options.failReads = false;
    options.failWrites = false;
    await user.click(screen.getByRole("button", { name: "Try saving again" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Browser persistence is unavailable." })).not.toBeInTheDocument(),
    );
    expect(handle.room().revision).toBe(before.revision);
    expect(handle.room().activityLedger).toEqual(before.activityLedger);
  });
});

describe("render failure privacy", () => {
  it("hides thrown text, retries without mutation, and opens reset confirmation without resetting", async () => {
    const handle = createTestRoom();
    const before = structuredClone(handle.room());
    const openReset = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const secret = "token-secret-sentence-please-never-render";
    let shouldThrow = true;
    function FragileSurface() {
      if (shouldThrow) {
        throw new Error(secret);
      }
      return <p>Surface recovered</p>;
    }
    const user = userEvent.setup();
    render(
      <ErrorBoundary onOpenReset={openReset}>
        <FragileSurface />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("heading", { name: "This surface stopped rendering" })).toBeVisible();
    expect(screen.queryByText(secret, { exact: false })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open reset confirmation" }));
    expect(openReset).toHaveBeenCalledTimes(1);
    expect(handle.room()).toEqual(before);

    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: "Try this surface again" }));
    expect(screen.getByText("Surface recovered")).toBeVisible();
    expect(handle.room()).toEqual(before);
    consoleError.mockRestore();
  });

  it("keeps the shared reset dialog available and clears the boundary after confirmed reset", async () => {
    const handle = createTestRoom();
    expect(
      handle.actions.applyRoiAssumptions({
        ...handle.room().roiAssumptions,
        budgetCeiling: 100000,
      }).ok,
    ).toBe(true);
    const secret = "secret-like-render-failure-sentence";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    function Harness() {
      const [failed, setFailed] = useState(true);
      const [boundaryKey, setBoundaryKey] = useState(0);
      const [open, setOpen] = useState(false);
      const [opener, setOpener] = useState<HTMLElement | null>(null);
      function Fragile() {
        if (failed) {
          throw new Error(secret);
        }
        return <p>Product surface restored</p>;
      }
      return (
        <>
          <ErrorBoundary
            key={boundaryKey}
            onOpenReset={(trigger) => {
              setOpener(trigger);
              setOpen(true);
            }}
          >
            <Fragile />
          </ErrorBoundary>
          <ResetDialog
            open={open}
            opener={opener}
            onCancel={() => setOpen(false)}
            onConfirm={() => {
              expect(handle.actions.resetRoom().ok).toBe(true);
              setFailed(false);
              setBoundaryKey((key) => key + 1);
              setOpen(false);
            }}
          />
        </>
      );
    }

    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open reset confirmation" }));
    expect(screen.getByRole("dialog", { name: "Reset this fictional demonstration?" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Reset to canonical fixture" }));

    expect(screen.getByText("Product surface restored")).toBeVisible();
    expect(handle.room().revision).toBe(0);
    expect(handle.room().activityLedger).toHaveLength(1);
    expect(screen.queryByText(secret, { exact: false })).not.toBeInTheDocument();
    consoleError.mockRestore();
  });
});
