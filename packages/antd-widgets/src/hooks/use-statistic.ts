/** ALL antd-statistic logic lives here (guidelines: render-only components). */
import type { PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";

export function useStatistic(store: ReadableStore, path: string, port: PortDefinition<number | string>) {
  return { value: usePort(store, path, port) ?? 0 };
}
