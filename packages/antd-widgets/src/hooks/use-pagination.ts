/** ALL antd-pagination logic lives here (guidelines: render-only components). */
import { useCallback } from "react";
import type { Emit, ReadableStore } from "@wirework/schema";
import { useStorePath } from "@wirework/react";
import type { PaginationEvents } from "../widgets/antd-pagination";

/** A live store value is not validated; stay resilient and fall back. */
function count(raw: unknown, fallback: number): number {
  return typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
}

export function usePagination(
  store: ReadableStore,
  emit: Emit<PaginationEvents>,
  paths: { page: string; total: string; pageSize?: string },
  defaults: { page: number; total: number; pageSize: number },
) {
  const page = count(useStorePath<unknown>(store, paths.page), defaults.page);
  const total = count(useStorePath<unknown>(store, paths.total), defaults.total);
  // The page-size port is optional: without it the setting decides.
  const pageSize = count(useStorePath<unknown>(store, paths.pageSize), defaults.pageSize);

  // The widget only EMITS; the view model's reaction writes the store.
  const change = useCallback(
    (nextPage: number, nextPageSize: number) => emit("changed", { page: nextPage, pageSize: nextPageSize }),
    [emit],
  );

  return { page, total, pageSize, change };
}
