import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdSelect } from "../widgets/antd-select";
import { WidgetStory } from "./harness";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-select" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every setting and both ports (the chosen value, the options) as controls. */
export const Playground: Story = playground(antdSelect);

export const Select: Story = {
  render: () => (
    <WidgetStory
      key="select"
      definition={antdSelect}
      seed={{ demo: { environment: "" } }}
      viewModel={{
        inputs: { value: "demo.environment" },
        on: { changed: [{ set: "demo.environment", from: "value" }] },
        label: "Environment",
        options: [
          { value: "staging", label: "Staging" },
          { value: "production", label: "Production" },
        ],
      }}
    />
  ),
};

/** Options from the store instead of the setting — how a host loads them. */
export const SelectWithStoreOptions: Story = {
  render: () => (
    <WidgetStory
      key="select-options"
      definition={antdSelect}
      seed={{ demo: { app: "", apps: [{ value: "billing" }, { value: "search", label: "Search API" }] } }}
      viewModel={{
        inputs: { value: "demo.app", options: "demo.apps" },
        on: { changed: [{ set: "demo.app", from: "value" }] },
        label: "Application",
      }}
    />
  ),
};
