/**
 * @wirework/view-data-models-examples — example view models, user overlays
 * and data modelled on the Xsight sketch.
 *
 * The DEMO is a small multi-page application ("test runs"): an overview, the
 * runs list, one run's details and the user's settings. A host (the
 * playground) keeps the application's configuration and its GLOBAL state
 * (`demoAppState`: who the user is, what they may do, their settings, lists
 * every page needs) for as long as the user stays in the application, and
 * starts every page VISIT from that page's own data (`demoPageData`) —
 * nothing of another page, and no server data. The BUILDER is a separate,
 * single, empty page.
 *
 * `failurePathViewModels` is a separate, deliberately broken tree for
 * exercising the engine's failure modes (problem placeholders, fallbacks,
 * crash isolation, boot validation) — resolved cell by cell in the engine's
 * unit tests, not loaded by the playground.
 *
 * Contract proof: depends on @wirework/schema ONLY — a view/data model is
 * plain data. Every cell carries a stable `id` (identity is never
 * positional). The playground pages use the "react-grid-layout" engine;
 * the failure-path page uses "flex-rows".
 */
import type { UserViewModels, ViewModels } from "@wirework/schema";

/**
 * Builder page: starts EMPTY — no cells, no widget templates, no data.
 * Widgets are added at runtime from the palette, wired by their IO ports
 * and events; the store fills up only with what they write.
 */
export const builderViewModels: ViewModels = {
  pages: { builder: { default: { engine: "react-grid-layout", cells: [] } } },
  widgets: {},
};

/** The demo application's pages, in menu order. "run" is reached from the runs list, not the menu. */
export const DEMO_PAGES = ["overview", "runs", "run", "settings"] as const;
export type DemoPage = (typeof DEMO_PAGES)[number];

/**
 * The demo application. Widget templates are grouped by the page that uses
 * them (`widgets.<page>.*`). Every layout is already vertically compact:
 * react-grid-layout will not move anything on mount, so an edit session
 * starts from exactly what is written here.
 */
export const demoViewModels: ViewModels = {
  pages: {
    /** Landing page: widgets talking through the store, plus what the GLOBAL state knows. */
    overview: {
      default: {
        engine: "react-grid-layout",
        cells: [
          { id: "label-main", widget: "antd-label", model: "widgets.overview.title", template: "default", x: 0, y: 0, w: 12, h: 1 },
          { id: "counter-main", widget: "antd-counter", model: "widgets.overview.counter", template: "default", x: 0, y: 1, w: 6, h: 2 },
          { id: "echo-counter", widget: "antd-echo", model: "widgets.overview.echo", template: "default", x: 6, y: 1, w: 3, h: 2 },
          { id: "echo-demo", widget: "antd-echo", model: "widgets.overview.echoAll", template: "default", x: 9, y: 1, w: 3, h: 2 },
          // A click is an INTENT: the reaction calls a host action by name.
          { id: "button-reset", widget: "antd-button", model: "widgets.overview.resetButton", template: "default", x: 0, y: 3, w: 3, h: 2 },
          // GLOBAL state: the name typed on the Settings page, the user the
          // application signed in (a mock call when the application starts).
          { id: "label-welcome", widget: "antd-label", model: "widgets.overview.welcome", template: "default", x: 3, y: 3, w: 6, h: 1 },
          { id: "tag-role", widget: "antd-tag", model: "widgets.overview.role", template: "default", x: 9, y: 3, w: 3, h: 1 },
          { id: "label-user", widget: "antd-label", model: "widgets.overview.user", template: "default", x: 3, y: 4, w: 6, h: 1 },
        ],
      },
    },
    /** The runs list: server-side paging, refresh, dependent filters, a row opened by a button. */
    runs: {
      default: {
        engine: "react-grid-layout",
        cells: [
          // Refresh by hand or on a timer: `refresh` CALLS the same host
          // action the pagination uses.
          { id: "refresher-runs", widget: "antd-refresher", model: "widgets.runs.refresher", template: "default", x: 0, y: 0, w: 9, h: 1 },
          // The filters the SERVER offers for its table (and what this page
          // changed about them): nobody wrote them into this page.
          { id: "filters-runs", widget: "antd-filter-bar", model: "widgets.runs.filterBar", template: "default", x: 0, y: 1, w: 9, h: 2 },
          // A table the server DESCRIBES: no columns here, they come with
          // the first answer (@wirework/table-view).
          { id: "table-main", widget: "antd-table", model: "widgets.runs.table", template: "default", x: 0, y: 3, w: 9, h: 5 },
          // Server-side paging: a page change re-requests the table view.
          { id: "pagination-runs", widget: "antd-pagination", model: "widgets.runs.pagination", template: "default", x: 0, y: 8, w: 9, h: 1 },
          // Empty until a request fails; the last good rows stay.
          { id: "label-runs-error", widget: "antd-label", model: "widgets.runs.error", template: "default", x: 0, y: 9, w: 9, h: 1 },
          // Dependent filters: the suites on offer follow the applications
          // chosen — a reaction CALLS the host action that computes them.
          // The applications on offer are a GLOBAL list (app.lists).
          { id: "filter-applications", widget: "antd-multi-select", model: "widgets.runs.applicationsFilter", template: "default", x: 9, y: 0, w: 3, h: 2 },
          { id: "filter-suites", widget: "antd-multi-select", model: "widgets.runs.suitesFilter", template: "default", x: 9, y: 2, w: 3, h: 2 },
          // Displays the run the HOST wrote to "runs.selected" in reaction
          // to the table's `row-selected` event (doc/widget-events-design.md).
          { id: "echo-selected-run", widget: "antd-echo", model: "widgets.runs.echoSelectedRun", template: "default", x: 9, y: 4, w: 3, h: 2 },
          // Opens the selected run's page: the action reads runs.selected
          // and asks the host's router for /demo/runs/<id>.
          { id: "button-open-run", widget: "antd-button", model: "widgets.runs.openRun", template: "default", x: 9, y: 6, w: 3, h: 2 },
        ],
      },
    },
    /** One run. Which one came through the ROUTER: the host puts the URL's parameters at `route`. */
    run: {
      default: {
        engine: "react-grid-layout",
        cells: [
          { id: "label-run-name", widget: "antd-label", model: "widgets.run.name", template: "default", x: 0, y: 0, w: 9, h: 1 },
          { id: "button-back", widget: "antd-button", model: "widgets.run.back", template: "default", x: 9, y: 0, w: 3, h: 2 },
          // An application-defined widget (status-badge) next to standard ones.
          { id: "status-run", widget: "status-badge", model: "widgets.run.status", template: "default", x: 0, y: 1, w: 3, h: 1 },
          { id: "tag-run-reference", widget: "antd-tag", model: "widgets.run.reference", template: "default", x: 3, y: 1, w: 3, h: 1 },
          { id: "label-run-message", widget: "antd-label", model: "widgets.run.message", template: "default", x: 6, y: 1, w: 3, h: 1 },
          // Empty until the server says there is no such run.
          { id: "label-run-error", widget: "antd-label", model: "widgets.run.error", template: "default", x: 0, y: 2, w: 9, h: 1 },
          { id: "echo-route", widget: "antd-echo", model: "widgets.run.route", template: "default", x: 0, y: 3, w: 9, h: 1 },
        ],
      },
    },
    /** The user's settings: written to GLOBAL state, so every other page sees them. */
    settings: {
      default: {
        engine: "react-grid-layout",
        cells: [
          { id: "label-settings", widget: "antd-label", model: "widgets.settings.title", template: "default", x: 0, y: 0, w: 12, h: 1 },
          // A controlled input: the text lives at app.settings.displayName, written by the reaction.
          { id: "input-name", widget: "antd-input", model: "widgets.settings.nameInput", template: "default", x: 0, y: 1, w: 6, h: 2 },
          { id: "select-page-size", widget: "antd-select", model: "widgets.settings.pageSize", template: "default", x: 6, y: 1, w: 3, h: 2 },
          { id: "checkbox-auto-refresh", widget: "antd-checkbox", model: "widgets.settings.autoRefresh", template: "default", x: 9, y: 1, w: 3, h: 2 },
          { id: "echo-settings", widget: "antd-echo", model: "widgets.settings.echoSettings", template: "default", x: 0, y: 3, w: 6, h: 2 },
          { id: "echo-permissions", widget: "antd-echo", model: "widgets.settings.echoPermissions", template: "default", x: 6, y: 3, w: 6, h: 2 },
        ],
      },
    },
  },
  // The PAGES' own reactions: what a page does when it loads. Beside the
  // templates — they hold for every template of the page, and a user's own
  // copy of a template never carries reactions. The runs page needs none:
  // its TABLE asks for its data when it appears (widgets.runs.table, `load`).
  on: {
    overview: { load: [{ call: "overview/load" }] },
    // Which run: the router's parameter, which the host put at route.params.runId.
    run: { load: [{ call: "run/load" }] },
  },
  widgets: {
    overview: {
      title: {
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
      resetButton: {
        default: {
          label: "Reset counter",
          // `call`: anything beyond a store write is host code, picked by name.
          on: { clicked: [{ call: "reset-counter" }] },
        },
      },
      welcome: {
        default: {
          inputs: { text: "app.settings.displayName" },
          text: "Tell us your name on the Settings page",
        },
      },
      user: {
        default: { inputs: { text: "app.user.name" }, text: "Signing in…", tone: "muted" },
      },
      role: {
        default: { inputs: { text: "app.user.role" }, text: "role", tone: "info" },
      },
    },
    runs: {
      refresher: {
        default: {
          // The schedule { enabled, interval } lives at runs.autoRefresh;
          // while runs.loading is true the button spins and ticks are skipped.
          inputs: { schedule: "runs.autoRefresh", busy: "runs.loading" },
          on: {
            changed: [{ set: "runs.autoRefresh" }],
            // Re-request the table view as it is on screen (page, filters).
            refresh: [{ call: "table-view/load", with: { into: "runs" } }],
          },
        },
      },
      filterBar: {
        default: {
          // Which filters there are is DATA (runs.filters, from the server's
          // metadata); what is chosen goes into the request as `filterIn`.
          inputs: { filters: "runs.filters", value: "runs.filterIn" },
          // In order: store the choice, go back to the first page (the
          // table just got shorter), THEN re-request.
          on: {
            changed: [
              { set: "runs.filterIn", from: "value" },
              { set: "runs.page", value: 1 },
              { call: "table-view/load", with: { into: "runs" } },
            ],
          },
          placeholder: "any",
        },
      },
      table: {
        default: {
          // A table the server describes: rows AND columns are store paths,
          // both written by table-view/load. Keyed by each row's `id` (the
          // default rowKey).
          inputs: { rows: "runs.data", loading: "runs.loading", columns: "runs.columns" },
          // When the table appears it asks for its data: `load` DECLARES the
          // table view (@wirework/table-view). The URL is all the action
          // needs; the rest is what THIS page wants different from the
          // server's description:
          //  - the server shows `inbound` and offers a filter for it — not here;
          //  - the server offers no values for `name` — this page filters by
          //    three suites of its own choice;
          //  - `message` stays hidden because the SERVER hides it;
          //  - the server describes DATA, never looks: the `#` and Name cells
          //    are links to the run (the `{id}` slot selects the row's id),
          //    the Status cells tags in a tone per state — predefined kinds,
          //    no code (a cell the host renders by name would be
          //    `cell: { kind: "custom", name: "run-status" }`).
          // A plain click on a link emits `link-clicked`; nav/follow goes there.
          // Every other reaction of the page only names the view: { into: "runs" }.
          on: {
            load: [
              {
                call: "table-view/load",
                with: {
                  url: "/api/v1/view/runs",
                  into: "runs",
                  // The request's `metadata` flag: this first answer DESCRIBES the
                  // table. The page's other calls leave it out — rows only.
                  metadata: true,
                  pageSize: 5,
                  columns: {
                    inbound: { hidden: true },
                    id: { cell: { kind: "link", to: "/demo/runs/{id}" } },
                    name: { cell: { kind: "link", to: "/demo/runs/{id}" } },
                    state: {
                      cell: { kind: "tag", tones: { Success: "success", Failed: "danger", Running: "info", Queued: "default" } },
                    },
                  },
                  filters: {
                    inbound: false,
                    name: { label: "Suite", values: ["Nightly regression", "Smoke suite", "Migration check"] },
                  },
                },
              },
            ],
            "link-clicked": [{ call: "nav/follow" }],
          },
        },
      },
      pagination: {
        default: {
          inputs: { page: "runs.page", total: "runs.total", pageSize: "runs.pageSize" },
          // In order, each awaited: store what the user asked for, then
          // re-request (the action writes runs.data and runs.total).
          on: {
            changed: [
              { set: "runs.page", from: "page" },
              { set: "runs.pageSize", from: "pageSize" },
              { call: "table-view/load", with: { into: "runs" } },
            ],
          },
        },
      },
      error: {
        default: { inputs: { text: "runs.error" }, text: "", tone: "danger" },
      },
      applicationsFilter: {
        default: {
          inputs: { value: "filters.applications", options: "app.lists.applications" },
          // In order: store the choice, THEN recompute what the suites filter
          // offers (and drop chosen suites of applications no longer chosen).
          on: {
            changed: [{ set: "filters.applications", from: "value" }, { call: "filters/sync-suites" }],
          },
          label: "Applications",
          placeholder: "choose applications",
        },
      },
      suitesFilter: {
        default: {
          // Its options are WRITTEN by filters/sync-suites, not configured here.
          inputs: { value: "filters.suites", options: "filters.suiteOptions" },
          on: { changed: [{ set: "filters.suites", from: "value" }] },
          label: "Test suites",
          placeholder: "choose applications first",
        },
      },
      echoSelectedRun: {
        default: { inputs: { value: "runs.selected" }, label: "Selected run" },
      },
      openRun: {
        default: { label: "Open run", on: { clicked: [{ call: "runs/open-selected" }] } },
      },
    },
    run: {
      name: {
        default: { inputs: { text: "run.data.name" }, text: "Loading the run…", tone: "accent" },
      },
      back: {
        default: { label: "Back to runs", on: { clicked: [{ call: "nav/go", with: { to: "/demo/runs" } }] } },
      },
      status: {
        default: { inputs: { state: "run.data.status.state" }, prefix: "Status: " },
      },
      reference: {
        default: { inputs: { text: "run.data.reference" }, text: "reference", tone: "info" },
      },
      message: {
        default: { inputs: { text: "run.data.status.message" }, text: "…", tone: "muted" },
      },
      error: {
        default: { inputs: { text: "run.error" }, text: "", tone: "danger" },
      },
      route: {
        default: { inputs: { value: "route" }, label: "Route (from the URL)" },
      },
    },
    settings: {
      title: {
        default: { text: "Your settings — global state: every page sees them", tone: "accent" },
      },
      nameInput: {
        default: {
          inputs: { value: "app.settings.displayName" },
          on: { changed: [{ set: "app.settings.displayName", from: "value" }] },
          label: "Your name",
          placeholder: "type a name",
          validation: "required",
        },
      },
      pageSize: {
        default: {
          inputs: { value: "app.settings.pageSize" },
          on: { changed: [{ set: "app.settings.pageSize", from: "value" }] },
          label: "Runs per page",
          options: [{ value: "5" }, { value: "10" }, { value: "20" }],
          allowClear: false,
        },
      },
      autoRefresh: {
        default: {
          inputs: { checked: "app.settings.autoRefresh" },
          on: { changed: [{ set: "app.settings.autoRefresh", from: "checked" }] },
          label: "Auto-refresh the runs list",
        },
      },
      echoSettings: {
        default: { inputs: { value: "app.settings" }, label: "app.settings (global)" },
      },
      echoPermissions: {
        default: { inputs: { value: "app.permissions" }, label: "app.permissions (global)" },
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


/** The user's overlay of the demo application: proves per-CELL template selection + settings merge on top. */
export const demoUserViewModels: UserViewModels = {
  pages: {
    overview: {
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

/**
 * The example domain: a test run. Plain data — no widget knows this shape;
 * the demo's generic table shows runs through its configured columns, and
 * identifies each row by its `id`.
 */
export interface RunStatus {
  state: "Success" | "Failed" | (string & {});
  message: string;
}

export interface Run {
  /** Stable identity — the table's row key (never the row's position). */
  id: string;
  name: string;
  reference: string;
  inbound: string;
  status: RunStatus;
}


/** What the user may do. Arrives with the session, like the user. */
export interface Permissions {
  /** May change pages ("Edit page"): layouts, widget settings, removals. */
  editPages: boolean;
}

/** The user's own settings. Strings and booleans as the form widgets hold them. */
export interface UserSettings {
  /** Absent until the user types one: the overview's welcome label then shows its own text. */
  displayName?: string;
  /** Rows per page of the runs list — a select's value, hence text. */
  pageSize: string;
  autoRefresh: boolean;
}

/**
 * The GLOBAL state the application starts with: the settings and nothing
 * else. The user, the permissions and the lists every page needs are NOT
 * here — they reach the store when the (fake) session request answers.
 */
export const demoAppState: { app: { settings: UserSettings } } = {
  app: { settings: { pageSize: "5", autoRefresh: false } },
};

/** What the fake session request answers with (the lists come from the host's catalog). */
export const sampleSession: { user: { name: string; role: string }; permissions: Permissions } = {
  user: { name: "Alex Tester", role: "QA engineer" },
  permissions: { editPages: true },
};

/**
 * The DATA each page's visit starts with. Server data is deliberately NOT
 * here: runs, one run and the overview's numbers reach the store only when
 * the (fake) server answers.
 */
export const demoPageData: Record<DemoPage, Record<string, unknown>> = {
  overview: { demo: { counter: 0 } },
  // Nothing chosen yet, so no suites on offer.
  runs: { filters: { applications: [], suiteOptions: [], suites: [] } },
  run: {},
  settings: {},
};

/**
 * What a fake runs SERVER starts with — server-side data, never put into a
 * store directly. Plain rows, each keyed by its stable id.
 */
export const sampleRuns: Run[] = [
  {
    id: "123456",
    name: "E2E Run # 98765",
    reference: "REF55456735",
    inbound: "IND539363",
    status: { state: "Failed", message: "ERROR ..." },
  },
  {
    id: "123457",
    name: "E2E Run # 98766",
    reference: "REF59456736",
    inbound: "IND557328",
    status: { state: "Success", message: "Finished" },
  },
  {
    id: "123458",
    name: "E2E Run # 98767",
    reference: "REF59456737",
    inbound: "IND557329",
    status: { state: "Running", message: "Step 3 of 7" },
  },
  {
    id: "123459",
    name: "Nightly regression",
    reference: "REF59456738",
    inbound: "IND557330",
    status: { state: "Success", message: "Finished" },
  },
  {
    id: "123460",
    name: "Smoke suite",
    reference: "REF59456739",
    inbound: "IND557331",
    status: { state: "Failed", message: "2 assertions failed" },
  },
  {
    id: "123461",
    name: "Migration check",
    reference: "REF59456740",
    inbound: "IND557332",
    status: { state: "Queued", message: "Waiting for a runner" },
  },
];
