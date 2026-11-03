import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { BUTTON_VARIANTS } from "@wirework/widget-contracts";
import { antdButton } from "../widgets/antd-button";
import { buttonConformance } from "./conformance";
import { storyArgs, storyArgTypes, WidgetStory } from "./harness";
import { playground } from "./playground";

type Args = { label: string; variant: (typeof BUTTON_VARIANTS)[number] };

const meta = {
  title: "Widgets/antd-button",
  argTypes: storyArgTypes(antdButton),
  args: storyArgs(antdButton) as Args,
  render: (args) => <WidgetStory definition={antdButton} viewModel={{ ...args }} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A button has no ports: its caption is the control, its clicks land in the Actions panel. */
export const Playground: Story = playground(antdButton);

// The `button` contract's conformance set.
const conformance = buttonConformance(antdButton);
export const Default: Story = conformance.Default;
export const SetsAFlag: Story = conformance.SetsAFlag;

/** The four variants side by side: primary, secondary, dashed and danger — antd's `type`, plus `danger` on the last. */
export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      {BUTTON_VARIANTS.map((variant) => (
        <WidgetStory key={variant} definition={antdButton} viewModel={{ label: variant, variant }} showStore={false} />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    for (const variant of BUTTON_VARIANTS) {
      await expect(canvas.getByRole("button", { name: variant })).toHaveAttribute("data-variant", variant);
    }
    await expect(canvas.getByRole("button", { name: "danger" })).toHaveClass(/ant-btn-dangerous/);
    await expect(canvas.getByRole("button", { name: "dashed" })).toHaveClass(/ant-btn-dashed/);
  },
};
