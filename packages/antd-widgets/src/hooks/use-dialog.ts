/** ALL antd-dialog logic lives here (guidelines: render-only components). */
import { useCallback } from "react";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { DialogEvents } from "../widgets/antd-dialog";

export function useDialog(store: ReadableStore, emit: Emit<DialogEvents>, path: string, port: PortDefinition<boolean>) {
  const open = usePort(store, path, port) === true;
  // The widget only EMITS; the view model's reaction stores the closed state. Opening is a `set` on the path.
  const close = useCallback(() => emit("changed", { open: false }), [emit]);
  return { open, close };
}
