import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { usePageViews, type Commit, type EditableTrees, type EditLock, type EditTarget } from "@wirework/builder";
import { PageViews } from "../page-views";
import { layoutEngines, treesWithViews } from "../__tests__/fixtures";

type Args = {
  editLock: EditLock | undefined;
  target: EditTarget;
  withUserOverlay: boolean;
  shown: string;
  onCommit: (change: unknown) => void;
};

/** The component on a live hook: a commit lands in local state, so the list follows it as it would a store. */
function Views({ editLock, target, withUserOverlay, shown, onCommit }: Args) {
  const [trees, setTrees] = useState<EditableTrees>(treesWithViews);
  const [view, setView] = useState(shown);
  const commit: Commit = (change) => {
    onCommit(change);
    setTrees((current) => ({ ...current, ...change }));
    if ("userViewModels" in change) setView(change.userViewModels.pages?.["demo"]?.view ?? "default");
  };
  const views = usePageViews({
    commit,
    editLock,
    layoutEngines: layoutEngines(),
    page: "demo",
    trees,
    target,
    withUserOverlay,
    shown: view,
    cancelEditing: () => undefined,
  });
  return <PageViews views={views} />;
}

/** The views of a page — the team's prebuilt ones and the user's own — chosen from one list, saved, shared as JSON. */
const meta = {
  title: "Builder/PageViews",
  args: { editLock: undefined, target: "user", withUserOverlay: true, shown: "mine", onCommit: fn() },
  argTypes: {
    editLock: { control: "select", options: [undefined, "permission", "loading"] },
    target: { control: "select", options: ["user", "base"] },
  },
  render: (args) => <Views {...args} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The list groups prebuilt views and the user's own; choosing one commits the choice. */
export const Choosing: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByTestId("page-view-kind")).toHaveTextContent("mine");
    await userEvent.click(canvas.getByRole("combobox"));
    await userEvent.click(document.body.querySelector('.ant-select-item-option[title="compact"]') as HTMLElement);
    await expect(args.onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        userViewModels: expect.objectContaining({ pages: { demo: expect.objectContaining({ view: "compact" }) } }),
      }),
    );
    await expect(canvas.getByTestId("page-view-kind")).toHaveTextContent("prebuilt");
    await expect(canvas.getByRole("button", { name: "Rename…" })).toBeDisabled();
  },
};

/** Save as copies the shown view under a new name, which becomes the shown one. */
export const SavingAs: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save as…" }));
    const name = canvas.getByTestId("view-name");
    await userEvent.clear(name);
    await userEvent.type(name, "tight");
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(canvas.getByRole("combobox")).toBeVisible();
    await expect(canvas.getByTestId("page-view-select")).toHaveTextContent("tight");
  },
};

/** Share shows the view as JSON; Import takes it back under another name. A taken name is refused in words. */
export const SharingAndImporting: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Share…" }));
    const text = (canvas.getByTestId("view-json") as HTMLTextAreaElement).value;
    await expect(text).toContain('"kind": "wirework-page-view"');
    await userEvent.click(canvas.getByRole("button", { name: "Close" }));
    await userEvent.click(canvas.getByRole("button", { name: "Import…" }));
    await userEvent.click(canvas.getByTestId("view-json"));
    await userEvent.paste(text);
    await userEvent.click(canvas.getByRole("button", { name: "Import" }));
    await expect(canvas.getByTestId("view-problem")).toHaveTextContent('There is already a view named "mine"');
    await userEvent.type(canvas.getByTestId("view-name"), "pasted");
    await userEvent.click(canvas.getByRole("button", { name: "Import" }));
    await expect(canvas.getByTestId("page-view-select")).toHaveTextContent("pasted");
  },
};

/** Without the permission the list still works, but nothing that changes a page is offered — and the buttons say why. */
export const WithoutPermission: Story = {
  args: { editLock: "permission" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Save as…" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Import…" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Share…" })).toBeEnabled();
    await expect(canvas.getByTitle("Your permissions do not include editing pages")).toBeVisible();
  },
};

/** With the overlay off the page shows its default and no view can be chosen; Save as then makes a PREBUILT view. */
export const OverlayOff: Story = {
  args: { target: "base", withUserOverlay: false, shown: "default" },
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByTitle(/Turn the user overlay on/)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Save as…" }));
    await userEvent.clear(canvas.getByTestId("view-name"));
    await userEvent.type(canvas.getByTestId("view-name"), "team-wide");
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(args.onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        viewModels: expect.objectContaining({
          pages: { demo: expect.objectContaining({ "team-wide": expect.anything() }) },
        }),
      }),
    );
  },
};
