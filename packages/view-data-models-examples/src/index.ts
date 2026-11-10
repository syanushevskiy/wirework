/**
 * @wirework/view-data-models-examples — the demo's data, its user overlay
 * and the test fixtures, modelled on the Xsight sketch.
 *
 * The DEMO is a small multi-page application ("test runs"): an overview, the
 * runs list, the same runs as an infinite list (history), one run's details,
 * the user's settings, a page of three cards and a page of one card
 * showing how roles work. Its PAGES — their layouts, reactions, roles'
 * entries and widget templates — are NOT here: each is a folder of the
 * host's own source (`apps/playground/src/pages/<page>/`, one JSON file for
 * the page, its view model and its widgets; doc/pages-as-code-design.md),
 * which the store gets when the page opens. Here is what the pages are
 * named (`DEMO_PAGES`), the GLOBAL state a session starts with
 * (`demoAppState`: the user's settings — who the user is, what they may do
 * and the lists every page needs arrive with the session), the user's
 * overlay, every page VISIT's own data (`demoPageData`) — nothing of
 * another page, and no server data — and the fake servers' seed. The
 * BUILDER is a separate, single, empty page.
 *
 * `failurePathViewModels` is a separate, deliberately broken tree for
 * exercising the engine's failure modes (problem placeholders, fallbacks,
 * crash isolation, boot validation) — resolved cell by cell in the engine's
 * unit tests, not loaded by the playground.
 *
 * Contract proof: depends on @wirework/schema ONLY — a view/data model is
 * plain data. Every cell carries a stable `id` (identity is never
 * positional). The failure-path page uses "flex-rows".
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
export const DEMO_PAGES = ["overview", "runs", "history", "run", "settings", "cards", "roles"] as const;
export type DemoPage = (typeof DEMO_PAGES)[number];

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
  /** When it started, as text ("YYYY-MM-DD HH:mm"): what a date range filters by, as text. */
  started: string;
  status: RunStatus;
}

/** What the user may do. Arrives with the session, like the user. */
export interface Permissions {
  /** May change pages ("Edit page"): layouts, widget settings, removals. */
  editPages: boolean;
}

/** The user's own settings. Strings, numbers and booleans as the form widgets hold them — JSON, never a Date. */
export interface UserSettings {
  /** Absent until the user types one: the overview's welcome label then shows its own text. */
  displayName?: string;
  /** Rows per page of the runs list — a select's value, hence text. */
  pageSize: string;
  autoRefresh: boolean;
  /** A number widget's value: a number, or null while the field is empty. */
  refreshSeconds?: number | null;
  /** A date widget's value: "YYYY-MM-DD" as text. */
  reportDay?: string;
  /** The roles page's input, everyone's. */
  note?: string;
}

/**
 * The GLOBAL state the application starts with: the settings and nothing
 * else. The user, the permissions and the lists every page needs are NOT
 * here — they reach the store when the (fake) session request answers.
 */
export const demoAppState: { app: { settings: UserSettings } } = {
  app: { settings: { pageSize: "5", autoRefresh: false } },
};

/**
 * Who the user is, as the session answers it: a name, a title, and the
 * ROLES they hold (doc/roles-design.md) from the broadest to the most
 * specific — the server knows a Wirework admin is also an admin, so the list
 * says so and the configuration never has to.
 */
export interface SessionUser {
  /** Who: the key "Sign in as" picks a person by. */
  id: DemoRole;
  name: string;
  /** The job title, for display. */
  title: string;
  roles: string[];
}

/** The roles the demo application grants, in order of strength — and the three people "Sign in as" offers. */
export const DEMO_ROLES = ["qa", "admin", "wirework-admin"] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

export const samplePeople: Record<DemoRole, SessionUser> = {
  qa: { id: "qa", name: "Alex Tester", title: "QA engineer", roles: ["qa"] },
  admin: { id: "admin", name: "Sam Keeper", title: "Administrator", roles: ["qa", "admin"] },
  "wirework-admin": {
    id: "wirework-admin",
    name: "Robin Root",
    title: "Wirework administrator",
    roles: ["qa", "admin", "wirework-admin"],
  },
};

/** What every session answers may do. */
export const samplePermissions: Permissions = { editPages: true };

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
  roles: {},
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
    started: "2026-11-01 09:00",
    status: { state: "Failed", message: "ERROR ..." },
  },
  {
    id: "123457",
    name: "E2E Run # 98766",
    reference: "REF59456736",
    inbound: "IND557328",
    started: "2026-11-02 09:00",
    status: { state: "Success", message: "Finished" },
  },
  {
    id: "123458",
    name: "E2E Run # 98767",
    reference: "REF59456737",
    inbound: "IND557329",
    started: "2026-11-03 09:00",
    status: { state: "Running", message: "Step 3 of 7" },
  },
  {
    id: "123459",
    name: "Nightly regression",
    reference: "REF59456738",
    inbound: "IND557330",
    started: "2026-11-04 09:00",
    status: { state: "Success", message: "Finished" },
  },
  {
    id: "123460",
    name: "Smoke suite",
    reference: "REF59456739",
    inbound: "IND557331",
    started: "2026-11-05 09:00",
    status: { state: "Failed", message: "2 assertions failed" },
  },
  {
    id: "123461",
    name: "Migration check",
    reference: "REF59456740",
    inbound: "IND557332",
    started: "2026-11-06 09:00",
    status: { state: "Queued", message: "Waiting for a runner" },
  },
];
