import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { antdCheckbox } from "../widgets/antd-checkbox";
import { WidgetStory } from "./harness";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-checkbox" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tick the widget and the `checked` control follows; flip the control and the widget follows. */
export const Playground: Story = playground(antdCheckbox);

export const Checkbox: Story = {
  render: () => (
    <WidgetStory
      key="checkbox"
      definition={antdCheckbox}
      seed={{ demo: { agreed: false } }}
      viewModel={{
        inputs: { checked: "demo.agreed" },
        on: { changed: [{ set: "demo.agreed", from: "checked" }] },
        label: "I agree",
      }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByRole("checkbox", { name: "I agree" });
    await userEvent.click(box);
    await expect(box).toBeChecked();
    await expect(canvas.getByTestId("story-store")).toHaveTextContent('"agreed": true');
  },
};
