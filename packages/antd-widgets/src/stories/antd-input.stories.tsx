import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdInput } from "../widgets/antd-input";
import { inputConformance } from "./conformance";
import { storyArgs, storyArgTypes, WidgetStory } from "./harness";
import { playground } from "./playground";

type Args = {
  label: string;
  placeholder?: string;
  type: string;
  validation: string;
  pattern?: string;
  patternMessage?: string;
};

const meta = {
  title: "Widgets/antd-input",
  argTypes: storyArgTypes(antdInput),
  args: { ...storyArgs(antdInput), label: "Your name", placeholder: "type here" } as Args,
  render: (args) => (
    // Its own reaction stores every keystroke, exactly as on a page.
    <WidgetStory
      definition={antdInput}
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

/** Type into the field and the `value` control follows; every validation setting has a control. */
export const Playground: Story = playground(antdInput);

// The `input` contract's conformance set.
const conformance = inputConformance(antdInput);
export const Plain: Story = conformance.Plain;
export const Required: Story = conformance.Required;
export const Email: Story = conformance.Email;
export const CustomPattern: Story = conformance.CustomPattern;
export const Validates: Story = conformance.Validates;
