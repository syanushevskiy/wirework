/**
 * What the DEMO application puts into the host's registries, and the fake
 * servers it talks to: the standard contracts and the antd widgets plus this
 * app's own kind and cell renderers, the four layout engines, the host
 * actions its pages call — and the negative proof that broken widget
 * definitions are rejected. boot.ts is the host and keeps working without
 * this file; a real application replaces it with its own registrations.
 */
import { defineMigration, errorText, renameWidget } from "@wirework/engine";
import { cssGridEngine } from "@wirework/engine-css-grid";
import { flexRowsEngine } from "@wirework/engine-flex-rows";
import { flexLayoutEngine } from "@wirework/engine-flexlayout";
import { gridstackEngine } from "@wirework/engine-gridstack";
import { reactGridLayoutEngine } from "@wirework/engine-react-grid-layout";
import { APP_OWNER, type Store, type ViewModels } from "@wirework/schema";
import { createTableViewActions } from "@wirework/table-view";
import { z } from "zod";
import { demoAppState, sampleRuns, type DemoPage, type DemoRole, type Run } from "@wirework/view-data-models-examples";
import { standardContracts, tableRowsSchema } from "@wirework/widget-contracts";
import { antdTestWidgets, brokenWidgets, createAntdWidgets } from "@wirework/antd-widgets";
import { createFilterActions } from "../actions/filter-actions";
import { createNavActions, type Navigator } from "../actions/nav-actions";
import { createRunLoader, createRunsActions } from "../actions/runs-actions";
import { createSessionLoader } from "../actions/session-loader";
import { createRunsServer } from "../api/runs-server";
import { createSessionApi } from "../api/session-api";
import { createSessionsEndpoint } from "../api/sessions-server";
import { suiteOptionsFor } from "../api/suites-catalog";
import {
  ARCHIVE_TOTAL,
  ARCHIVE_VIEW_URL,
  RUNS_ALL_VIEW_URL,
  RUNS_VIEW_URL,
  SESSIONS_VIEW_URL,
  createFakeTransport,
  forbidden,
} from "../api/transport";
import type { PlaygroundPage, Registries } from "../boot";
import { codeEditorContract } from "../contracts/code-editor";
import { statusBadgeContract } from "../contracts/status-badge";
import { allViewModels, pageViewModels } from "../pages";
import { codeEditor } from "../widgets/code-editor-widget";
import { CopyCell } from "../widgets/copy-cell";
import { RunStatusCell } from "../widgets/run-status-cell";
import { statusBadge } from "../widgets/status-badge";
import { builderPage, demoPages, demoSessionState } from "./pages";

declare global {
  interface Window {
    /** A test's word on how long the fake servers' lists are (before the application starts): both hold that many runs. */
    wireworkListSize?: number;
  }
}

/** How many runs a fake server holds: its own count, unless a test asked for long lists (`window.wireworkListSize`). */
const listSize = (own: number): number => {
  const asked = window.wireworkListSize;
  return typeof asked === "number" && Number.isInteger(asked) && asked > 0 ? asked : own;
};

/** A run record (whatever a page's `when` reads: live data) that failed and has an even id. */
function isRetryable(run: unknown): boolean {
  // The one cast: live data of any shape, every field read is checked before it is trusted.
  const record = run as Partial<Run> | null;
  return record?.status?.state === "Failed" && typeof record.id === "string" && Number(record.id) % 2 === 0;
}

/** What the standard `favorite` row action says when it is used: which row, and the state asked for. */
const favoriteAsked = z.object({
  name: z.literal("favorite"),
  key: z.string().min(1),
  detail: z.object({ active: z.boolean() }),
});

/** What the host needs from the demo once everything is registered. */
export interface Demo {
  /** Every broken definition and how the registry answered — the proof the playground shows. */
  rejections: string[];
  /** The application's long-lived state a session starts from — without any page's view models. */
  sessionState: Record<string, unknown>;
  /** One page's view models as its folder says (src/pages): what the store gets when the page opens, that page alone. */
  pageViewModels(page: DemoPage): ViewModels;
  /** Every page's view models as one tree — what the user's saved views are read with when a session opens (boot.ts). */
  allViewModels(): ViewModels;
  /** A session starts: the fake servers start over and the session request goes out. */
  startSession(shared: Store): void;
  /** "Sign in as" another of the demo's people (doc/ADR/0012-roles.md): the session request goes out again; resolves when it answered. */
  signIn(shared: Store, person: DemoRole): Promise<void>;
  pages: Record<DemoPage, PlaygroundPage>;
  builderPage: PlaygroundPage;
}

export function installDemo(
  { contracts, registry, layoutEngines, actions, predicates, appearances, migrations }: Registries,
  navigator: Navigator,
): Demo {
  // The application's own DATA FORMAT (doc/ADR/0017-versioning-and-upgrades.md) is at 2: the status badge's widget
  // type was once `run-badge`. A view a user saved back then still names it; the step brings such a view forward
  // when it is loaded (boot.ts), and nothing else in the application knows the old name.
  migrations.register(
    defineMigration({
      owner: APP_OWNER,
      to: 2,
      description: 'The widget type "run-badge" is "status-badge"',
      cell: renameWidget("run-badge", "status-badge"),
    }),
  );

  // Contracts: the standard kinds plus this app's own; widgets implement them.
  for (const contract of standardContracts) contracts.register(contract);
  contracts.register(statusBadgeContract);
  contracts.register(codeEditorContract);

  // The table — and the fact sheet — offer this app's own cell renderers by name (`cell: { kind: "custom", name: "copy" }`).
  for (const widget of createAntdWidgets({ tableCells: { copy: CopyCell, "run-status": RunStatusCell } })) {
    registry.register(widget);
  }
  registry.register(statusBadge);
  // A LAZY widget (doc/ADR/0018-lazy-widgets.md): its contract is registered here like any other, its component's
  // code is asked for by the pages that show it — the editor page alone.
  registry.register(codeEditor);
  // A playground is a test bench: the always-crashing widget proves isolation.
  for (const widget of antdTestWidgets) registry.register(widget);

  // Layout engines are plugins too: a page template names one.
  layoutEngines.register(reactGridLayoutEngine);
  layoutEngines.register(flexRowsEngine);
  layoutEngines.register(cssGridEngine);
  layoutEngines.register(gridstackEngine);
  layoutEngines.register(flexLayoutEngine);

  // Host ACTIONS: what a user may attach to an event beyond a store write
  // (doc/ADR/0002-widget-events.md, "Listening"). Business code lives here,
  // named and described; the builder lists them.
  actions.register({
    name: "reset-counter",
    description: "Set demo.counter back to 0",
    handler: ({ store }) => store.set("demo.counter", 0),
  });
  actions.register({
    name: "clear-selected-run",
    description: "Forget the selected run",
    handler: ({ store }) => store.set("pagination.selected", undefined),
  });
  actions.register({
    name: "log-event",
    description: "console.log the event (debugging)",
    handler: ({ event, args }) => console.log("[action log-event]", event, args),
  });
  // The admin's Danger zone (doc/ADR/0012-roles.md): the settings back to what the application starts with.
  actions.register({
    name: "settings/reset-all",
    description: "Put every setting back to its default",
    handler: ({ store }) => store.set("app.settings", demoAppState.app.settings),
  });
  // Server-side data for the demo: a fake server with real latency.
  const runsServer = createRunsServer({ seed: sampleRuns, total: listSize(23), latencyMs: 600 });
  // The archive: the same kind of list, long — two thousand runs nobody holds whole (the windowed list's demo).
  const archiveServer = createRunsServer({
    seed: sampleRuns,
    total: listSize(ARCHIVE_TOTAL),
    latencyMs: 300,
    details: true,
  });
  // The archive's STAR (doc/ADR/0020-row-actions.md): the table's `row-action` reaction calls this. The server is
  // told the run's KEY and the state asked for — never a field of the row, which is only what the browser holds —
  // and once it answered, that one row is patched where the table reads it: no list request. Another row action of
  // the same table arrives here too (reactions have no conditions): it is not this action's and is left alone.
  actions.register({
    name: "archive/set-favorite",
    description:
      'Mark the run a row action named "favorite" was used on as a favourite, or not (detail.active), on the server and in infinite-list.data',
    handler: async ({ store, event }) => {
      const asked = favoriteAsked.safeParse(event.payload);
      if (!asked.success) return;
      const { key, detail } = asked.data;
      await archiveServer.setFavorite(key, detail.active);
      const rows = store.getAs("infinite-list.data", tableRowsSchema) ?? [];
      store.set(
        "infinite-list.data",
        rows.map((row) => (String(row.id) === key ? { ...row, favorite: detail.active } : row)),
      );
    },
  });
  const sessionApi = createSessionApi({ latencyMs: 300 });
  const loadSession = createSessionLoader(sessionApi);
  // The Wirework admin's button (doc/ADR/0012-roles.md): a role-only ACTION is a server call the session must be
  // allowed — never a store write a condition hides. The fake server refuses every other session.
  actions.register({
    name: "runs/delete-selected",
    description: "Delete the run at pagination.selected on the server (Wirework admins only)",
    handler: async ({ store }) => {
      const id = store.get("pagination.selected");
      if (typeof id !== "string" || id === "") return;
      if (!sessionApi.current().roles.includes("wirework-admin")) {
        throw new Error("DELETE /api/v1/runs answered 403 Forbidden: your session may not delete runs");
      }
      await runsServer.deleteRun(id);
      store.set("pagination.selected", undefined);
    },
  });
  // What the run page's own `load` reaction calls (viewModels.on.run): one
  // run — plus opening the selected run, and retrying the run on the server
  // (the run page's dialog).
  const loadRun = createRunLoader(runsServer);
  for (const action of createRunsActions({
    loadRun,
    retryRun: (id, reason) => runsServer.retryRun(id, reason),
    navigator,
  })) {
    actions.register(action);
  }
  // Tables the SERVER describes (@wirework/table-view): one generic
  // action, the URL comes from the page. The playground's "network" is the
  // fake server; a real host passes `fetchTransport` instead. Every request
  // carries the SESSION, and the admin's view refuses a session without the
  // admin role (doc/ADR/0012-roles.md): the page asks, the server decides.
  const transport = createFakeTransport(
    {
      [RUNS_VIEW_URL]: (request) => runsServer.fetchView(request),
      [ARCHIVE_VIEW_URL]: (request) => archiveServer.fetchView(request),
      [RUNS_ALL_VIEW_URL]: (request, session) =>
        session.roles.includes("admin") ? runsServer.fetchViewAll(request) : forbidden(RUNS_ALL_VIEW_URL),
      [SESSIONS_VIEW_URL]: createSessionsEndpoint({ latencyMs: 300 }),
    },
    () => ({ roles: sessionApi.current().roles }),
  );
  for (const action of createTableViewActions({ transport })) actions.register(action);
  // Dependent filters: the suites on offer follow the applications chosen.
  for (const action of createFilterActions(suiteOptionsFor)) actions.register(action);
  // Navigation: the host owns the router, pages only name where to go.
  for (const action of createNavActions(navigator)) actions.register(action);

  // A PREDICATE of this application's own (doc/ADR/0008-conditions.md): what
  // no standard check can say — two properties and a rule — as code with a
  // name, which a page's `when` picks like a standard one. The rule is the
  // fake server's: a failed run with an even id would run again.
  predicates.register({
    name: "runs/retryable",
    description: "A failed run the server would accept again (its id is even)",
    phrase: "can be retried",
    test: (run) => isRetryable(run),
  });
  // The roles the user holds are a LIST (app.user.roles, doc/ADR/0012-roles.md): "has the role" reads it —
  // "is one of" and "equals" are for a single value and do not apply to the list.
  predicates.register({
    name: "user/has-role",
    description: "The list of roles at the path contains the given role name (for app.user.roles)",
    phrase: "has the role",
    argument: z.string().min(1),
    test: (roles, role: string) => Array.isArray(roles) && roles.includes(role),
  });

  // An appearance of this application's own: the name here, the keyframes
  // `ww-drop` in index.css (doc/ADR/0008-conditions.md, "Appearance").
  appearances.register({ name: "drop", description: "Drops in from above" });

  // Negative proof: every broken definition must be rejected loudly.
  const rejections = Object.entries(brokenWidgets).map(([name, definition]) => {
    try {
      registry.register(definition);
      return `${name}: was ACCEPTED — registry guard is broken!`;
    } catch (error) {
      return `${name}: rejected (${errorText(error)})`;
    }
  });

  return {
    rejections,
    sessionState: demoSessionState(),
    pageViewModels,
    allViewModels,
    startSession: (shared) => {
      runsServer.reset();
      void loadSession(shared);
    },
    signIn: (shared, person) => loadSession(shared, person),
    pages: demoPages(runsServer, archiveServer),
    builderPage,
  };
}
