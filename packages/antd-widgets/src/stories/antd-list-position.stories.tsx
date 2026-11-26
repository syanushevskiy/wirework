import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "antd";
import { expect, fireEvent, waitFor, within } from "storybook/test";
import { antdListPosition } from "../widgets/antd-list-position";
import { listPositionConformance } from "./conformance";
import { WidgetStory } from "./harness";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-list-position" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Position, rows in view and total are DATA: change `position` as a
 * scrolling list would and the handle follows; drag the handle and let go,
 * and `position` follows (the default reaction stored it).
 */
export const Playground: Story = playground(antdListPosition);

// The `list-position` contract's conformance set.
const conformance = listPositionConformance(antdListPosition);
export const Stands: Story = conformance.Stands;
export const Jumps: Story = conformance.Jumps;
export const Vertical: Story = conformance.Vertical;
export const Empty: Story = conformance.Empty;
export const EndUnknown: Story = conformance.EndUnknown;

const inputs = { position: "demo.position", visible: "demo.visible", total: "demo.total", hasMore: "demo.hasMore" };
const on = { changed: [{ set: "demo.position", from: "position" }] };

/** The list as a scrolling table would move it: a button a place. */
function ScrolledStepByStep() {
  const [position, setPosition] = useState(400);
  return (
    <>
      <WidgetStory
        key="pages"
        definition={antdListPosition}
        seed={{ demo: { visible: 25, total: 2000 } }}
        data={{ "demo.position": position }}
        viewModel={{ inputs, on, label: "Pages of the list", mode: "pages", pageSize: 100 }}
      />
      <Button size="small" onClick={() => setPosition(1234)}>
        The list scrolls to row 1235
      </Button>
    </>
  );
}

/**
 * `mode: "pages"`: a pagination in the scale's place. Its current page is
 * the one the list STANDS in — it follows the list as it scrolls —, and a
 * page chosen is that page's first row, which the list bound to the same
 * path scrolls to.
 */
export const Pages: Story = {
  render: () => <ScrolledStepByStep />,
  play: async ({ canvas, userEvent }) => {
    const widget = canvas.getByTestId("antd-list-position");
    const pages = within(canvas.getByRole("navigation", { name: "Pages of the list" }));
    // Row 401 of pages of a hundred: page 5 of 20. No scale.
    await expect(widget).toHaveAttribute("data-page", "5");
    await expect(canvas.getByText("Page 5 of 20")).toBeVisible();
    await expect(canvas.queryByRole("slider")).toBeNull();
    // The list scrolls: the page follows.
    await userEvent.click(canvas.getByRole("button", { name: "The list scrolls to row 1235" }));
    await waitFor(() => expect(widget).toHaveAttribute("data-page", "13"));
    await expect(pages.getByTitle("13")).toHaveClass("ant-pagination-item-active");
    // A page chosen: its first row is where the list goes.
    await userEvent.click(pages.getByTitle("14"));
    await waitFor(() => expect(canvas.getByTestId("story-store")).toHaveTextContent('"position": 1300'));
    await expect(canvas.getByText("Page 14 of 20")).toBeVisible();
  },
};

/**
 * The list's END is rarely the start of a page: the last page chosen shows
 * the last rows there are, and a list standing at its end is on its last
 * page — whatever page its first row in view belongs to.
 */
export const PagesAtTheEnd: Story = {
  render: () => (
    <WidgetStory
      key="pages-end"
      definition={antdListPosition}
      seed={{ demo: { position: 0, visible: 25, total: 1910 } }}
      viewModel={{ inputs, on, label: "Pages of the list", mode: "pages", pageSize: 100 }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const pages = within(canvas.getByRole("navigation", { name: "Pages of the list" }));
    await expect(canvas.getByText("Page 1 of 20")).toBeVisible();
    await userEvent.click(pages.getByTitle("20"));
    // Page 20 begins at row 1901, but the last place the list can stand at is row 1886: the last 25 rows.
    await waitFor(() => expect(canvas.getByTestId("story-store")).toHaveTextContent('"position": 1885'));
    await expect(canvas.getByText("Page 20 of 20")).toBeVisible();
    await expect(canvas.getByText("1 886–1 910 of 1 910")).toBeVisible();
  },
};

/**
 * SEVERAL PAGES AT ONCE: the "•••" between the page numbers goes five pages
 * on (or back), and with `showQuickJumper` a page number typed into "Go to"
 * and entered is where the list goes, however far it is.
 */
export const PagesJump: Story = {
  render: () => (
    <WidgetStory
      key="pages-jump"
      definition={antdListPosition}
      seed={{ demo: { position: 0, visible: 25, total: 2000 } }}
      viewModel={{ inputs, on, label: "Pages of the list", mode: "pages", pageSize: 100, showQuickJumper: true }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const pages = within(canvas.getByRole("navigation", { name: "Pages of the list" }));
    const store = canvas.getByTestId("story-store");
    await userEvent.click(pages.getByTitle("Next 5 Pages"));
    await waitFor(() => expect(store).toHaveTextContent('"position": 500'));
    await expect(canvas.getByText("Page 6 of 20")).toBeVisible();
    const goTo = pages.getByRole("textbox");
    await userEvent.type(goTo, "17");
    // antd reads the key's code, which a typed "{Enter}" does not carry.
    fireEvent.keyUp(goTo, { key: "Enter", keyCode: 13, which: 13 });
    await waitFor(() => expect(store).toHaveTextContent('"position": 1600'));
    await expect(canvas.getByText("Page 17 of 20")).toBeVisible();
    await userEvent.click(pages.getByTitle("Previous 5 Pages"));
    await waitFor(() => expect(store).toHaveTextContent('"position": 1100'));
  },
};

/** A list that grows as its server answers: a button is the answer. */
function GrowsStepByStep() {
  const [total, setTotal] = useState(200);
  return (
    <>
      <WidgetStory
        key="pages-open"
        definition={antdListPosition}
        seed={{ demo: { position: 120, visible: 25, hasMore: true } }}
        data={{ "demo.total": total }}
        viewModel={{ inputs, on, label: "Pages of the list", mode: "pages", pageSize: 100 }}
      />
      <Button size="small" onClick={() => setTotal(400)}>
        The next rows arrive
      </Button>
    </>
  );
}

/**
 * A list whose end is not known yet: the pages of the rows known so far,
 * "of 2+" — and NEXT is offered on the last of them. The page after has no
 * rows yet: the list goes to the end of the rows known, where it asks for
 * more, and on to that page's first row once they are there.
 */
export const PagesEndUnknown: Story = {
  render: () => <GrowsStepByStep />,
  play: async ({ canvas, userEvent }) => {
    const pages = within(canvas.getByRole("navigation", { name: "Pages of the list" }));
    const store = canvas.getByTestId("story-store");
    await expect(canvas.getByText("Page 2 of 2+")).toBeVisible();
    await expect(canvas.getByText("121–145 of 200+")).toBeVisible();
    const next = pages.getByTitle("Next Page");
    await expect(next).toHaveAttribute("aria-disabled", "false");
    await userEvent.click(next);
    // The end of the rows known: the last 25 of the two hundred.
    await waitFor(() => expect(store).toHaveTextContent('"position": 175'));
    await userEvent.click(canvas.getByRole("button", { name: "The next rows arrive" }));
    // The page asked for is there now: its first row.
    await waitFor(() => expect(store).toHaveTextContent('"position": 200'));
    await expect(canvas.getByText("Page 3 of 4+")).toBeVisible();
  },
};
