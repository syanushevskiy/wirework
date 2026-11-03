/** ALL antd-button logic lives here (guidelines: render-only components): the click, and the contract's variant as antd's props. */
import { useCallback } from "react";
import type { Emit } from "@wirework/schema";
import type { ButtonVariant } from "@wirework/widget-contracts";
import type { ButtonEvents } from "../widgets/antd-button";

/** antd says it in two props: a `type` (primary, default, dashed) and `danger` on top of primary. */
const ANTD_BUTTON: Record<ButtonVariant, { type: "primary" | "default" | "dashed"; danger: boolean }> = {
  primary: { type: "primary", danger: false },
  secondary: { type: "default", danger: false },
  dashed: { type: "dashed", danger: false },
  danger: { type: "primary", danger: true },
};

export function useButton(emit: Emit<ButtonEvents>, label: string, variant: ButtonVariant) {
  const click = useCallback(() => emit("clicked", { label }), [emit, label]);
  return { click, ...ANTD_BUTTON[variant] };
}
