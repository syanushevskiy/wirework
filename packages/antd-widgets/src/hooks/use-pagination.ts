/** ALL antd-pagination logic lives here (guidelines: render-only components). */
import { useCallback } from "react";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { PaginationEvents } from "../widgets/antd-pagination";

export function usePagination(
  store: ReadableStore,
  emit: Emit<PaginationEvents>,
  paths: { page: string; total: string; pageSize?: string },
  ports: { page: PortDefinition<number>; total: PortDefinition<number>; pageSize: PortDefinition<number> },
  settingPageSize: number,
) {
  // Validated by the contract's ports; a malformed value shows the default.
  const page = usePort(store, paths.page, ports.page) ?? 1;
  const total = usePort(store, paths.total, ports.total) ?? 0;
  const pageSize = usePort(store, paths.pageSize, ports.pageSize) ?? settingPageSize;

  // The widget only EMITS; the view model's reaction writes the store.
  const change = useCallback(
    (nextPage: number, nextPageSize: number) => emit("changed", { page: nextPage, pageSize: nextPageSize }),
    [emit],
  );

  return { page, total, pageSize, change };
}
