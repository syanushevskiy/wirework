/**
 * @wirework/view-data-models-examples — example view models, user overlays
 * and seed data modelled on the Xsight sketch. Hosts (the playground,
 * tests) boot from `viewModels`; `failurePathViewModels` is a separate,
 * deliberately broken tree for exercising the engine's failure modes
 * (problem placeholders, fallbacks, crash isolation, boot validation) —
 * not loaded by the playground.
 *
 * Contract proof: depends on @wirework/schema ONLY — a view/data model is
 * plain data. Every cell carries a stable `id` (identity is never
 * positional). Pages use the default "react-grid-layout" engine.
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
          { id: "label-main", widget: "dummy-label", model: "widgets.demo.label", template: "default", x: 0, y: 0, w: 12, h: 1 },
          { id: "counter-main", widget: "dummy-counter", model: "widgets.demo.counter", template: "default", x: 0, y: 1, w: 6, h: 2 },
          { id: "echo-counter", widget: "dummy-echo", model: "widgets.demo.echo", template: "default", x: 6, y: 1, w: 3, h: 2 },
          { id: "echo-demo", widget: "dummy-echo", model: "widgets.demo.echoAll", template: "default", x: 9, y: 1, w: 3, h: 2 },
          { id: "table-main", widget: "dummy-runs-table", model: "widgets.demo.table", template: "default", x: 0, y: 3, w: 9, h: 4 },
          // Displays the run the HOST wrote to "runs.selected" in reaction
          // to the table's `row-selected` event (doc/widget-events-design.md).
          { id: "echo-selected-run", widget: "dummy-echo", model: "widgets.demo.echoSelectedRun", template: "default", x: 9, y: 3, w: 3, h: 2 },
          // A click is an INTENT: the reaction calls a host action by name.
          { id: "button-reset", widget: "dummy-button", model: "widgets.demo.resetButton", template: "default", x: 9, y: 5, w: 3, h: 2 },
          // A controlled input: text lives at demo.name, written by the reaction.
          { id: "input-name", widget: "dummy-input", model: "widgets.demo.nameInput", template: "default", x: 0, y: 7, w: 6, h: 2 },
        ],
      },
    },
    // Builder page: starts empty; widgets are added at runtime from the
    // dropdown, wired by their IO ports and events.
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
      table: {
        default: {
          inputs: { data: "runs.data" },
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
            { id: "dangling", widget: "dummy-label", model: "widgets.nowhere.label", template: "default", width: "m-4/12" },
            // 3. template that fails the widget's validator
            { id: "bad-template", widget: "dummy-label", model: "widgets.demo.badLabel", template: "default", width: "m-4/12" },
          ],
          [
            // 4. widget that throws during render — isolated by the boundary
            { id: "crash", widget: "dummy-crash", model: "widgets.demo.crash", template: "default", width: "m-6/12" },
            // 5. healthy neighbour proving isolation
            { id: "healthy", widget: "dummy-label", model: "widgets.demo.label", template: "default", width: "m-6/12" },
          ],
          [
            // 6. requested template missing -> REPORTED fallback to "default"
            { id: "fallback-label", widget: "dummy-label", model: "widgets.demo.label", template: "nope", width: "m-6/12" },
            // 7. requested template missing and NO "default" -> problem
            { id: "orphan", widget: "dummy-label", model: "widgets.demo.orphan", template: "nope", width: "m-6/12" },
          ],
          [
            // 8. reaction to an event the widget never declares -> problem
            { id: "bad-reaction", widget: "dummy-counter", model: "widgets.demo.badReaction", template: "default", width: "m-6/12" },
            // 9. required event with no reaction bound -> problem
            { id: "unreacted", widget: "dummy-counter", model: "widgets.demo.unreacted", template: "default", width: "m-6/12" },
            // 10. reaction calling an action nobody registered -> problem
            { id: "bad-action", widget: "dummy-button", model: "widgets.demo.badAction", template: "default", width: "m-6/12" },
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
        // dummy-label requires `text: string` — this must fail validation
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
        // dummy-counter declares only `incremented` — `nope` must be rejected
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
      order: ["123456", "123457"],
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
      },
    },
  },
};
