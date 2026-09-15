/** ALL dummy-button logic lives here (guidelines: render-only components). */
import { useCallback } from "react";
import type { Emit } from "@wirework/schema";
import type { ButtonEvents } from "../widgets/dummy-button";

export function useButton(emit: Emit<ButtonEvents>, label: string) {
  const click = useCallback(() => emit("clicked", { label }), [emit, label]);
  return { click };
}
