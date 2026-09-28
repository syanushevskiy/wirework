import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import {
  usePageToolbar,
  type EditLock,
  type EngineLock,
  type OverlayLock,
  type PageToolbarInput,
} from "@wirework/builder";
import { PageToolbar } from "../page-toolbar";

type Args = {
  engine: string | undefined;
  engineLock: EngineLock | undefined;
  editing: boolean;
  pendingChanges: number;
  editLock: EditLock | undefined;
  overlay: boolean;
  overlayLock: OverlayLock | undefined;
  target: "base" | "user";
  onSelectEngine: (engine: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onToggleOverlay: (on: boolean) => void;
};

/** The toolbar as the hook decides it: the args are the facts a host composes from its session and builder. */
function Toolbar(args: Args) {
  const input: PageToolbarInput = { engines: ["react-grid-layout", "gridstack", "flex-rows"], ...args };
  return <PageToolbar toolbar={usePageToolbar(input)} />;
}

/** What the toolbar above a page offers, and why a control is locked — every lock said in words. */
const meta = {
  title: "Builder/PageToolbar",
  args: {
    engine: "react-grid-layout",
    engineLock: "configured",
    editing: false,
    pendingChanges: 0,
    editLock: undefined,
    overlay: true,
    overlayLock: undefined,
    target: "user",
    onSelectEngine: fn(),
    onEdit: fn(),
    onSave: fn(),
    onCancel: fn(),
    onToggleOverlay: fn(),
  },
  argTypes: {
    engineLock: { control: "select", options: [undefined, "widgets-placed", "no-template", "configured"] },
    editLock: { control: "select", options: [undefined, "permission", "loading"] },
    overlayLock: { control: "select", options: [undefined, "no-widgets"] },
    target: { control: "select", options: ["base", "user"] },
  },
  render: (args) => <Toolbar {...args} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A demo page: its engine is configuration, the page may be edited, edits go to the user's overlay. */
export const Viewing: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByTestId("engine")).toHaveTextContent("react-grid-layout");
    await expect(canvas.getByTestId("page-mode")).toHaveTextContent("view");
    await expect(canvas.getByTestId("edit-target")).toHaveTextContent("edits → user overlay");
    await userEvent.click(canvas.getByRole("button", { name: "Edit page" }));
    await expect(args.onEdit).toHaveBeenCalled();
  },
};

/** An open session: Save and Cancel, and how many changes it holds. */
export const Editing: Story = {
  args: { editing: true, pendingChanges: 2 },
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByTestId("page-mode")).toHaveTextContent("editing");
    await expect(canvas.getByTestId("pending-changes")).toHaveTextContent("2 changes");
    await userEvent.click(canvas.getByRole("button", { name: "Save page" }));
    await expect(args.onSave).toHaveBeenCalled();
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await expect(args.onCancel).toHaveBeenCalled();
  },
};

/** The builder before its first widget: the engine is a free choice, the overlay has nothing to personalise. */
export const EmptyBuilder: Story = {
  args: {
    engine: "react-grid-layout",
    engineLock: undefined,
    overlay: false,
    overlayLock: "no-widgets",
    target: "base",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox")).toBeVisible();
    await expect(canvas.getByRole("checkbox", { name: "user overlay" })).toBeDisabled();
    await expect(canvas.getByTitle("Add a widget first — there is nothing to personalise yet")).toBeVisible();
  },
};

/** No permission to edit: the button is there, disabled, and says why. */
export const EditLocked: Story = {
  args: { editLock: "permission" },
  play: async ({ canvas }) => {
    const edit = canvas.getByRole("button", { name: "Edit page" });
    await expect(edit).toBeDisabled();
    await expect(edit).toHaveAttribute("title", "Your permissions do not include editing pages");
  },
};
