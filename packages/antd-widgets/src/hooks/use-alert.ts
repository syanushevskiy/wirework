/** ALL antd-alert logic lives here (guidelines: render-only components). */
import type { AlertProps } from "antd";
import type { ReadableStore } from "@wirework/schema";
import type { AlertTone } from "@wirework/widget-contracts";
import { useBoundText } from "./use-bound-text";

/** antd alert types for the contract's severities. */
const ALERT_TYPE = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "error",
} as const satisfies Record<AlertTone, AlertProps["type"]>;

export function useAlert(store: ReadableStore, path: string | undefined, fallback: string, tone: AlertTone) {
  return { title: useBoundText(store, path, fallback), type: ALERT_TYPE[tone] };
}
