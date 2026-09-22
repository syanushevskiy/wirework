/** ALL antd-tag logic lives here (guidelines: render-only components). */
import type { ReadableStore } from "@wirework/schema";
import type { TagTone } from "@wirework/widget-contracts";
import { TAG_COLOR } from "../tones";
import { useBoundText } from "./use-bound-text";

export function useTag(store: ReadableStore, path: string | undefined, fallback: string, tone: TagTone) {
  return { text: useBoundText(store, path, fallback), color: TAG_COLOR[tone] };
}
