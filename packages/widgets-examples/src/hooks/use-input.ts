/** ALL dummy-input logic lives here (guidelines: render-only components). */
import { useCallback, useMemo } from "react";
import type { Emit, ReadableStore } from "@wirework/schema";
import { useStorePath } from "@wirework/react";
import { validate, type ValidationRule } from "../validation";
import type { InputEvents } from "../widgets/dummy-input";

export interface InputRules {
  validation: ValidationRule;
  pattern?: string;
  patternMessage?: string;
}

export function useInput(
  store: ReadableStore,
  emit: Emit<InputEvents>,
  path: string,
  fallback: string,
  { validation, pattern, patternMessage }: InputRules,
) {
  const raw = useStorePath<unknown>(store, path);
  // Nothing at the path -> the port's declared default; unexpected shapes
  // are shown as text, never a crash.
  const value = typeof raw === "string" ? raw : raw === undefined ? fallback : String(raw);

  const result = useMemo(
    () => validate(value, validation, pattern, patternMessage),
    [value, validation, pattern, patternMessage],
  );

  // The widget only EMITS; the view model's reaction stores the text. The
  // payload carries validity so a second reaction can store the message.
  const change = useCallback(
    (next: string) => {
      const { valid, message } = validate(next, validation, pattern, patternMessage);
      emit("changed", { value: next, valid, ...(message === undefined ? {} : { message }) });
    },
    [emit, validation, pattern, patternMessage],
  );

  return { value, valid: result.valid, message: result.message, change };
}
