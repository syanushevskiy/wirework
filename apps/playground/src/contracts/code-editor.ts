/**
 * An application-defined contract for a HEAVY widget: a code editor. The
 * text lives at the `value` port; every change EMITS `changed`, written
 * back by default. The contract is data and stays in the application's
 * bundle; its implementation is loaded by the pages that show it
 * (widgets/code-editor-widget.ts, doc/ADR/0018-lazy-widgets.md).
 *
 * Nothing here may import the editor's own code — not even for a value: one
 * import and the editor is in everybody's download again (scripts/check-bundle.mjs).
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

export const CODE_LANGUAGES = ["json", "javascript", "text"] as const;

export const codeEditorContract = defineContract({
  kind: "code-editor",
  description: "A code editor with line numbers; emits every change with the text",
  io: {
    inputs: {
      value: { description: "Store path holding the code", value: z.string(), default: "" },
    },
  },
  events: {
    changed: {
      description: "Fired on every change with the code",
      payload: z.object({ value: z.string() }),
      primary: "value",
      writesBack: "value",
    },
  },
  settings: z.object({
    label: z.string().default("Code").describe("What the editor is named"),
    language: z.enum(CODE_LANGUAGES).default("json").describe("The language the code is in"),
    rows: z.number().int().min(3).max(60).default(10).describe("Lines in view"),
  }),
  preview: {
    seed: { preview: { code: '{ "hello": "world" }' } },
    viewModel: { inputs: { value: "preview.code" }, label: "Code", rows: 3 },
  },
});
