/**
 * Room storage.
 *
 * Storage is a small port with three operations so a server backed room can be
 * added later without touching domain behavior. Nothing here trusts what it
 * reads; validation happens in `migrations.ts` before hydration.
 */
import type { RoomState } from "../domain/types.ts";

export const ROOM_STORAGE_KEY = "proofroom.room.v1";

export type StorageReadResult =
  | { status: "empty" }
  | { status: "found"; raw: unknown }
  | { status: "unreadable"; detail: string }
  | { status: "unavailable"; detail: string };

export type StorageWriteResult =
  | { status: "saved" }
  | { status: "unavailable"; detail: string };

export type RoomStorage = {
  readonly kind: "local" | "memory";
  load(): StorageReadResult;
  save(room: RoomState): StorageWriteResult;
  clear(): StorageWriteResult;
};

type WebStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function resolveWebStorage(): WebStorageLike | null {
  try {
    if (typeof globalThis.localStorage === "undefined") {
      return null;
    }
    // Touch the API so a blocked or full storage fails here rather than later.
    const probe = `${ROOM_STORAGE_KEY}.probe`;
    globalThis.localStorage.setItem(probe, "1");
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function createLocalRoomStorage(
  storageFactory: () => WebStorageLike | null = resolveWebStorage,
): RoomStorage {
  return {
    kind: "local",
    load() {
      const storage = storageFactory();
      if (!storage) {
        return { status: "unavailable", detail: "Local storage is not available in this context." };
      }
      try {
        const serialized = storage.getItem(ROOM_STORAGE_KEY);
        if (serialized === null) {
          return { status: "empty" };
        }
        return { status: "found", raw: JSON.parse(serialized) as unknown };
      } catch (error) {
        return { status: "unreadable", detail: describe(error) };
      }
    },
    save(room) {
      const storage = storageFactory();
      if (!storage) {
        return { status: "unavailable", detail: "Local storage is not available in this context." };
      }
      try {
        storage.setItem(
          ROOM_STORAGE_KEY,
          JSON.stringify({ schemaVersion: room.schemaVersion, savedAt: new Date().toISOString(), room }),
        );
        return { status: "saved" };
      } catch (error) {
        return { status: "unavailable", detail: describe(error) };
      }
    },
    clear() {
      const storage = storageFactory();
      if (!storage) {
        return { status: "unavailable", detail: "Local storage is not available in this context." };
      }
      try {
        storage.removeItem(ROOM_STORAGE_KEY);
        return { status: "saved" };
      } catch (error) {
        return { status: "unavailable", detail: describe(error) };
      }
    },
  };
}

export type MemoryRoomStorageOptions = {
  /** Seed value, used to exercise migration and recovery paths in tests. */
  seed?: unknown;
  /** Simulates a blocked or full storage. */
  failWrites?: boolean;
  failReads?: boolean;
};

export function createMemoryRoomStorage(options: MemoryRoomStorageOptions = {}): RoomStorage {
  let value: unknown = options.seed;

  return {
    kind: "memory",
    load() {
      if (options.failReads) {
        return { status: "unavailable", detail: "Memory storage read was blocked for this test." };
      }
      if (value === undefined) {
        return { status: "empty" };
      }
      return { status: "found", raw: value };
    },
    save(room) {
      if (options.failWrites) {
        return { status: "unavailable", detail: "Memory storage write was blocked for this test." };
      }
      value = {
        schemaVersion: room.schemaVersion,
        savedAt: new Date().toISOString(),
        room: JSON.parse(JSON.stringify(room)) as RoomState,
      };
      return { status: "saved" };
    },
    clear() {
      if (options.failWrites) {
        return { status: "unavailable", detail: "Memory storage write was blocked for this test." };
      }
      value = undefined;
      return { status: "saved" };
    },
  };
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    // Message only. A stack trace must never reach the UI or a tool response.
    return error.message.slice(0, 200);
  }
  return "Unknown storage failure.";
}
