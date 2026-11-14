/**
 * ALL code-editor logic (guidelines: render-only components): the code read
 * from its port, its line numbers, and the change emitted — the default
 * reaction writes it back.
 */
import { useCallback, useMemo, type ChangeEvent } from "react";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { codeEditorContract } from "../contracts/code-editor";

export interface CodeEditorView {
  code: string;
  /** "1\n2\n3": one number per line of the code. */
  lineNumbers: string;
  lines: number;
  change: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}

export function useCodeEditor(
  store: ReadableStore,
  emit: Emit<(typeof codeEditorContract)["events"]>,
  path: string | undefined,
  port: PortDefinition<string>,
): CodeEditorView {
  const code = usePort(store, path, port) ?? "";
  const lines = code.split("\n").length;
  const lineNumbers = useMemo(() => Array.from({ length: lines }, (_, index) => index + 1).join("\n"), [lines]);
  const change = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => emit("changed", { value: event.target.value }),
    [emit],
  );
  return { code, lineNumbers, lines, change };
}
