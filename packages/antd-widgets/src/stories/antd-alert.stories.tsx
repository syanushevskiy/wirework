import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { antdAlert } from "../widgets/antd-alert";
import { WidgetStory } from "./harness";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-alert" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Title, description, tone and icon as settings; the optional `title` port as a data control. */
export const Playground: Story = playground(antdAlert);

export const Alert: Story = {
  render: () => (
    <WidgetStory
      key="alert"
      definition={antdAlert}
      viewModel={{ title: "Deployment failed", description: "2 checks did not pass.", tone: "danger" }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("Deployment failed");
  },
};
