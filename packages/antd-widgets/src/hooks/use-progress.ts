/** ALL antd-progress logic lives here (guidelines: render-only components). */
import type { ProgressProps } from "antd";
import type { PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { ProgressTone } from "@wirework/widget-contracts";

/** antd statuses for the contract's semantic tones. */
const PROGRESS_STATUS = {
  default: "normal",
  success: "success",
  danger: "exception",
} as const satisfies Record<ProgressTone, ProgressProps["status"]>;

export function useProgress(
  store: ReadableStore,
  path: string,
  port: PortDefinition<number>,
  tone: ProgressTone,
) {
  // The store may overshoot (a counter stepping past 100); the bar must not.
  const percent = Math.min(100, Math.max(0, usePort(store, path, port) ?? 0));
  return { percent, status: PROGRESS_STATUS[tone] };
}
