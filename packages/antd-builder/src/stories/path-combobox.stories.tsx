import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, within } from "storybook/test";
import { PathCombobox } from "../path-combobox";

type Args = { value: string; suggested: string | undefined; disabled: boolean; onSelect: (path: string) => void };

/** The field is controlled: what it reports is what it shows next, as in the form that owns it. */
function Field(args: Args) {
  const [value, setValue] = useState(args.value);
  return (
    <PathCombobox
      id="port-input-value"
      testId="port-input-value"
      value={value}
      suggested={args.suggested}
      disabled={args.disabled}
      suggestions={() => ["demo.count", "demo.total"]}
      onSelect={(path) => {
        setValue(path);
        args.onSelect(path);
      }}
    />
  );
}

/** The port field: a store path, with the compatible existing paths offered when it opens. */
const meta = {
  title: "Builder/PathCombobox",
  args: { value: "", suggested: undefined, disabled: false, onSelect: fn() },
  render: (args) => <Field {...args} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opened, the field lists the paths the store already holds; picking one reports it. */
export const OffersExistingPaths: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("combobox"));
    // The options open in a popup outside the story's canvas.
    await userEvent.click(await within(document.body).findByText("demo.total"));
    await expect(args.onSelect).toHaveBeenLastCalledWith("demo.total");
    await expect(canvas.getByRole("combobox")).toHaveValue("demo.total");
  },
};

/** A path that does not exist yet may be typed: state a widget will write later. */
export const AcceptsANewPath: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByRole("combobox"), "demo.later");
    await expect(args.onSelect).toHaveBeenLastCalledWith("demo.later");
  },
};

export const Disabled: Story = {
  args: { value: "demo.count", disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox")).toBeDisabled();
  },
};
