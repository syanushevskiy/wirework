/** ALL antd-tag logic lives here (guidelines: render-only components). */
import type { TagProps } from "antd";
import type { ReadableStore } from "@wirework/schema";
import type { TagTone } from "@wirework/widget-contracts";
import { useBoundText } from "./use-bound-text";

/** antd's preset status colours for the contract's semantic tones. */
const TAG_COLOR = {
  default: undefined,
  info: "processing",
  success: "success",
  warning: "warning",
  danger: "error",
} as const satisfies Record<TagTone, TagProps["color"]>;

export function useTag(store: ReadableStore, path: string | undefined, fallback: string, tone: TagTone) {
  return { text: useBoundText(store, path, fallback), color: TAG_COLOR[tone] };
}
