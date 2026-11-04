/**
 * @wirework/view-data-models-examples — example view models, user overlays
 * and data modelled on the Xsight sketch.
 *
 * The DEMO is a small multi-page application ("test runs"): an overview, the
 * runs list, the same runs as an infinite list (history), one run's details,
 * the user's settings and a page of two cards. A host (the
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
 * positional). The playground pages use the "react-grid-layout" engine —
 * the cards page "flexlayout", with a grid and "flex-rows"
 * (doc/flex-rows-design.md) inside its cards; the failure-path page uses
 * "flex-rows".
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
export const DEMO_PAGES = ["overview", "runs", "history", "run", "settings", "cards"] as const;
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
          {
            id: "label-main",
            widget: "antd-label",
            model: "widgets.overview.title",
            template: "default",
            x: 0,
            y: 0,
            w: 12,
            h: 1,
          },
          {
            id: "counter-main",
            widget: "antd-counter",
            model: "widgets.overview.counter",
            template: "default",
            x: 0,
            y: 1,
            w: 6,
            h: 2,
          },
          {
            id: "echo-counter",
            widget: "antd-echo",
            model: "widgets.overview.echo",
            template: "default",
            x: 6,
            y: 1,
            w: 3,
            h: 2,
          },
          {
            id: "echo-demo",
            widget: "antd-echo",
            model: "widgets.overview.echoAll",
            template: "default",
            x: 9,
            y: 1,
            w: 3,
            h: 2,
          },
          // A click is an INTENT: the reaction calls a host action by name.
          {
            id: "button-reset",
            widget: "antd-button",
            model: "widgets.overview.resetButton",
            template: "default",
            x: 0,
            y: 3,
            w: 3,
            h: 2,
          },
          // GLOBAL state: the name typed on the Settings page, the user the
          // application signed in (a mock call when the application starts).
          {
            id: "label-welcome",
            widget: "antd-label",
            model: "widgets.overview.welcome",
            template: "default",
            x: 3,
            y: 3,
            w: 6,
            h: 1,
          },
          {
            id: "tag-role",
            widget: "antd-tag",
            model: "widgets.overview.role",
            template: "default",
            x: 9,
            y: 3,
            w: 3,
            h: 1,
          },
          {
            id: "label-user",
            widget: "antd-label",
            model: "widgets.overview.user",
            template: "default",
            x: 3,
            y: 4,
            w: 6,
            h: 1,
          },
        ],
      },
      /**
       * A second PREBUILT view of the same page (doc/page-views-design.md):
       * the title and the counter only. The user picks it from the view
       * list, where it is labelled as prebuilt, like "default".
       */
      compact: {
        engine: "react-grid-layout",
        cells: [
          {
            id: "label-main",
            widget: "antd-label",
            model: "widgets.overview.title",
            template: "default",
            x: 0,
            y: 0,
            w: 12,
            h: 1,
          },
          {
            id: "counter-main",
            widget: "antd-counter",
            model: "widgets.overview.counter",
            template: "default",
            x: 0,
            y: 1,
            w: 6,
            h: 2,
          },
          {
            id: "echo-counter",
            widget: "antd-echo",
            model: "widgets.overview.echo",
            template: "default",
            x: 6,
            y: 1,
            w: 6,
            h: 2,
          },
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
          {
            id: "refresher-runs",
            widget: "antd-refresher",
            model: "widgets.runs.refresher",
            template: "default",
            x: 0,
            y: 0,
            w: 9,
            h: 1,
          },
          // The filters the SERVER offers for its table (and what this page
          // changed about them): nobody wrote them into this page.
          {
            id: "filters-runs",
            widget: "antd-filter-bar",
            model: "widgets.runs.filterBar",
            template: "default",
            x: 0,
            y: 1,
            w: 9,
            h: 2,
          },
          // A table the server DESCRIBES: no columns here, they come with
          // the first answer (@wirework/table-view).
          {
            id: "table-main",
            widget: "antd-table",
            model: "widgets.runs.table",
            template: "default",
            x: 0,
            y: 3,
            w: 9,
            h: 5,
          },
          // Server-side paging: a page change re-requests the table view.
          {
            id: "pagination-runs",
            widget: "antd-pagination",
            model: "widgets.runs.pagination",
            template: "default",
            x: 0,
            y: 8,
            w: 9,
            h: 1,
          },
          // Empty until a request fails; the last good rows stay.
          {
            id: "label-runs-error",
            widget: "antd-label",
            model: "widgets.runs.error",
            template: "default",
            x: 0,
            y: 9,
            w: 9,
            h: 1,
          },
          // Dependent filters: the suites on offer follow the applications
          // chosen — a reaction CALLS the host action that computes them.
          // The applications on offer are a GLOBAL list (app.lists).
          {
            id: "filter-applications",
            widget: "antd-multi-select",
            model: "widgets.runs.applicationsFilter",
            template: "default",
            x: 9,
            y: 0,
            w: 3,
            h: 2,
          },
          {
            id: "filter-suites",
            widget: "antd-multi-select",
            model: "widgets.runs.suitesFilter",
            template: "default",
            x: 9,
            y: 2,
            w: 3,
            h: 2,
          },
          // Displays the run the HOST wrote to "runs.selected" in reaction
          // to the table's `row-selected` event (doc/widget-events-design.md).
          {
            id: "echo-selected-run",
            widget: "antd-echo",
            model: "widgets.runs.echoSelectedRun",
            template: "default",
            x: 9,
            y: 4,
            w: 3,
            h: 2,
          },
          // Opens the selected run's page: the action reads runs.selected
          // and asks the host's router for /demo/runs/<id>. Its template
          // SHOWS it only while a run is selected (`when`).
          {
            id: "button-open-run",
            widget: "antd-button",
            model: "widgets.runs.openRun",
            template: "default",
            x: 9,
            y: 6,
            w: 3,
            h: 2,
          },
        ],
      },
    },
    /** The same runs as an INFINITE list: it grows as the user scrolls, and its filters and sorting live in the column headers. */
    history: {
      default: {
        engine: "react-grid-layout",
        cells: [
          {
            id: "label-history",
            widget: "antd-label",
            model: "widgets.history.title",
            template: "default",
            x: 0,
            y: 0,
            w: 12,
            h: 1,
          },
          // A table the server DESCRIBES, as on the runs page — but one
          // widget does it all: no filter bar, no pagination beside it.
          {
            id: "table-history",
            widget: "antd-infinite-table",
            model: "widgets.history.table",
            template: "default",
            x: 0,
            y: 1,
            w: 12,
            h: 10,
          },
          {
            id: "label-history-error",
            widget: "antd-label",
            model: "widgets.history.error",
            template: "default",
            x: 0,
            y: 11,
            w: 12,
            h: 1,
          },
        ],
      },
    },
    /** One run. Which one came through the ROUTER: the host puts the URL's parameters at `route`. */
    run: {
      default: {
        engine: "react-grid-layout",
        cells: [
          {
            id: "label-run-name",
            widget: "antd-label",
            model: "widgets.run.name",
            template: "default",
            x: 0,
            y: 0,
            w: 9,
            h: 1,
          },
          {
            id: "button-back",
            widget: "antd-button",
            model: "widgets.run.back",
            template: "default",
            x: 9,
            y: 0,
            w: 3,
            h: 2,
          },
          // An application-defined widget (status-badge) next to standard ones.
          {
            id: "status-run",
            widget: "status-badge",
            model: "widgets.run.status",
            template: "default",
            x: 0,
            y: 1,
            w: 3,
            h: 1,
          },
          {
            id: "tag-run-reference",
            widget: "antd-tag",
            model: "widgets.run.reference",
            template: "default",
            x: 3,
            y: 1,
            w: 3,
            h: 1,
          },
          {
            id: "label-run-message",
            widget: "antd-label",
            model: "widgets.run.message",
            template: "default",
            x: 6,
            y: 1,
            w: 3,
            h: 1,
          },
          // Hidden until the server says there is no such run (`when`).
          {
            id: "label-run-error",
            widget: "antd-label",
            model: "widgets.run.error",
            template: "default",
            x: 0,
            y: 2,
            w: 9,
            h: 1,
          },
          // Shown by a predicate of the APPLICATION's own (`runs/retryable`,
          // doc/conditions-design.md): a failed run with an even id.
          {
            id: "tag-run-retry",
            widget: "antd-tag",
            model: "widgets.run.retry",
            template: "default",
            x: 9,
            y: 2,
            w: 3,
            h: 1,
          },
          {
            id: "echo-route",
            widget: "antd-echo",
            model: "widgets.run.route",
            template: "default",
            x: 0,
            y: 3,
            w: 9,
            h: 1,
          },
        ],
      },
    },
    /** The user's settings: written to GLOBAL state, so every other page sees them. */
    settings: {
      default: {
        engine: "react-grid-layout",
        cells: [
          {
            id: "label-settings",
            widget: "antd-label",
            model: "widgets.settings.title",
            template: "default",
            x: 0,
            y: 0,
            w: 12,
            h: 1,
          },
          // A CONTAINER (doc/containers-design.md): the three controls sit in
          // a card, on a layout of the card's own (widgets.settings.preferences,
          // `content`). They are controlled widgets written back by their
          // default reactions — inside a card exactly as on the page.
          {
            id: "card-preferences",
            widget: "antd-card",
            model: "widgets.settings.preferences",
            template: "default",
            x: 0,
            y: 1,
            w: 12,
            h: 3,
          },
          {
            id: "echo-settings",
            widget: "antd-echo",
            model: "widgets.settings.echoSettings",
            template: "default",
            x: 0,
            y: 3,
            w: 6,
            h: 2,
          },
          {
            id: "echo-permissions",
            widget: "antd-echo",
            model: "widgets.settings.echoPermissions",
            template: "default",
            x: 6,
            y: 3,
            w: 6,
            h: 2,
          },
        ],
      },
    },
    /**
     * Two cards side by side on FLEXLAYOUT — a docking layout, each card the
     * one tab of a tabset the user may drag and resize — each card holding a
     * layout on an engine of its own: a grid in one, FLEX ROWS in the other
     * (doc/flex-rows-design.md). Three engines on one page.
     */
    cards: {
      default: {
        engine: "flexlayout",
        cells: [
          { id: "card-counter", widget: "antd-card", model: "widgets.cards.counter", template: "default" },
          { id: "card-profile", widget: "antd-card", model: "widgets.cards.profile", template: "default" },
        ],
        model: {
          global: {},
          layout: {
            type: "row",
            children: [
              {
                type: "tabset",
                id: "counter",
                weight: 40,
                children: [{ type: "tab", id: "card-counter", name: "Counter", component: "cell" }],
              },
              {
                type: "tabset",
                id: "profile",
                weight: 60,
                children: [{ type: "tab", id: "card-profile", name: "Profile", component: "cell" }],
              },
            ],
          },
        },
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
          // value and its DEFAULT reaction (`incremented` writes back to
          // `value`) stores it at demo.counter — nothing to declare here.
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
          // A destructive action looks like one: the `danger` variant.
          variant: "danger",
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
          // A change of the schedule is written back whole by default.
          inputs: { schedule: "runs.autoRefresh", busy: "runs.loading" },
          on: {
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
          // In order: the choice is stored by the default write-back first,
          // then go back to the first page (the table just got shorter),
          // THEN re-request.
          on: {
            changed: [
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
          // default rowKey). Its HEADERS filter and sort too (headerFilters):
          // they read the same runs.filterIn the filter bar does, so a value
          // ticked in a header shows in the bar and the other way round.
          inputs: {
            rows: "runs.data",
            loading: "runs.loading",
            columns: "runs.columns",
            filterIn: "runs.filterIn",
            filterLike: "runs.filterLike",
            orderBy: "runs.orderBy",
          },
          headerFilters: true,
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
          //    no code; the Reference cells get a Copy button — a cell that
          //    ACTS, which is a renderer the HOST registered by name ("copy").
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
                    reference: { cell: { kind: "custom", name: "copy" } },
                    state: {
                      cell: {
                        kind: "tag",
                        tones: { Success: "success", Failed: "danger", Running: "info", Queued: "default" },
                      },
                    },
                  },
                  filters: {
                    inbound: false,
                    name: { label: "Suite", values: ["Nightly regression", "Smoke suite", "Migration check"] },
                  },
                },
              },
            ],
            // A header filter or sort: the bar's rule — store the choice, back to the first page, re-request.
            "filter-changed": [
              { set: "runs.filterIn", from: "filterIn" },
              { set: "runs.filterLike", from: "filterLike" },
              { set: "runs.page", value: 1 },
              { call: "table-view/load", with: { into: "runs" } },
            ],
            "sort-changed": [
              { set: "runs.orderBy", from: "orderBy" },
              { call: "table-view/load", with: { into: "runs" } },
            ],
            "link-clicked": [{ call: "nav/follow" }],
          },
        },
      },
      pagination: {
        default: {
          inputs: { page: "runs.page", total: "runs.total", pageSize: "runs.pageSize" },
          // In order, each awaited: the page is stored by the default
          // write-back first, then the page size, then re-request (the
          // action writes runs.data and runs.total).
          on: {
            changed: [
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
          // In order: the choice is stored by the default write-back, THEN
          // recompute what the suites filter offers (and drop chosen suites
          // of applications no longer chosen).
          on: { changed: [{ call: "filters/sync-suites" }] },
          label: "Applications",
          placeholder: "choose applications",
        },
      },
      suitesFilter: {
        default: {
          // Its options are WRITTEN by filters/sync-suites, not configured here.
          inputs: { value: "filters.suites", options: "filters.suiteOptions" },
          label: "Test suites",
          placeholder: "choose applications first",
        },
      },
      echoSelectedRun: {
        default: { inputs: { value: "runs.selected" }, label: "Selected run" },
      },
      openRun: {
        default: {
          label: "Open run",
          on: { clicked: [{ call: "runs/open-selected" }] },
          // Shown only while a run is selected (doc/conditions-design.md), fading in and out.
          when: [{ path: "runs.selected", is: "empty", not: true }],
          appear: "fade",
          disappear: "fade",
        },
      },
    },
    history: {
      title: {
        default: { text: "Run history — scroll for more; filter and sort in the column headers", tone: "accent" },
      },
      table: {
        default: {
          // Everything the list shows and chooses lives under ONE root, at the
          // loader's fixed places: the rows, the columns (each saying what its
          // header filters by and whether it sorts), the count — and what the
          // headers chose: filterIn, filterLike, orderBy.
          inputs: {
            rows: "history.data",
            loading: "history.loading",
            columns: "history.columns",
            total: "history.total",
            filterIn: "history.filterIn",
            filterLike: "history.filterLike",
            orderBy: "history.orderBy",
          },
          on: {
            // The same view API as the runs page; ten rows a request. The
            // server offers values for Inbound and Status and calls Name
            // filterable without values — so Name gets a SEARCH in its
            // header, nothing is overridden here.
            load: [
              {
                call: "table-view/load",
                with: {
                  url: "/api/v1/view/runs",
                  into: "history",
                  metadata: true,
                  pageSize: 10,
                  columns: {
                    id: { cell: { kind: "link", to: "/demo/runs/{id}" } },
                    name: { cell: { kind: "link", to: "/demo/runs/{id}" } },
                    state: {
                      cell: {
                        kind: "tag",
                        tones: { Success: "success", Failed: "danger", Running: "info", Queued: "default" },
                      },
                    },
                  },
                },
              },
            ],
            // The end of the list came into view: the rows after the ones held, appended.
            more: [{ call: "table-view/load", with: { into: "history", more: true } }],
            // A header filter or sort: store the whole choice, then re-request from the start.
            "filter-changed": [
              { set: "history.filterIn", from: "filterIn" },
              { set: "history.filterLike", from: "filterLike" },
              { call: "table-view/load", with: { into: "history" } },
            ],
            "sort-changed": [
              { set: "history.orderBy", from: "orderBy" },
              { call: "table-view/load", with: { into: "history" } },
            ],
            "link-clicked": [{ call: "nav/follow" }],
          },
          height: 320,
        },
      },
      error: {
        default: { inputs: { text: "history.error" }, text: "", tone: "danger" },
      },
    },
    run: {
      name: {
        default: { inputs: { text: "run.data.name" }, text: "Loading the run…", tone: "accent" },
      },
      back: {
        default: {
          label: "Back to runs",
          // A way back, not the page's main action: the `secondary` variant.
          variant: "secondary",
          on: { clicked: [{ call: "nav/go", with: { to: "/demo/runs" } }] },
        },
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
        // A CONDITION (doc/conditions-design.md): the line shows only once there is an error.
        default: {
          inputs: { text: "run.error" },
          text: "",
          tone: "danger",
          when: [{ path: "run.error", is: "empty", not: true }],
        },
      },
      retry: {
        // A check the application registered: two properties and a rule, picked by name like a standard one —
        // and an appearance the application registered ("drop", apps/playground/src/demo/install.ts).
        default: {
          text: "Retry possible",
          tone: "warning",
          when: [{ path: "run.data", is: "runs/retryable" }],
          appear: "drop",
        },
      },
      route: {
        default: { inputs: { value: "route" }, label: "Route (from the URL)" },
      },
    },
    settings: {
      title: {
        default: { text: "Your settings — global state: every page sees them", tone: "accent" },
      },
      // The card's layout lives in the card's template: three cells on a grid of its own.
      preferences: {
        default: {
          title: "Preferences",
          content: {
            engine: "react-grid-layout",
            cells: [
              // A controlled input: the text lives at app.settings.displayName, written back by its default reaction.
              {
                id: "input-name",
                widget: "antd-input",
                model: "widgets.settings.nameInput",
                template: "default",
                x: 0,
                y: 0,
                w: 6,
                h: 2,
              },
              {
                id: "select-page-size",
                widget: "antd-select",
                model: "widgets.settings.pageSize",
                template: "default",
                x: 6,
                y: 0,
                w: 3,
                h: 2,
              },
              {
                id: "checkbox-auto-refresh",
                widget: "antd-checkbox",
                model: "widgets.settings.autoRefresh",
                template: "default",
                x: 9,
                y: 0,
                w: 3,
                h: 2,
              },
            ],
          },
        },
      },
      nameInput: {
        default: {
          inputs: { value: "app.settings.displayName" },
          label: "Your name",
          placeholder: "type a name",
          validation: "required",
        },
      },
      pageSize: {
        default: {
          inputs: { value: "app.settings.pageSize" },
          label: "Runs per page",
          options: [{ value: "5" }, { value: "10" }, { value: "20" }],
          allowClear: false,
        },
      },
      autoRefresh: {
        default: {
          inputs: { checked: "app.settings.autoRefresh" },
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
    cards: {
      // A card on the GRID: a statistic, the counter that moves it, a button that resets it.
      counter: {
        default: {
          title: "Counter on a grid",
          content: {
            engine: "react-grid-layout",
            cells: [
              {
                id: "statistic-clicks",
                widget: "antd-statistic",
                model: "widgets.cards.clicks",
                template: "default",
                x: 0,
                y: 0,
                w: 6,
                h: 2,
              },
              {
                id: "counter-clicks",
                widget: "antd-counter",
                model: "widgets.cards.clicker",
                template: "default",
                x: 6,
                y: 0,
                w: 6,
                h: 2,
              },
              {
                id: "button-reset-clicks",
                widget: "antd-button",
                model: "widgets.cards.reset",
                template: "default",
                x: 0,
                y: 2,
                w: 6,
                h: 1,
              },
            ],
          },
        },
      },
      clicks: {
        default: { inputs: { value: "demo.counter" }, title: "Clicks" },
      },
      clicker: {
        default: { inputs: { value: "demo.counter" }, step: 1, label: "Click" },
      },
      reset: {
        default: { label: "Reset", variant: "secondary", on: { clicked: [{ call: "reset-counter" }] } },
      },
      // A card on FLEX ROWS: a row of three buttons of different sizes that
      // WRAPS when the card gets narrow (a row wraps by default; the first
      // button grows, the other two keep their width), the name field taking
      // the next row with the switch keeping its size beside it, the greeting
      // below.
      profile: {
        default: {
          title: "Profile in flex rows",
          content: {
            engine: "flex-rows",
            rows: [
              {
                classes: "gap-2",
                cells: [
                  {
                    id: "button-name-alice",
                    widget: "antd-button",
                    model: "widgets.cards.nameAlice",
                    template: "default",
                    classes: "basis-32 grow",
                  },
                  {
                    id: "button-name-bob",
                    widget: "antd-button",
                    model: "widgets.cards.nameBob",
                    template: "default",
                    classes: "flex-none basis-24",
                  },
                  {
                    id: "button-name-clear",
                    widget: "antd-button",
                    model: "widgets.cards.nameClear",
                    template: "default",
                    classes: "flex-none basis-20",
                  },
                ],
              },
              {
                classes: "items-end gap-2",
                cells: [
                  {
                    id: "input-profile-name",
                    widget: "antd-input",
                    model: "widgets.cards.name",
                    template: "default",
                    classes: "flex-1",
                  },
                  {
                    id: "switch-profile-refresh",
                    widget: "antd-switch",
                    model: "widgets.cards.autoRefresh",
                    template: "default",
                    classes: "shrink-0",
                  },
                ],
              },
              {
                cells: [
                  {
                    id: "label-greeting",
                    widget: "antd-label",
                    model: "widgets.cards.greeting",
                    template: "default",
                    classes: "w-full",
                  },
                ],
              },
            ],
          },
        },
      },
      // The buttons write the name the field edits: a `set` with a literal value.
      nameAlice: {
        default: { label: "Alice", on: { clicked: [{ set: "app.settings.displayName", value: "Alice" }] } },
      },
      nameBob: {
        default: {
          label: "Bob",
          variant: "secondary",
          on: { clicked: [{ set: "app.settings.displayName", value: "Bob" }] },
        },
      },
      nameClear: {
        default: {
          label: "Clear",
          variant: "dashed",
          on: { clicked: [{ set: "app.settings.displayName", value: "" }] },
        },
      },
      name: {
        default: { inputs: { value: "app.settings.displayName" }, label: "Your name", placeholder: "type a name" },
      },
      autoRefresh: {
        default: { inputs: { checked: "app.settings.autoRefresh" }, label: "Auto-refresh" },
      },
      greeting: {
        default: { inputs: { text: "app.settings.displayName" }, text: "Type a name to be greeted", tone: "muted" },
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
          {
            cells: [
              // 1. widget type nobody registered
              { id: "ghost", widget: "ghost-widget", model: "widgets.demo.label", template: "default" },
              // 2. model path pointing nowhere
              { id: "dangling", widget: "antd-label", model: "widgets.nowhere.label", template: "default" },
              // 3. template that fails the widget's validator
              { id: "bad-template", widget: "antd-label", model: "widgets.demo.badLabel", template: "default" },
            ],
          },
          {
            cells: [
              // 4. widget that throws during render — isolated by the boundary
              { id: "crash", widget: "antd-crash", model: "widgets.demo.crash", template: "default" },
              // 5. healthy neighbour proving isolation
              { id: "healthy", widget: "antd-label", model: "widgets.demo.label", template: "default" },
            ],
          },
          {
            cells: [
              // 6. requested template missing -> REPORTED fallback to "default"
              { id: "fallback-label", widget: "antd-label", model: "widgets.demo.label", template: "nope" },
              // 7. requested template missing and NO "default" -> problem
              { id: "orphan", widget: "antd-label", model: "widgets.demo.orphan", template: "nope" },
            ],
          },
          {
            cells: [
              // 8. reaction to an event the widget never declares -> problem
              { id: "bad-reaction", widget: "antd-counter", model: "widgets.demo.badReaction", template: "default" },
              // 9. required event with no reaction bound -> problem
              { id: "unreacted", widget: "antd-refresher", model: "widgets.demo.unreacted", template: "default" },
              // 10. reaction calling an action nobody registered -> problem
              { id: "bad-action", widget: "antd-button", model: "widgets.demo.badAction", template: "default" },
            ],
          },
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
        default: { inputs: { value: "demo.counter" } },
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
        // `refresh` is REQUIRED and writes nothing back by default (`changed`
        // does) — a template without a reaction to it is reported
        default: { inputs: { schedule: "demo.schedule" } },
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
  history: {},
  run: {},
  settings: {},
  cards: { demo: { counter: 0 } },
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
