import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { dummyInput } from "../widgets/dummy-input";
import { storyArgs, storyArgTypes, WidgetStory } from "./harness";

type Args = {
  label: string;
  placeholder?: string;
  type: string;
  validation: string;
  pattern?: string;
  patternMessage?: string;
};

const meta = {
  title: "Widgets/dummy-input",
  argTypes: storyArgTypes(dummyInput),
  args: { ...storyArgs(dummyInput), label: "Your name", placeholder: "type here" } as Args,
  render: (args) => (
    // Its own reaction stores every keystroke, exactly as on a page.
    <WidgetStory
      definition={dummyInput}
      viewModel={{
        ...Object.fromEntries(Object.entries(args).filter(([, value]) => value !== "" && value !== undefined)),
        inputs: { value: "form.text" },
        on: { changed: [{ set: "form.text", from: "value" }] },
      }}
    />
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {};

export const Required: Story = { args: { validation: "required" } };

export const Email: Story = { args: { validation: "email", type: "email", label: "E-mail" } };

export const CustomPattern: Story = {
  args: { label: "Ticket", pattern: "^[A-Z]{3}-[0-9]+$", patternMessage: "use the form ABC-123" },
};

/** Interaction test: an invalid then a valid email. */
export const Validates: Story = {
  args: { validation: "email" },
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByTestId("dummy-input");
    await userEvent.type(field, "nope");
    await expect(canvas.getByTestId("dummy-input-message")).toHaveTextContent("must be an email address");
    await userEvent.clear(field);
    await userEvent.type(field, "team@example.com");
    await expect(field).toHaveAttribute("data-valid", "true");
  },
};
