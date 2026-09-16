/**
 * Input contract: a CONTROLLED text field. The text lives at the `value`
 * port; every change EMITS `changed` with the text and its validity, and
 * the required reaction writes the text back. Validation configuration is
 * part of the contract (builders must render it uniformly): a premade rule
 * from a closed set and/or a custom regular expression. Implementations
 * render a textbox with `aria-invalid` reflecting validity and, when
 * invalid, an element with role "alert" holding the message.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

export const VALIDATION_RULES = ["none", "required", "email", "integer", "url"] as const;
export type ValidationRule = (typeof VALIDATION_RULES)[number];

export const INPUT_TYPES = ["text", "email", "number", "password"] as const;

export const inputContract = defineContract({
  kind: "input",
  description: "A validated text field; emits every change with the text and its validity",
  io: {
    inputs: {
      value: { description: "Store path holding the current text", value: z.string(), default: "" },
    },
  },
  events: {
    changed: {
      description: "Fired on every keystroke with the text and whether it is valid",
      payload: z.object({
        value: z.string(),
        valid: z.boolean(),
        message: z.string().optional(),
      }),
      required: true,
      primary: "value",
    },
  },
  settings: z.object({
    label: z.string().default("Text").describe("Field label"),
    placeholder: z.string().optional().describe("Placeholder text"),
    type: z.enum(INPUT_TYPES).default("text").describe("HTML input type"),
    validation: z.enum(VALIDATION_RULES).default("none").describe("Premade validation rule"),
    pattern: z.string().optional().describe("Custom rule: a regular expression the text must match"),
    patternMessage: z.string().optional().describe("Message shown when the custom rule fails"),
  }),
  preview: {
    seed: { preview: { text: "Sample" } },
    viewModel: {
      inputs: { value: "preview.text" },
      on: { changed: [{ set: "preview.text", from: "value" }] },
      label: "Name",
      placeholder: "type here",
    },
  },
});
