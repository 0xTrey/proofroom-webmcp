/**
 * The application room store.
 *
 * One store instance per document. React reads it through `useRoomStore` and
 * writes only through `roomActions`. WebMCP tool callbacks use `agentActions`,
 * which is the same implementation with a `webmcp` origin on every event.
 */
import { useStore } from "zustand";
import { createRoomStore, type RoomStoreHandle, type RoomStoreValue } from "./createRoomStore.ts";

export const roomStoreHandle: RoomStoreHandle = createRoomStore();

export const roomStore = roomStoreHandle.store;
export const roomActions = roomStoreHandle.actions;
export const agentActions = roomStoreHandle.agentActions;

export function useRoomStore<Selected>(selector: (value: RoomStoreValue) => Selected): Selected {
  return useStore(roomStore, selector);
}

export function useRoomActions() {
  return roomActions;
}
