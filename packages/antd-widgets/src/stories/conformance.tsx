/**
 * Conformance stories — what "implements the contract" means, as stories
 * with interaction tests. Any implementation of a standard contract runs
 * the same set; a story file adds implementation-specific extras on top.
 * Queries use the accessible semantics the contracts require (role, name,
 * aria-invalid, alert), never implementation test ids.
 */
import type { StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, waitFor, within } from "storybook/test";
import type { AnyWidgetDefinition } from "@wirework/schema";
import type { LayoutEngineRegistry, WidgetRegistry } from "@wirework/engine";
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

/** `button` contract: a role=button with the caption; a click emits and reactions run; with `confirm` only after OK. */
export function buttonConformance(
  definition: AnyWidgetDefinition,
): Record<"Default" | "SetsAFlag" | "Confirms" | "CancelsConfirm", Story> {
  const confirming = (key: string) => (
    <WidgetStory
      key={key}
      definition={definition}
      viewModel={{
        label: "Delete",
        confirm: "Delete this run?",
        on: { clicked: [{ set: "ui.deleted", value: true }] },
      }}
    />
  );
  return {
    Confirms: {
      render: () => confirming("confirms"),
      play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole("button", { name: "Delete" }));
        // The question opens beside the button, outside the story's canvas, with a fade: visible when it ends.
        await waitFor(() => expect(page().getByText("Delete this run?")).toBeVisible());
        await userEvent.click(page().getByRole("button", { name: "OK" }));
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"deleted": true');
      },
    },
    CancelsConfirm: {
      render: () => confirming("cancels"),
      play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole("button", { name: "Delete" }));
        await userEvent.click(await page().findByRole("button", { name: "Cancel" }));
        await expect(canvas.getByTestId("story-store")).not.toHaveTextContent("deleted");
      },
    },
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

/** `input` contract: a textbox, aria-invalid + alert on failure, premade and custom rules, text stored by reaction; `rows` makes it multi-line. */
export function inputConformance(
  _definition: AnyWidgetDefinition,
): Record<"Plain" | "Required" | "Email" | "CustomPattern" | "Validates" | "MultiLine", Story> {
  return {
    MultiLine: {
      args: { label: "Notes", rows: 3 },
      play: async ({ canvas, userEvent }) => {
        const field = canvas.getByRole("textbox", { name: "Notes" });
        await expect(field.tagName).toBe("TEXTAREA");
        await userEvent.type(field, "first{enter}second");
        // Two lines stored as one text with a line break (the readout shows JSON's escape).
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"text": "first\\nsecond"');
      },
    },
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
      viewModel={{ inputs: { checked: "demo.agreed" }, label: "I agree" }}
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
  const viewModel = { inputs: { filters: "demo.filters", value: "demo.chosen" } };
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

/** `switch` contract: role=switch named by the label, off and on from the store, a flip stored by the default reaction. */
export function switchConformance(definition: AnyWidgetDefinition): Record<"Off" | "Flips" | "FromStore", Story> {
  const story = (key: string, on: boolean) => (
    <WidgetStory
      key={key}
      definition={definition}
      seed={{ demo: { on } }}
      viewModel={{ inputs: { checked: "demo.on" }, label: "Notifications" }}
    />
  );
  return {
    Off: {
      render: () => story("off", false),
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("switch", { name: "Notifications" })).not.toBeChecked();
      },
    },
    Flips: {
      render: () => story("flips", false),
      play: async ({ canvas, userEvent }) => {
        const toggle = canvas.getByRole("switch", { name: "Notifications" });
        await userEvent.click(toggle);
        await expect(toggle).toBeChecked();
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"on": true');
      },
    },
    FromStore: {
      render: () => story("from-store", true),
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("switch", { name: "Notifications" })).toBeChecked();
      },
    },
  };
}

/** `slider` contract: role=slider named by the label with the range and the value, a keyboard move stored by the default reaction. */
export function sliderConformance(definition: AnyWidgetDefinition): Record<"Value" | "Moves", Story> {
  const story = (key: string) => (
    <WidgetStory
      key={key}
      definition={definition}
      seed={{ demo: { volume: 40 } }}
      viewModel={{ inputs: { value: "demo.volume" }, label: "Volume", min: 0, max: 100, step: 5 }}
    />
  );
  return {
    Value: {
      render: () => story("value"),
      play: async ({ canvas }) => {
        const handle = canvas.getByRole("slider", { name: "Volume" });
        await expect(handle).toHaveAttribute("aria-valuenow", "40");
        await expect(handle).toHaveAttribute("aria-valuemin", "0");
        await expect(handle).toHaveAttribute("aria-valuemax", "100");
      },
    },
    Moves: {
      render: () => story("moves"),
      play: async ({ canvas }) => {
        const handle = canvas.getByRole("slider", { name: "Volume" });
        // The arrow key as the handle receives it — antd reads the key CODE (the e2e suite presses the real key in Edge).
        await fireEvent.keyDown(handle, { key: "ArrowRight", code: "ArrowRight", keyCode: 39, which: 39 });
        await expect(handle).toHaveAttribute("aria-valuenow", "45");
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"volume": 45');
      },
    },
  };
}

/** `radio-group` contract: role=radiogroup named by the label, one radio per option, a pick stored by the default reaction. */
export function radioGroupConformance(definition: AnyWidgetDefinition): Record<"Picks" | "FromStore", Story> {
  const story = (key: string, priority: string) => (
    <WidgetStory
      key={key}
      definition={definition}
      seed={{ demo: { priority } }}
      viewModel={{
        inputs: { value: "demo.priority" },
        label: "Priority",
        options: [
          { value: "low", label: "Low" },
          { value: "high", label: "High" },
        ],
      }}
    />
  );
  return {
    Picks: {
      render: () => story("picks", ""),
      play: async ({ canvas, userEvent }) => {
        const group = canvas.getByRole("radiogroup", { name: "Priority" });
        await expect(within(group).getByRole("radio", { name: "Low" })).not.toBeChecked();
        await userEvent.click(within(group).getByRole("radio", { name: "High" }));
        await expect(within(group).getByRole("radio", { name: "High" })).toBeChecked();
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"priority": "high"');
      },
    },
    FromStore: {
      render: () => story("from-store", "low"),
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("radio", { name: "Low" })).toBeChecked();
      },
    },
  };
}

/** `rate` contract: a group named by the label with one radio per star, the chosen ones checked, a pick stored by the default reaction. */
export function rateConformance(definition: AnyWidgetDefinition): Record<"Value" | "Picks", Story> {
  const story = (key: string, stars: number) => (
    <WidgetStory
      key={key}
      definition={definition}
      seed={{ demo: { stars } }}
      viewModel={{ inputs: { value: "demo.stars" }, label: "Quality", count: 5 }}
    />
  );
  const checked = (canvas: ReturnType<typeof within>) =>
    within(canvas.getByRole("group", { name: "Quality" }))
      .getAllByRole("radio")
      .filter((star) => star.getAttribute("aria-checked") === "true").length;
  return {
    Value: {
      render: () => story("value", 3),
      play: async ({ canvas }) => {
        await expect(within(canvas.getByRole("group", { name: "Quality" })).getAllByRole("radio")).toHaveLength(5);
        expect(checked(canvas)).toBe(3);
      },
    },
    Picks: {
      render: () => story("picks", 0),
      play: async ({ canvas, userEvent }) => {
        const stars = within(canvas.getByRole("group", { name: "Quality" })).getAllByRole("radio");
        const fourth = stars[3];
        if (!fourth) throw new Error("the rating has fewer than four stars");
        await userEvent.click(fourth);
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"stars": 4');
        expect(checked(canvas)).toBe(4);
      },
    },
  };
}

/** `statistic` contract: the title and the value from the store, digits grouped, with prefix and suffix; `data-value` holds the value. */
export function statisticConformance(definition: AnyWidgetDefinition): Record<"Number" | "Text", Story> {
  return {
    Number: {
      render: () => (
        <WidgetStory
          key="number"
          definition={definition}
          seed={{ demo: { total: 1128.5 } }}
          viewModel={{ inputs: { value: "demo.total" }, title: "Active runs", suffix: "runs", precision: 1 }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("Active runs")).toBeVisible();
        await expect(canvas.getByText("runs")).toBeVisible();
        // The digits grouped, the decimals to the precision given.
        await expect(canvas.getByText("1,128")).toBeVisible();
        await expect(canvas.getByText(".5")).toBeVisible();
      },
    },
    Text: {
      render: () => (
        <WidgetStory
          key="text"
          definition={definition}
          seed={{ demo: { state: "Healthy" } }}
          viewModel={{ inputs: { value: "demo.state" }, title: "Cluster", prefix: "●" }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("Healthy")).toBeVisible();
        await expect(canvas.getByText("●")).toBeVisible();
      },
    },
  };
}

/**
 * What a container's conformance set needs beside the definition: the
 * widgets its content may hold and the engine that lays them out (a story's
 * list engine), and the page's view models the inner cells' templates come
 * from. `labelInside` names a label widget to put inside.
 */
export interface ContainerInside {
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
  /** A label widget type registered in `registry`, for the content. */
  label: string;
}

const labelCell = (id: string, label: string) => ({ id, widget: label, model: `widgets.${id}`, template: "default" });
/** The inner cells' templates: a label showing its own id's text. */
const labelTemplates = (...ids: string[]) => ({
  pages: {},
  widgets: Object.fromEntries(ids.map((id) => [id, { default: { text: `Inside: ${id}` } }])),
});

/** `card` contract: the title, and the layout in its template rendered inside — its widgets resolved from the page. */
export function cardConformance(
  definition: AnyWidgetDefinition,
  { registry, layoutEngines, label }: ContainerInside,
): Record<"Content" | "Empty", Story> {
  return {
    Content: {
      render: () => (
        <WidgetStory
          key="content"
          definition={definition}
          inside={{ registry, layoutEngines, viewModels: labelTemplates("inner") }}
          viewModel={{ title: "Details", content: { engine: "list", cells: [labelCell("inner", label)] } }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("Details")).toBeVisible();
        await expect(canvas.getByTestId("layout")).toBeVisible();
        await expect(canvas.getByText("Inside: inner")).toBeVisible();
      },
    },
    Empty: {
      render: () => <WidgetStory key="empty" definition={definition} viewModel={{ title: "Empty card" }} />,
      play: async ({ canvas }) => {
        await expect(canvas.getByText("Empty card")).toBeVisible();
        await expect(canvas.queryByTestId("layout")).toBeNull();
      },
    },
  };
}

/** `tabs` contract: one tab per item, its layout rendered when shown. */
export function tabsConformance(
  definition: AnyWidgetDefinition,
  { registry, layoutEngines, label }: ContainerInside,
): Record<"Switches", Story> {
  return {
    Switches: {
      render: () => (
        <WidgetStory
          key="switches"
          definition={definition}
          inside={{ registry, layoutEngines, viewModels: labelTemplates("a-1", "b-1") }}
          viewModel={{
            tabs: [
              { key: "a", label: "First", content: { engine: "list", cells: [labelCell("a-1", label)] } },
              { key: "b", label: "Second", content: { engine: "list", cells: [labelCell("b-1", label)] } },
            ],
          }}
        />
      ),
      play: async ({ canvas, userEvent }) => {
        await expect(canvas.getByText("Inside: a-1")).toBeVisible();
        await expect(canvas.getAllByTestId("layout")).toHaveLength(1);
        await userEvent.click(canvas.getByRole("tab", { name: "Second" }));
        await expect(canvas.getByRole("tab", { name: "Second" })).toHaveAttribute("aria-selected", "true");
        await expect(canvas.getByText("Inside: b-1")).toBeVisible();
        await expect(canvas.getAllByTestId("layout")).toHaveLength(2);
      },
    },
  };
}

/** `collapse` contract: one panel per item, open ones unfolded with their layout, the others folded until opened. */
export function collapseConformance(
  definition: AnyWidgetDefinition,
  { registry, layoutEngines, label }: ContainerInside,
): Record<"Panels", Story> {
  return {
    Panels: {
      render: () => (
        <WidgetStory
          key="panels"
          definition={definition}
          inside={{ registry, layoutEngines, viewModels: labelTemplates("a-1", "b-1") }}
          viewModel={{
            panels: [
              { key: "a", label: "Open", open: true, content: { engine: "list", cells: [labelCell("a-1", label)] } },
              { key: "b", label: "Folded", content: { engine: "list", cells: [labelCell("b-1", label)] } },
            ],
          }}
        />
      ),
      play: async ({ canvas, userEvent }) => {
        await expect(canvas.getByText("Inside: a-1")).toBeVisible();
        await expect(canvas.getAllByTestId("layout")).toHaveLength(1);
        await userEvent.click(canvas.getByRole("button", { name: /Folded/ }));
        // antd unfolds a panel with a height animation: the label is in the DOM at once, visible when it ends.
        await waitFor(() => expect(canvas.getByText("Inside: b-1")).toBeVisible());
        await expect(canvas.getAllByTestId("layout")).toHaveLength(2);
      },
    },
  };
}

/** `divider` contract: role=separator, with the title on it or plain. */
export function dividerConformance(definition: AnyWidgetDefinition): Record<"Titled" | "Plain", Story> {
  return {
    Titled: {
      render: () => <WidgetStory key="titled" definition={definition} viewModel={{ text: "Details" }} />,
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("separator")).toHaveTextContent("Details");
      },
    },
    Plain: {
      render: () => <WidgetStory key="plain" definition={definition} viewModel={{ dashed: true }} />,
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("separator")).toBeEmptyDOMElement();
      },
    },
  };
}

/** `number` contract: role=spinbutton named by the label, the number from the store, a typed number stored, an emptied field stored as null. */
export function numberConformance(definition: AnyWidgetDefinition): Record<"Value" | "Types" | "Empties", Story> {
  const story = (key: string, seconds: number | null) => (
    <WidgetStory
      key={key}
      definition={definition}
      seed={{ demo: { seconds } }}
      viewModel={{ inputs: { value: "demo.seconds" }, label: "Refresh every", suffix: "s", min: 1 }}
    />
  );
  return {
    Value: {
      render: () => story("value", 30),
      play: async ({ canvas }) => {
        const field = canvas.getByRole("spinbutton", { name: "Refresh every" });
        await expect(field).toHaveValue("30");
        await expect(field).toHaveAttribute("aria-valuemin", "1");
      },
    },
    Types: {
      render: () => story("types", null),
      play: async ({ canvas, userEvent }) => {
        await userEvent.type(canvas.getByRole("spinbutton", { name: "Refresh every" }), "45");
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"seconds": 45');
      },
    },
    Empties: {
      render: () => story("empties", 30),
      play: async ({ canvas, userEvent }) => {
        await userEvent.clear(canvas.getByRole("spinbutton", { name: "Refresh every" }));
        // Emptied is null, never 0: the form's "nothing" and its zero are different answers.
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"seconds": null');
      },
    },
  };
}

/** `date` contract: a textbox named by the label showing the stored day, a typed day stored as YYYY-MM-DD, a time stored as ISO. */
export function dateConformance(definition: AnyWidgetDefinition): Record<"Value" | "Types" | "WithTime", Story> {
  return {
    Value: {
      render: () => (
        <WidgetStory
          key="value"
          definition={definition}
          seed={{ demo: { day: "2026-11-09" } }}
          viewModel={{ inputs: { value: "demo.day" }, label: "Report day" }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("textbox", { name: "Report day" })).toHaveValue("2026-11-09");
      },
    },
    Types: {
      render: () => (
        <WidgetStory
          key="types"
          definition={definition}
          seed={{ demo: { day: "" } }}
          viewModel={{ inputs: { value: "demo.day" }, label: "Report day" }}
        />
      ),
      play: async ({ canvas, userEvent }) => {
        // Typed, never clicked in a calendar: a calendar cell moves with the month.
        await userEvent.type(canvas.getByRole("textbox", { name: "Report day" }), "2026-11-10{enter}");
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"day": "2026-11-10"');
      },
    },
    WithTime: {
      render: () => (
        <WidgetStory
          key="with-time"
          definition={definition}
          seed={{ demo: { at: "" } }}
          viewModel={{ inputs: { value: "demo.at" }, label: "Starts at", withTime: true }}
        />
      ),
      play: async ({ canvas, userEvent }) => {
        await userEvent.type(canvas.getByRole("textbox", { name: "Starts at" }), "2026-11-10 08:15{enter}");
        // ISO with the local offset: the day and the time as typed, whatever the zone.
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"at": "2026-11-10T08:15:00');
      },
    },
  };
}

/** `date-range` contract: a group named by the label holding two textboxes with the stored pair, two typed days stored as the pair. */
export function dateRangeConformance(definition: AnyWidgetDefinition): Record<"Value" | "Types", Story> {
  const story = (key: string, window: [string, string]) => (
    <WidgetStory
      key={key}
      definition={definition}
      seed={{ demo: { window } }}
      viewModel={{ inputs: { value: "demo.window" }, label: "Started between" }}
    />
  );
  return {
    Value: {
      render: () => story("value", ["2026-11-01", "2026-11-09"]),
      play: async ({ canvas }) => {
        const [from, to] = within(canvas.getByRole("group", { name: "Started between" })).getAllByRole("textbox");
        await expect(from).toHaveValue("2026-11-01");
        await expect(to).toHaveValue("2026-11-09");
      },
    },
    Types: {
      render: () => story("types", ["", ""]),
      play: async ({ canvas, userEvent }) => {
        const [from, to] = within(canvas.getByRole("group", { name: "Started between" })).getAllByRole("textbox");
        if (from === undefined || to === undefined) throw new Error("the range has fewer than two fields");
        await userEvent.type(from, "2026-11-02{enter}");
        await userEvent.type(to, "2026-11-08{enter}");
        const store = canvas.getByTestId("story-store");
        await expect(store).toHaveTextContent('"2026-11-02"');
        await expect(store).toHaveTextContent('"2026-11-08"');
      },
    },
  };
}

const RECORD = { id: "7", name: "Nightly regression", state: "Success", reference: "REF59456738" };

/** `descriptions` contract: one labelled field per item in the table's cell kinds, a link cell's plain click emitted, empty fields on an empty path. */
export function descriptionsConformance(
  definition: AnyWidgetDefinition,
): Record<"Fields" | "LinkClicked" | "BoundToEmptyPath", Story> {
  const items = [
    { title: "Name", property: "name", cell: { kind: "link", to: "/demo/runs/{id}" } },
    { title: "Status", property: "state", cell: { kind: "tag", tones: { Success: "success", Failed: "danger" } } },
    { title: "Reference", property: "reference" },
  ];
  return {
    Fields: {
      render: () => (
        <WidgetStory
          key="fields"
          definition={definition}
          seed={{ demo: { run: RECORD } }}
          viewModel={{ inputs: { record: "demo.run" }, title: "Run", items }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("Run")).toBeVisible();
        await expect(canvas.getByText("Status")).toBeVisible();
        await expect(canvas.getByText("Success")).toHaveAttribute("data-tone", "success");
        await expect(canvas.getByText("REF59456738")).toBeVisible();
        await expect(canvas.getByRole("link", { name: "Nightly regression" })).toHaveAttribute("href", "/demo/runs/7");
      },
    },
    LinkClicked: {
      render: () => (
        <WidgetStory
          key="link"
          definition={definition}
          seed={{ demo: { run: RECORD } }}
          viewModel={{
            inputs: { record: "demo.run" },
            on: { "link-clicked": [{ set: "demo.href", from: "href" }] },
            items,
          }}
        />
      ),
      play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole("link", { name: "Nightly regression" }));
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"href": "/demo/runs/7"');
      },
    },
    BoundToEmptyPath: {
      render: () => (
        <WidgetStory key="empty" definition={definition} viewModel={{ inputs: { record: "demo.missing" }, items }} />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("Reference")).toBeVisible();
        await expect(canvas.queryByText("REF59456738")).toBeNull();
      },
    },
  };
}

/** `result` contract: role=status with the status, title and detail; role=alert for a failing outcome; a bound title; the action emits. */
export function resultConformance(
  definition: AnyWidgetDefinition,
): Record<"Static" | "Alerting" | "FromStore" | "Action", Story> {
  return {
    Static: {
      render: () => (
        <WidgetStory
          key="static"
          definition={definition}
          viewModel={{ status: "success", title: "Saved", detail: "Every change is stored." }}
        />
      ),
      play: async ({ canvas }) => {
        const result = canvas.getByRole("status");
        await expect(result).toHaveAttribute("data-status", "success");
        await expect(result).toHaveTextContent("Saved");
        await expect(result).toHaveTextContent("Every change is stored.");
      },
    },
    Alerting: {
      render: () => (
        <WidgetStory
          key="alerting"
          definition={definition}
          viewModel={{ status: "failed", title: "The server failed" }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("alert")).toHaveTextContent("The server failed");
      },
    },
    FromStore: {
      render: () => (
        <WidgetStory
          key="from-store"
          definition={definition}
          seed={{ demo: { error: "There is no run nope" } }}
          viewModel={{ status: "not-found", title: "Not found", inputs: { title: "demo.error" } }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByRole("status")).toHaveTextContent("There is no run nope");
        await expect(canvas.queryByText("Not found")).toBeNull();
      },
    },
    Action: {
      render: () => (
        <WidgetStory
          key="action"
          definition={definition}
          viewModel={{
            status: "error",
            title: "Failed",
            action: "Retry",
            on: { clicked: [{ set: "ui.retried", value: true }] },
          }}
        />
      ),
      play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"retried": true');
      },
    },
  };
}

/** `dialog` contract: role=dialog named by the title with the layout inside while `open` is true, nothing while false, closing stored by the default reaction. */
export function dialogConformance(
  definition: AnyWidgetDefinition,
  { registry, layoutEngines, label }: ContainerInside,
): Record<"Open" | "Closed" | "Closes", Story> {
  // Shown in place: a story is no page to open a dialog over.
  const story = (key: string, open: boolean) => (
    <WidgetStory
      key={key}
      definition={definition}
      seed={{ ui: { open } }}
      inside={{ registry, layoutEngines, viewModels: labelTemplates("inner") }}
      viewModel={{
        inputs: { open: "ui.open" },
        title: "Retry run",
        inline: true,
        content: { engine: "list", cells: [labelCell("inner", label)] },
      }}
    />
  );
  return {
    Open: {
      render: () => story("open", true),
      play: async ({ canvas }) => {
        // antd opens a dialog with a zoom: visible when the animation ends.
        await waitFor(() => expect(canvas.getByRole("dialog")).toBeVisible());
        await expect(canvas.getByRole("dialog")).toHaveTextContent("Retry run");
        await expect(canvas.getByText("Inside: inner")).toBeVisible();
      },
    },
    Closed: {
      render: () => story("closed", false),
      play: async ({ canvas }) => {
        await expect(canvas.queryByRole("dialog")).toBeNull();
        await expect(canvas.queryByText("Inside: inner")).toBeNull();
      },
    },
    Closes: {
      render: () => story("closes", true),
      play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole("button", { name: "Close" }));
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"open": false');
      },
    },
  };
}

const PIPELINE = [
  { key: "queued", label: "Queued" },
  { key: "running", label: "Running" },
  { key: "finished", label: "Finished" },
];

/** `steps` contract: a list named by the label with the current step by key or position (`data-current`), a failed step, a clicked step emitted. */
export function stepsConformance(definition: AnyWidgetDefinition): Record<"Current" | "Failed" | "Clicks", Story> {
  const story = (key: string, stage: string | number, extra: Record<string, unknown> = {}) => (
    <WidgetStory
      key={key}
      definition={definition}
      seed={{ run: { stage, failed: true } }}
      viewModel={{ inputs: { current: "run.stage" }, label: "Pipeline", items: PIPELINE, ...extra }}
    />
  );
  const list = (canvas: ReturnType<typeof within>) => canvas.getByRole("list", { name: "Pipeline" });
  return {
    Current: {
      render: () => story("current", "running"),
      play: async ({ canvas }) => {
        await expect(list(canvas)).toHaveAttribute("data-current", "running");
        await expect(list(canvas)).toHaveAttribute("data-status", "process");
        await expect(canvas.getByText("Finished")).toBeVisible();
      },
    },
    Failed: {
      render: () => (
        <WidgetStory
          key="failed"
          definition={definition}
          seed={{ run: { stage: 2, failed: true } }}
          viewModel={{ inputs: { current: "run.stage", failed: "run.failed" }, label: "Pipeline", items: PIPELINE }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(list(canvas)).toHaveAttribute("data-current", "finished");
        await expect(list(canvas)).toHaveAttribute("data-status", "error");
      },
    },
    Clicks: {
      render: () => story("clicks", "queued", { clickable: true }),
      play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByText("Finished"));
        await expect(canvas.getByTestId("story-store")).toHaveTextContent('"stage": "finished"');
        await expect(list(canvas)).toHaveAttribute("data-current", "finished");
      },
    },
  };
}

const HISTORY = [
  { time: "09:00", text: "Queued" },
  { time: "09:01", title: "qa-1", text: "Running", tone: "info" },
  { time: "09:07", text: "Finished", tone: "success" },
];

/** `timeline` contract: one entry per item with its time, heading, text and tone (`data-tone`); `pending` an open last entry. */
export function timelineConformance(definition: AnyWidgetDefinition): Record<"Entries" | "Pending", Story> {
  return {
    Entries: {
      render: () => (
        <WidgetStory
          key="entries"
          definition={definition}
          seed={{ run: { history: HISTORY } }}
          viewModel={{ inputs: { items: "run.history" } }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("09:01")).toBeVisible();
        await expect(canvas.getByText("qa-1")).toBeVisible();
        await expect(canvas.getByText("Running").closest("[data-tone]")).toHaveAttribute("data-tone", "info");
        await expect(canvas.getByText("Finished").closest("[data-tone]")).toHaveAttribute("data-tone", "success");
        await expect(canvas.getByText("Queued").closest("[data-tone]")).toHaveAttribute("data-tone", "default");
      },
    },
    Pending: {
      render: () => (
        <WidgetStory
          key="pending"
          definition={definition}
          seed={{ run: { history: HISTORY.slice(0, 2) } }}
          viewModel={{ inputs: { items: "run.history" }, pending: "Still running…" }}
        />
      ),
      play: async ({ canvas }) => {
        await expect(canvas.getByText("Still running…")).toBeVisible();
        await expect(canvas.queryByText("Finished")).toBeNull();
      },
    },
  };
}
