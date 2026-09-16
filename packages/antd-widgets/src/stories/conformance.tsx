/**
 * Conformance stories — what "implements the contract" means, as stories
 * with interaction tests. Any implementation of a standard contract runs
 * the same set; a story file adds implementation-specific extras on top.
 * Queries use the accessible semantics the contracts require (role, name,
 * aria-invalid, alert), never implementation test ids.
 */
import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import type { AnyWidgetDefinition } from "@wirework/schema";
import { WidgetStory } from "./harness";

// Story objects are combined into files whose Meta types differ per widget;
// `any` here keeps the conformance set assignable to every such file, and
// `arg` reads the file's args (typed there, opaque here).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Story = StoryObj<any>;
const arg = (args: unknown, key: string): string => String((args as Record<string, unknown>)[key]);

/** `label` contract: static text, text from a store path, fallback on an empty path. */
export function labelConformance(definition: AnyWidgetDefinition): Record<"Static" | "FromStore" | "BoundToEmptyPath", Story> {
  return {
    Static: {
      play: async ({ canvas, args }) => {
        await expect(canvas.getByText(arg(args, "text"))).toBeVisible();
      },
    },
    FromStore: {
      render: (args: Record<string, unknown>) => (
        <WidgetStory
          key="from-store"
          definition={definition}
          seed={{ demo: { greeting: "Text from the store" } }}
          viewModel={{ ...args, inputs: { text: "demo.greeting" } }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("Text from the store")).toBeVisible();
      },
    },
    BoundToEmptyPath: {
      render: (args: Record<string, unknown>) => (
        <WidgetStory key="empty" definition={definition} viewModel={{ ...args, inputs: { text: "demo.missing" } }} />
      ),
      play: async ({ canvas, args }) => {
        await expect(canvas.getByText(arg(args, "text"))).toBeVisible();
      },
    },
  };
}

/** `button` contract: a role=button with the caption; a click emits and reactions run. */
export function buttonConformance(definition: AnyWidgetDefinition): Record<"Default" | "SetsAFlag", Story> {
  return {
    Default: {
      play: async ({ canvas, args }) => {
        await expect(canvas.getByRole("button", { name: arg(args, "label") })).toBeVisible();
      },
    },
    SetsAFlag: {
      render: (args: Record<string, unknown>) => (
        <WidgetStory
          key="flag"
          definition={definition}
          viewModel={{ ...args, on: { clicked: [{ set: "ui.clicked", value: true }] } }}
        />
      ),
      play: async ({ canvas, userEvent, args }) => {
        await userEvent.click(canvas.getByRole("button", { name: arg(args, "label") }));
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"clicked": true');
      },
    },
  };
}

/** `input` contract: a textbox, aria-invalid + alert on failure, premade and custom rules, text stored by reaction. */
export function inputConformance(
  definition: AnyWidgetDefinition,
): Record<"Plain" | "Required" | "Email" | "CustomPattern" | "Validates", Story> {
  return {
    Plain: {
      play: async ({ canvas, userEvent }) => {
        const field = canvas.getByRole("textbox");
        await userEvent.type(field, "hello");
        await expect(field).toHaveAttribute("aria-invalid", "false");
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"text": "hello"');
      },
    },
    Required: {
      args: { validation: "required" },
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
        await expect(canvas.getByRole("alert")).toHaveTextContent("required");
      },
    },
    Email: { args: { validation: "email", type: "email", label: "E-mail" } },
    CustomPattern: {
      args: { label: "Ticket", pattern: "^[A-Z]{3}-[0-9]+$", patternMessage: "use the form ABC-123" },
      play: async ({ canvas, userEvent }) => {
        const field = canvas.getByRole("textbox");
        await userEvent.type(field, "abc");
        await expect(canvas.getByRole("alert")).toHaveTextContent("use the form ABC-123");
        await userEvent.clear(field);
        await userEvent.type(field, "ABC-42");
        await expect(field).toHaveAttribute("aria-invalid", "false");
      },
    },
    Validates: {
      args: { validation: "email" },
      play: async ({ canvas, userEvent }) => {
        const field = canvas.getByRole("textbox");
        await userEvent.type(field, "nope");
        await expect(field).toHaveAttribute("aria-invalid", "true");
        await expect(canvas.getByRole("alert")).toHaveTextContent("must be an email address");
        await userEvent.clear(field);
        await userEvent.type(field, "team@example.com");
        await expect(field).toHaveAttribute("aria-invalid", "false");
      },
    },
  };
}
