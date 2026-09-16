/** ALL antd-label logic lives here (guidelines: render-only components). */
import type { ReadableStore } from "@wirework/schema";
import { useStorePath } from "@wirework/react";
import type { LabelTone } from "@wirework/widget-contracts";

/** antd Typography types for the contract's semantic tones; `accent` is styled by CSS. */
const TYPOGRAPHY_TYPE = {
  default: undefined,
  muted: "secondary",
  accent: undefined,
  success: "success",
  danger: "danger",
} as const satisfies Record<LabelTone, "secondary" | "success" | "danger" | undefined>;

/** Bound store value when the optional port is wired and holds one, else the static text. */
export function useLabel(
  store: ReadableStore,
  path: string | undefined,
  fallback: string,
  tone: LabelTone,
) {
  const bound = useStorePath<unknown>(store, path);
  return {
    text: bound === undefined ? fallback : String(bound),
    type: TYPOGRAPHY_TYPE[tone],
  };
}
