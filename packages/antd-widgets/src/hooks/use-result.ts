/** ALL antd-result logic lives here (guidelines: render-only components): the texts, antd's status, the role, the action. */
import { useCallback } from "react";
import type { ResultProps } from "antd";
import type { Emit, ReadableStore } from "@wirework/schema";
import type { ResultStatus } from "@wirework/widget-contracts";
import type { ResultEvents } from "../widgets/antd-result";
import { useBoundText } from "./use-bound-text";

/** antd's pictures for the contract's outcomes: the three HTTP ones by their meaning. */
const ANTD_STATUS = {
  success: "success",
  error: "error",
  info: "info",
  warning: "warning",
  "not-found": "404",
  forbidden: "403",
  failed: "500",
} as const satisfies Record<ResultStatus, ResultProps["status"]>;

/** A failing outcome is announced; the others are a status line. */
const ALERTING: ReadonlySet<ResultStatus> = new Set(["error", "forbidden", "failed"]);

export function useResult(
  store: ReadableStore,
  emit: Emit<ResultEvents>,
  paths: { title?: string | undefined; detail?: string | undefined },
  texts: { status: ResultStatus; title: string; detail?: string | undefined; action?: string | undefined },
) {
  const title = useBoundText(store, paths.title, texts.title);
  const detail = useBoundText(store, paths.detail, texts.detail ?? "");
  const action = texts.action;
  const click = useCallback(() => emit("clicked", { label: action ?? "" }), [emit, action]);
  return {
    title,
    detail: detail === "" ? undefined : detail,
    status: ANTD_STATUS[texts.status],
    role: ALERTING.has(texts.status) ? ("alert" as const) : ("status" as const),
    click,
  };
}
