/**
 * Room store factory.
 *
 * The store owns exactly three jobs: hold the current room, apply one atomic
 * transaction at a time, and persist the result. All rules live in the domain.
 *
 * The spec suggested Zustand persist middleware. This build uses an explicit
 * `RoomStorage` port instead, because hydration has to validate untrusted data
 * with a strict schema and surface a recovery notice, and the middleware would
 * hide both steps behind a rehydration callback.
 */
import { createStore, type StoreApi } from "zustand/vanilla";
import { createRoomActions, type RoomActions, type RoomTransactor } from "../domain/actions/index.ts";
import { failure, success, type ActionResult, type DomainError } from "../domain/errors.ts";
import type { RoomState } from "../domain/types.ts";
import { hydrateRoom, type HydrationResult } from "./migrations.ts";
import {
  createLocalRoomStorage,
  type RoomStorage,
  type StorageWriteResult,
} from "./persistence.ts";

export type StorageStatus = "ok" | "unavailable";

export type RoomStoreValue = {
  room: RoomState;
  storageStatus: StorageStatus;
  storageDetail: string | null;
  /** Last failed action, kept outside the room so a failure mutates nothing. */
  lastError: DomainError | null;
  lastActionAt: string | null;
};

export type CreateRoomStoreOptions = {
  storage?: RoomStorage;
  now?: () => string;
  /** Set false to keep a test store entirely in memory. */
  persist?: boolean;
};

export type RoomStoreHandle = {
  store: StoreApi<RoomStoreValue>;
  /** Action interface bound to the visible page. */
  actions: RoomActions;
  /** Action interface bound to WebMCP tool callbacks. */
  agentActions: RoomActions;
  storage: RoomStorage;
  hydration: HydrationResult;
  retryPersist(): ActionResult<{ persisted: true }>;
  clearError(): void;
};

export function createRoomStore(options: CreateRoomStoreOptions = {}): RoomStoreHandle {
  const now = options.now ?? (() => new Date().toISOString());
  const storage = options.storage ?? createLocalRoomStorage();
  const shouldPersist = options.persist ?? true;

  const hydration = hydrateRoom(storage.load(), now());

  const store = createStore<RoomStoreValue>()(() => ({
    room: hydration.notice ? { ...hydration.room, recoveryNotice: hydration.notice } : hydration.room,
    storageStatus: hydration.notice?.code === "storage_unavailable" ? "unavailable" : "ok",
    storageDetail: hydration.notice?.detail ?? null,
    lastError: null,
    lastActionAt: null,
  }));

  function applyWrite(write: StorageWriteResult): void {
    if (write.status === "saved") {
      if (store.getState().storageStatus !== "ok") {
        store.setState({ storageStatus: "ok", storageDetail: null });
      }
      return;
    }
    store.setState({ storageStatus: "unavailable", storageDetail: write.detail });
  }

  function persist(room: RoomState): void {
    if (!shouldPersist) {
      return;
    }
    applyWrite(storage.save(room));
  }

  const transactor: RoomTransactor = {
    read: () => store.getState().room,
    now,
    transact(runner) {
      const current = store.getState().room;
      const result = runner(current);

      if (!result.ok) {
        // The room is untouched. Only the presentation level error slot changes.
        store.setState({ lastError: result.error });
        return result;
      }

      store.setState({ room: result.value.state, lastError: null, lastActionAt: now() });
      persist(result.value.state);
      return success(result.value.value);
    },
  };

  return {
    store,
    actions: createRoomActions(transactor, "ui"),
    agentActions: createRoomActions(transactor, "webmcp"),
    storage,
    hydration,
    retryPersist() {
      const write = storage.save(store.getState().room);
      applyWrite(write);
      if (write.status !== "saved") {
        return failure("PERSISTENCE_UNAVAILABLE", "The room could not be saved in this browser.", {
          issues: [{ path: "storage", message: write.detail }],
        });
      }
      return success({ persisted: true as const });
    },
    clearError() {
      store.setState({ lastError: null });
    },
  };
}
