/** ALL antd-echo logic lives here (guidelines: render-only components). */
import type { ReadableStore } from "@wirework/schema";
import { useStorePath } from "@wirework/react";

export function useEchoValue(store: ReadableStore, path: string): string {
  const value = useStorePath(store, path);
  return value === undefined ? "∅" : JSON.stringify(value);
}
