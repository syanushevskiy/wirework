/**
 * @wirework/view-data-models-examples — example view models, user overlays
 * and seed data modelled on the Xsight sketch. Hosts (the playground,
 * tests) boot from `viewModels`; `failurePathViewModels` is a separate,
 * deliberately broken tree for exercising the engine's failure modes
 * (problem placeholders, fallbacks, crash isolation, boot validation) —
 * resolved cell by cell in the engine's unit tests, not loaded by the
 * playground.
 *
 * Contract proof: depends on @wirework/schema ONLY — a view/data model is
 * plain data. Every cell carries a stable `id` (identity is never
 * positional). The playground pages use the "react-grid-layout" engine;
 * the failure-path page uses "flex-rows".
 */
import type { RunsData, UserViewModels, ViewModels } from "@wirework/schema";

export const viewModels: ViewModels = {
  pages: {
    demo: {
      default: {
        engine: "react-grid-layout",
        // Already vertically compact: react-grid-layout will not move
        // anything on mount, so an edit session starts from exactly this.
        cells: [
          { id: "label-main", widget: "antd-label", model: "widgets.demo.label", template: "default", x: 0, y: 0, w: 12, h: 1 },
          { id: "counter-main", widget: "antd-counter", model: "widgets.demo.counter", template: "default", x: 0, y: 1, w: 6, h: 2 },
          { id: "echo-counter", widget: "antd-echo", model: "widgets.demo.echo", template: "default", x: 6, y: 1, w: 3, h: 2 },
          { id: "echo-demo", widget: "antd-echo", model: "widgets.demo.echoAll", template: "default", x: 9, y: 1, w: 3, h: 2 },
          // Refresh by hand or on a timer: `refresh` CALLS the same host
          // action the pagination uses (doc/refresher-design.md).
          { id: "refresher-runs", widget: "antd-refresher", model: "widgets.demo.runsRefresher", template: "default", x: 0, y: 3, w: 9, h: 1 },
          { id: "table-main", widget: "antd-runs-table", model: "widgets.demo.table", template: "default", x: 0, y: 4, w: 9, h: 5 },
          // Server-side paging: a page change CALLS a host action that
          // requests the rows and writes them to the table's path.
          { id: "pagination-runs", widget: "antd-pagination", model: "widgets.demo.runsPagination", template: "default", x: 0, y: 9, w: 9, h: 1 },
          // Displays the run the HOST wrote to "runs.selected" in reaction
          // to the table's `row-selected` event (doc/widget-events-design.md).
          { id: "echo-selected-run", widget: "antd-echo", model: "widgets.demo.echoSelectedRun", template: "default", x: 9, y: 3, w: 3, h: 2 },
          // A click is an INTENT: the reaction calls a host action by name.
          { id: "button-reset", widget: "antd-button", model: "widgets.demo.resetButton", template: "default", x: 9, y: 5, w: 3, h: 2 },
          // A controlled input: text lives at demo.name, written by the reaction.
          { id: "input-name", widget: "antd-input", model: "widgets.demo.nameInput", template: "default", x: 0, y: 10, w: 6, h: 2 },
        ],
      },
    },
    // Builder page: starts empty; widgets are added at runtime from the
    // palette, wired by their IO ports and events.
    builder: {
      default: {
        engine: "react-grid-layout",
        cells: [],
      },
    },
  },
  widgets: {
    demo: {
      label: {
        default: { text: "Wirework playground", tone: "accent" },
        loud: { text: "WIREWORK PLAYGROUND!!!", tone: "danger" },
      },
      counter: {
        default: {
          inputs: { value: "demo.counter" },
          // The counter's WRITE is a reaction: the widget emits the next
          // value, this line stores it (no output ports).
          on: { incremented: [{ set: "demo.counter", from: "value" }] },
          step: 1,
          label: "Increment",
        },
      },
      echo: {
        default: { inputs: { value: "demo.counter" }, label: "Counter value" },
      },
      echoAll: {
        // Binds to the PARENT path — proves descendant-write notification.
        default: { inputs: { value: "demo" }, label: "Demo state" },
      },
      echoSelectedRun: {
        default: { inputs: { value: "runs.selected" }, label: "Selected run" },
      },
      nameInput: {
        default: {
          inputs: { value: "demo.name" },
          on: { changed: [{ set: "demo.name", from: "value" }] },
          label: "Your name",
          placeholder: "type a name",
          validation: "required",
        },
      },
      resetButton: {
        default: {
          label: "Reset counter",
          // `call`: anything beyond a store write is host code, picked by name.
          on: { clicked: [{ call: "reset-counter" }] },
        },
      },
      runsPagination: {
        default: {
          inputs: { page: "runs.page", total: "runs.total", pageSize: "runs.pageSize" },
          // In order, each awaited: store what the user asked for, then
          // request that page (the action writes runs.data and runs.total).
          on: {
            changed: [
              { set: "runs.page", from: "page" },
              { set: "runs.pageSize", from: "pageSize" },
              { call: "runs/load-page" },
            ],
          },
        },
      },
      runsRefresher: {
        default: {
          // The schedule { enabled, interval } lives at runs.autoRefresh;
          // while runs.loading is true the button spins and ticks are skipped.
          inputs: { schedule: "runs.autoRefresh", busy: "runs.loading" },
          on: {
            changed: [{ set: "runs.autoRefresh" }],
            // Re-request the page on screen (runs.page, runs.pageSize).
            refresh: [{ call: "runs/load-page" }],
          },
        },
      },
      table: {
        default: {
          inputs: { data: "runs.data", loading: "runs.loading" },
          columns: [
            { name: "#", property: "id" },
            { name: "Name", property: "name" },
            { name: "Reference", property: "reference" },
            { name: "Status", property: "status.state" },
          ],
        },
      },
    },
  },
};

/**
 * Failure-path fixture: every cell of page "broken" is wrong in a different
 * way. Self-contained (own widget templates). For engine tests and hosts
 * demonstrating loud failures; NOT part of the playground.
 */
export const failurePathViewModels: ViewModels = {
  pages: {
    broken: {
      default: {
        engine: "flex-rows",
        rows: [
          [
            // 1. widget type nobody registered
            { id: "ghost", widget: "ghost-widget", model: "widgets.demo.label", template: "default", width: "m-4/12" },
            // 2. model path pointing nowhere
            { id: "dangling", widget: "antd-label", model: "widgets.nowhere.label", template: "default", width: "m-4/12" },
            // 3. template that fails the widget's validator
            { id: "bad-template", widget: "antd-label", model: "widgets.demo.badLabel", template: "default", width: "m-4/12" },
          ],
          [
            // 4. widget that throws during render — isolated by the boundary
            { id: "crash", widget: "antd-crash", model: "widgets.demo.crash", template: "default", width: "m-6/12" },
            // 5. healthy neighbour proving isolation
            { id: "healthy", widget: "antd-label", model: "widgets.demo.label", template: "default", width: "m-6/12" },
          ],
          [
            // 6. requested template missing -> REPORTED fallback to "default"
            { id: "fallback-label", widget: "antd-label", model: "widgets.demo.label", template: "nope", width: "m-6/12" },
            // 7. requested template missing and NO "default" -> problem
            { id: "orphan", widget: "antd-label", model: "widgets.demo.orphan", template: "nope", width: "m-6/12" },
          ],
          [
            // 8. reaction to an event the widget never declares -> problem
            { id: "bad-reaction", widget: "antd-counter", model: "widgets.demo.badReaction", template: "default", width: "m-6/12" },
            // 9. required event with no reaction bound -> problem
            { id: "unreacted", widget: "antd-counter", model: "widgets.demo.unreacted", template: "default", width: "m-6/12" },
            // 10. reaction calling an action nobody registered -> problem
            { id: "bad-action", widget: "antd-button", model: "widgets.demo.badAction", template: "default", width: "m-6/12" },
          ],
        ],
      },
    },
  },
  widgets: {
    demo: {
      label: {
        default: { text: "Wirework playground", tone: "accent" },
      },
      counter: {
        default: {
          inputs: { value: "demo.counter" },
          on: { incremented: [{ set: "demo.counter", from: "value" }] },
        },
      },
      badLabel: {
        // antd-label requires `text: string` — this must fail validation
        default: { text: 42 },
      },
      orphan: {
        // deliberately has NO "default" template
        special: { text: "orphan" },
      },
      crash: {
        default: { message: "playground intentional crash" },
      },
      badReaction: {
        // antd-counter declares only `incremented` — `nope` must be rejected
        default: {
          inputs: { value: "demo.counter" },
          on: { nope: [{ set: "demo.never" }] },
        },
      },
      unreacted: {
        // `incremented` is REQUIRED — a template without a reaction is reported
        default: { inputs: { value: "demo.counter" } },
      },
      badAction: {
        // no host registers "nope" — reported at boot, logged (not thrown) at runtime
        default: { label: "Nope", on: { clicked: [{ call: "nope" }] } },
      },
    },
  },
};

/** User overlay: proves per-CELL template selection + settings merge on top. */
export const userViewModels: UserViewModels = {
  pages: {
    demo: {
      cells: {
        "label-main": {
          view: "loud",
          settings: {
            loud: { tone: "success" },
          },
        },
      },
    },
  },
};

/** Seed data — rows keyed by stable run id, order separate. */
export const seedData: { demo: { counter: number }; runs: { data: RunsData } } = {
  demo: { counter: 0 },
  runs: {
    data: {
      order: ["123456", "123457", "123458", "123459", "123460", "123461"],
      byId: {
        "123456": {
          id: "123456",
          name: "E2E Run # 98765",
          reference: "REF55456735",
          inbound: "IND539363",
          status: { state: "Failed", message: "ERROR ..." },
        },
        "123457": {
          id: "123457",
          name: "E2E Run # 98766",
          reference: "REF59456736",
          inbound: "IND557328",
          status: { state: "Success", message: "Finished" },
        },
        "123458": {
          id: "123458",
          name: "E2E Run # 98767",
          reference: "REF59456737",
          inbound: "IND557329",
          status: { state: "Running", message: "Step 3 of 7" },
        },
        "123459": {
          id: "123459",
          name: "Nightly regression",
          reference: "REF59456738",
          inbound: "IND557330",
          status: { state: "Success", message: "Finished" },
        },
        "123460": {
          id: "123460",
          name: "Smoke suite",
          reference: "REF59456739",
          inbound: "IND557331",
          status: { state: "Failed", message: "2 assertions failed" },
        },
        "123461": {
          id: "123461",
          name: "Migration check",
          reference: "REF59456740",
          inbound: "IND557332",
          status: { state: "Queued", message: "Waiting for a runner" },
        },
      },
    },
  },
};
