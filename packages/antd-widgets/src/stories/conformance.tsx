/**
 * Conformance stories — what "implements the contract" means, as stories
 * with interaction tests. Any implementation of a standard contract runs
 * the same set; a story file adds implementation-specific extras on top.
 * Queries use the accessible semantics the contracts require (role, name,
 * aria-invalid, alert), never implementation test ids.
 */
import type { StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import type { AnyWidgetDefinition } from "@wirework/schema";
import { WidgetStory } from "./harness";

/** A dropdown's options open in a portal outside the story's canvas. */
const page = () => within(document.body);

// Story objects are combined into files whose Meta types differ per widget;
// `any` here keeps the conformance set assignable to every such file, and
// `arg` reads the file's args (typed there, opaque here).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Story = StoryObj<any>;
const arg = (args: unknown, key: string): string => String((args as Record<string, unknown>)[key]);

/** `label` contract: static text, text from a store path, fallback on an empty path. */
export function labelConformance(
  definition: AnyWidgetDefinition,
): Record<"Static" | "FromStore" | "BoundToEmptyPath", Story> {
  return {
    Static: {
      play: async ({ canvas, args }) => {
        await expect(canvas.getByText(arg(args, "text"))).toBeVisible();
      },
    },
    FromStore: {
      render: (args: Record<string, unknown>) => (
        <WidgetStory
          key="from-store"
          definition={definition}
          seed={{ demo: { greeting: "Text from the store" } }}
          viewModel={{ ...args, inputs: { text: "demo.greeting" } }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("Text from the store")).toBeVisible();
      },
    },
    BoundToEmptyPath: {
      render: (args: Record<string, unknown>) => (
        <WidgetStory key="empty" definition={definition} viewModel={{ ...args, inputs: { text: "demo.missing" } }} />
      ),
      play: async ({ canvas, args }) => {
        await expect(canvas.getByText(arg(args, "text"))).toBeVisible();
      },
    },
  };
}

/** `button` contract: a role=button with the caption; a click emits and reactions run. */
export function buttonConformance(definition: AnyWidgetDefinition): Record<"Default" | "SetsAFlag", Story> {
  return {
    Default: {
      play: async ({ canvas, args }) => {
        await expect(canvas.getByRole("button", { name: arg(args, "label") })).toBeVisible();
      },
    },
    SetsAFlag: {
      render: (args: Record<string, unknown>) => (
        <WidgetStory
          key="flag"
          definition={definition}
          viewModel={{ ...args, on: { clicked: [{ set: "ui.clicked", value: true }] } }}
        />
      ),
      play: async ({ canvas, userEvent, args }) => {
        await userEvent.click(canvas.getByRole("button", { name: arg(args, "label") }));
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"clicked": true');
      },
    },
  };
}

/** `input` contract: a textbox, aria-invalid + alert on failure, premade and custom rules, text stored by reaction. */
export function inputConformance(
  _definition: AnyWidgetDefinition,
): Record<"Plain" | "Required" | "Email" | "CustomPattern" | "Validates", Story> {
  return {
    Plain: {
      play: async ({ canvas, userEvent }) => {
        const field = canvas.getByRole("textbox");
        await userEvent.type(field, "hello");
        await expect(field).toHaveAttribute("aria-invalid", "false");
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"text": "hello"');
      },
    },
    Required: {
      args: { validation: "required" },
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
        await expect(canvas.getByRole("alert")).toHaveTextContent("required");
      },
    },
    Email: { args: { validation: "email", type: "email", label: "E-mail" } },
    CustomPattern: {
      args: { label: "Ticket", pattern: "^[A-Z]{3}-[0-9]+$", patternMessage: "use the form ABC-123" },
      play: async ({ canvas, userEvent }) => {
        const field = canvas.getByRole("textbox");
        await userEvent.type(field, "abc");
        await expect(canvas.getByRole("alert")).toHaveTextContent("use the form ABC-123");
        await userEvent.clear(field);
        await userEvent.type(field, "ABC-42");
        await expect(field).toHaveAttribute("aria-invalid", "false");
      },
    },
    Validates: {
      args: { validation: "email" },
      play: async ({ canvas, userEvent }) => {
        const field = canvas.getByRole("textbox");
        await userEvent.type(field, "nope");
        await expect(field).toHaveAttribute("aria-invalid", "true");
        await expect(canvas.getByRole("alert")).toHaveTextContent("must be an email address");
        await userEvent.clear(field);
        await userEvent.type(field, "team@example.com");
        await expect(field).toHaveAttribute("aria-invalid", "false");
      },
    },
  };
}

/** `tag` contract: static text in a tone (`data-tone`), text from a store path, the static text on an empty value. */
export function tagConformance(
  definition: AnyWidgetDefinition,
): Record<"Static" | "FromStore" | "BoundToEmptyValue", Story> {
  return {
    Static: {
      render: () => <WidgetStory key="static" definition={definition} viewModel={{ text: "Failed", tone: "danger" }} />,
      play: async ({ canvas }) => {
        await expect(canvas.getByText("Failed")).toHaveAttribute("data-tone", "danger");
      },
    },
    FromStore: {
      render: () => (
        <WidgetStory
          key="from-store"
          definition={definition}
          seed={{ demo: { state: "Running" } }}
          viewModel={{ text: "Idle", tone: "info", inputs: { text: "demo.state" } }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("Running")).toHaveAttribute("data-tone", "info");
        await expect(canvas.queryByText("Idle")).toBeNull();
      },
    },
    BoundToEmptyValue: {
      render: () => (
        <WidgetStory
          key="empty"
          definition={definition}
          seed={{ demo: { state: "" } }}
          viewModel={{ text: "Idle", inputs: { text: "demo.state" } }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("Idle")).toBeVisible();
      },
    },
  };
}

/** `alert` contract: role=alert with the title and description in a tone (`data-tone`); a bound title replaces the static one unless empty. */
export function alertConformance(
  definition: AnyWidgetDefinition,
): Record<"Static" | "FromStore" | "BoundToEmptyValue", Story> {
  return {
    Static: {
      render: () => (
        <WidgetStory
          key="static"
          definition={definition}
          viewModel={{ title: "Deployment failed", description: "2 checks did not pass.", tone: "danger" }}
        />
      ),
      play: async ({ canvas }) => {
        const alert = canvas.getByRole("alert");
        await expect(alert).toHaveTextContent("Deployment failed");
        await expect(alert).toHaveTextContent("2 checks did not pass.");
        await expect(alert).toHaveAttribute("data-tone", "danger");
      },
    },
    FromStore: {
      render: () => (
        <WidgetStory
          key="from-store"
          definition={definition}
          seed={{ demo: { message: "3 runs failed tonight" } }}
          viewModel={{ title: "All good", tone: "warning", inputs: { title: "demo.message" } }}
        />
      ),
      play: async ({ canvas }) => {
        const alert = canvas.getByRole("alert");
        await expect(alert).toHaveTextContent("3 runs failed tonight");
        await expect(alert).not.toHaveTextContent("All good");
      },
    },
    BoundToEmptyValue: {
      render: () => (
        <WidgetStory
          key="empty"
          definition={definition}
          seed={{ demo: { message: "" } }}
          viewModel={{ title: "All good", tone: "success", inputs: { title: "demo.message" } }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("alert")).toHaveTextContent("All good");
      },
    },
  };
}

/** `progress` contract: role=progressbar named by the label, the shown value clamped to 0–100 and exposed as `data-percent`. */
export function progressConformance(
  definition: AnyWidgetDefinition,
): Record<"Value" | "Clamped" | "BoundToEmptyPath" | "WithoutValue", Story> {
  const shown = (canvas: ReturnType<typeof within>, name: string) =>
    canvas.getByRole("progressbar", { name }).closest("[data-percent]");
  return {
    Value: {
      render: () => (
        <WidgetStory
          key="value"
          definition={definition}
          seed={{ demo: { percent: 60 } }}
          viewModel={{ inputs: { percent: "demo.percent" }, label: "Upload" }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(shown(canvas, "Upload")).toHaveAttribute("data-percent", "60");
        await expect(canvas.getByText("60%")).toBeVisible();
      },
    },
    Clamped: {
      render: () => (
        <WidgetStory
          key="clamped"
          definition={definition}
          seed={{ demo: { over: 130, under: -20 } }}
          viewModel={{ inputs: { percent: "demo.over" }, label: "Rollout" }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(shown(canvas, "Rollout")).toHaveAttribute("data-percent", "100");
        await expect(canvas.getByText("100%")).toBeVisible();
      },
    },
    BoundToEmptyPath: {
      render: () => (
        <WidgetStory
          key="empty"
          definition={definition}
          viewModel={{ inputs: { percent: "demo.missing" }, label: "Nothing yet" }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(shown(canvas, "Nothing yet")).toHaveAttribute("data-percent", "0");
      },
    },
    WithoutValue: {
      render: () => (
        <WidgetStory
          key="without-value"
          definition={definition}
          seed={{ demo: { percent: 60 } }}
          viewModel={{ inputs: { percent: "demo.percent" }, label: "Quiet", showValue: false }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(shown(canvas, "Quiet")).toHaveAttribute("data-percent", "60");
        await expect(canvas.queryByText("60%")).toBeNull();
      },
    },
  };
}

/** `checkbox` contract: role=checkbox named by the label, controlled by the store, every change stored by the reaction. */
export function checkboxConformance(
  definition: AnyWidgetDefinition,
): Record<"Unchecked" | "Toggles" | "FromStore", Story> {
  const story = (key: string, checked: boolean) => (
    <WidgetStory
      key={key}
      definition={definition}
      seed={{ demo: { agreed: checked } }}
      viewModel={{
        inputs: { checked: "demo.agreed" },
        on: { changed: [{ set: "demo.agreed", from: "checked" }] },
        label: "I agree",
      }}
    />
  );
  return {
    Unchecked: {
      render: () => story("unchecked", false),
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("checkbox", { name: "I agree" })).not.toBeChecked();
      },
    },
    Toggles: {
      render: () => story("toggles", false),
      play: async ({ canvas, userEvent }) => {
        const box = canvas.getByRole("checkbox", { name: "I agree" });
        await userEvent.click(box);
        await expect(box).toBeChecked();
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"agreed": true');
        await userEvent.click(box);
        await expect(box).not.toBeChecked();
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"agreed": false');
      },
    },
    FromStore: {
      render: () => story("from-store", true),
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("checkbox", { name: "I agree" })).toBeChecked();
      },
    },
  };
}

/** `pagination` contract: the page and the total from the store, a picked page stored by the reaction, the page size from its port or the setting. */
export function paginationConformance(
  definition: AnyWidgetDefinition,
): Record<"Pages" | "PageSizeFromStore" | "BoundToEmptyPath", Story> {
  const on = { changed: [{ set: "demo.page", from: "page" }] };
  return {
    Pages: {
      render: () => (
        <WidgetStory
          key="pages"
          definition={definition}
          seed={{ demo: { page: 1, total: 50 } }}
          viewModel={{ inputs: { page: "demo.page", total: "demo.total" }, on }}
        />
      ),
      play: async ({ canvas, userEvent }) => {
        await expect(canvas.getByText("1-10 of 50")).toBeVisible();
        await userEvent.click(canvas.getByText("2"));
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"page": 2');
        await expect(canvas.getByText("11-20 of 50")).toBeVisible();
      },
    },
    PageSizeFromStore: {
      render: () => (
        <WidgetStory
          key="page-size"
          definition={definition}
          seed={{ demo: { page: 1, total: 50, size: 25 } }}
          viewModel={{ inputs: { page: "demo.page", total: "demo.total", pageSize: "demo.size" }, on, pageSize: 10 }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("1-25 of 50")).toBeVisible();
      },
    },
    BoundToEmptyPath: {
      render: () => (
        <WidgetStory
          key="empty"
          definition={definition}
          viewModel={{ inputs: { page: "demo.missing.page", total: "demo.missing.total" }, on }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText(/of 0$/)).toBeVisible();
      },
    },
  };
}

/** `refresher` contract: the schedule from the store, its changes and every refresh stored by the reactions. */
export function refresherConformance(
  definition: AnyWidgetDefinition,
): Record<"Idle" | "ManualRefresh" | "Schedule", Story> {
  const story = (key: string) => (
    <WidgetStory
      key={key}
      definition={definition}
      seed={{ demo: { schedule: { enabled: false, interval: 5 } } }}
      viewModel={{
        inputs: { schedule: "demo.schedule" },
        on: { changed: [{ set: "demo.schedule" }], refresh: [{ set: "demo.lastTrigger", from: "trigger" }] },
        label: "Auto-refresh every",
        buttonLabel: "Refresh",
      }}
    />
  );
  return {
    Idle: {
      render: () => story("idle"),
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("checkbox", { name: "Auto-refresh every" })).not.toBeChecked();
        await expect(canvas.getByRole("spinbutton")).toHaveValue("5");
        await expect(canvas.getByRole("button", { name: "Refresh" })).toBeVisible();
      },
    },
    ManualRefresh: {
      render: () => story("manual"),
      play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole("button", { name: "Refresh" }));
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"lastTrigger": "manual"');
      },
    },
    Schedule: {
      render: () => story("schedule"),
      play: async ({ canvas, userEvent }) => {
        const toggle = canvas.getByRole("checkbox", { name: "Auto-refresh every" });
        await userEvent.click(toggle);
        await expect(toggle).toBeChecked();
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"enabled": true');
      },
    },
  };
}

const CHOICES = [
  { value: "one", label: "One" },
  { value: "two", label: "Two" },
  { value: "three", label: "Three" },
];

/** `select` contract: a combobox named by the label, the choice from the store, a pick stored by the reaction, options from a port or the setting. */
export function selectConformance(
  definition: AnyWidgetDefinition,
): Record<"Choose" | "FromStore" | "OptionsFromStore", Story> {
  const on = { changed: [{ set: "demo.pick", from: "value" }] };
  return {
    Choose: {
      render: () => (
        <WidgetStory
          key="choose"
          definition={definition}
          seed={{ demo: { pick: "" } }}
          viewModel={{ inputs: { value: "demo.pick" }, on, label: "Choose one", options: CHOICES }}
        />
      ),
      play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole("combobox", { name: "Choose one" }));
        await userEvent.click(await page().findByText("Two"));
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"pick": "two"');
      },
    },
    FromStore: {
      render: () => (
        <WidgetStory
          key="from-store"
          definition={definition}
          seed={{ demo: { pick: "two" } }}
          viewModel={{ inputs: { value: "demo.pick" }, on, label: "Choose one", options: CHOICES }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("Two")).toBeVisible();
      },
    },
    OptionsFromStore: {
      render: () => (
        <WidgetStory
          key="options"
          definition={definition}
          seed={{ demo: { pick: "", apps: [{ value: "billing", label: "Billing" }] } }}
          viewModel={{
            inputs: { value: "demo.pick", options: "demo.apps" },
            on,
            label: "Application",
            options: CHOICES,
          }}
        />
      ),
      play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole("combobox", { name: "Application" }));
        await page().findByRole("option", { name: "Billing" });
        await expect(page().queryByRole("option", { name: "One" })).toBeNull();
      },
    },
  };
}

/** `multi-select` contract: a combobox named by the label, the choices from the store, every change stored with all chosen values. */
export function multiSelectConformance(definition: AnyWidgetDefinition): Record<"Choose" | "FromStore", Story> {
  const story = (key: string, picks: string[]) => (
    <WidgetStory
      key={key}
      definition={definition}
      seed={{ demo: { picks } }}
      viewModel={{
        inputs: { value: "demo.picks" },
        on: { changed: [{ set: "demo.picks", from: "value" }] },
        label: "Choose several",
        options: CHOICES,
        // Every chosen value shown as it is — collapsing is the implementation's affair.
        collapseTags: false,
      }}
    />
  );
  return {
    Choose: {
      render: () => story("choose", ["one"]),
      play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole("combobox", { name: "Choose several" }));
        await userEvent.click(await page().findByText("Two"));
        const store = canvas.getByTestId("story-store");
        await expect(store).toHaveTextContent('"one"');
        await expect(store).toHaveTextContent('"two"');
      },
    },
    FromStore: {
      render: () => story("from-store", ["one", "three"]),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("One")).toBeVisible();
        await expect(canvas.getByText("Three")).toBeVisible();
      },
    },
  };
}

const ROWS = [
  { id: "1", name: "Nightly", status: "Success" },
  { id: "2", name: "Smoke", status: "Failed" },
];

/** `table` contract: rows from the store in the configured columns, a row's key on click, `load` once on appearance, the empty text. */
export function tableConformance(
  definition: AnyWidgetDefinition,
): Record<"Rows" | "RowSelected" | "LoadsOnAppearance" | "BoundToEmptyPath", Story> {
  const columns = [
    { title: "Name", property: "name" },
    { title: "Status", property: "status" },
  ];
  return {
    Rows: {
      render: () => (
        <WidgetStory
          key="rows"
          definition={definition}
          seed={{ demo: { rows: ROWS } }}
          viewModel={{ inputs: { rows: "demo.rows" }, columns }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("columnheader", { name: "Name" })).toBeVisible();
        await expect(canvas.getByRole("columnheader", { name: "Status" })).toBeVisible();
        await expect(canvas.getByText("Smoke").closest("tr")).toHaveAttribute("data-row-key", "2");
        await expect(canvas.getByText("Failed").closest("td")).toHaveAttribute("data-property", "status");
      },
    },
    RowSelected: {
      render: () => (
        <WidgetStory
          key="selected"
          definition={definition}
          seed={{ demo: { rows: ROWS } }}
          viewModel={{
            inputs: { rows: "demo.rows" },
            on: { "row-selected": [{ set: "demo.selected", from: "key" }] },
            columns,
          }}
        />
      ),
      play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByText("Smoke"));
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"selected": "2"');
        // By keyboard too: a row can be reached with Tab and selected with Enter.
        (canvas.getByText("Nightly").closest("tr") as HTMLElement).focus();
        await userEvent.keyboard("{Enter}");
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"selected": "1"');
      },
    },
    LoadsOnAppearance: {
      render: () => (
        <WidgetStory
          key="load"
          definition={definition}
          seed={{ demo: { rows: ROWS, loads: 0 } }}
          viewModel={{ inputs: { rows: "demo.rows" }, on: { load: [{ set: "demo.loaded", value: true }] }, columns }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"loaded": true');
      },
    },
    BoundToEmptyPath: {
      render: () => (
        <WidgetStory
          key="empty"
          definition={definition}
          viewModel={{ inputs: { rows: "demo.missing" }, columns, emptyText: "No runs yet" }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("No runs yet")).toBeVisible();
      },
    },
  };
}

const FILTERS = [
  { id: "state", label: "Status", options: [{ value: "Running" }, { value: "Failed" }] },
  {
    id: "host",
    label: "Host",
    options: [
      { value: "qa-1", label: "QA 1" },
      { value: "qa-2", label: "QA 2" },
    ],
  },
];

/** `filter-bar` contract: one combobox per filter the store describes, named by its label; every change stored whole; the empty text. */
export function filterBarConformance(
  definition: AnyWidgetDefinition,
): Record<"FromStore" | "Chosen" | "NoFilters", Story> {
  const viewModel = {
    inputs: { filters: "demo.filters", value: "demo.chosen" },
    on: { changed: [{ set: "demo.chosen", from: "value" }] },
  };
  return {
    FromStore: {
      render: () => (
        <WidgetStory
          key="from-store"
          definition={definition}
          seed={{ demo: { filters: FILTERS, chosen: { state: ["Running"] } } }}
          viewModel={viewModel}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("combobox", { name: "Status" })).toBeVisible();
        await expect(canvas.getByRole("combobox", { name: "Host" })).toBeVisible();
        // A chosen value is laid out after a measurement (a hidden copy first): one of them is shown.
        const chosen = await canvas.findAllByText("Running");
        await expect(chosen.some((element) => element.checkVisibility())).toBe(true);
      },
    },
    Chosen: {
      render: () => (
        <WidgetStory
          key="chosen"
          definition={definition}
          seed={{ demo: { filters: FILTERS, chosen: { state: ["Running"] } } }}
          viewModel={viewModel}
        />
      ),
      play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole("combobox", { name: "Host" }));
        await userEvent.click(await page().findByText("QA 1"));
        const store = canvas.getByTestId("story-store");
        await expect(store).toHaveTextContent('"host": [');
        await expect(store).toHaveTextContent('"qa-1"');
        await expect(store).toHaveTextContent('"Running"');
      },
    },
    NoFilters: {
      render: () => (
        <WidgetStory key="none" definition={definition} viewModel={{ ...viewModel, emptyText: "No filters" }} />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("No filters")).toBeVisible();
      },
    },
  };
}
