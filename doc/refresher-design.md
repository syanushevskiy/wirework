# Refresher and data sources — refreshing a specific table

## Motivation

A page author wants a table that shows server data and a refresher next to
it: "Refresh" re-requests THAT table's data, and an optional timer does the
same every N seconds. The author should configure where the table fetches
from (URL, how to fetch) and which table a refresher refreshes, without a
developer writing code per table.

Today the demo is half way there (`doc/table-view-design.md`): the runs
page's store starts WITHOUT any runs, the TABLE declares the URL of its
view API in its own `load` reaction — the table emits `load` once when it
appears — and one generic action, `table-view/load`, requests it, so the
state inspector shows `runs.loading` first and the rows only when the fake
server answers. The table reads `runs.data`, and the refresher, the
pagination and the filter bar `call: "table-view/load"` naming the view
(`with: { into: "runs" }`). No action per table any more, and the URL lives
in the page — for ONE API shape. "Loading on open" (decision 9 below)
exists in its event form: a page's and a table's `load`
(`widget-events-design.md`). The rest of this document is the general
form: any request, and sources that are named.

## The refresher (built)

`refresher` is a standard contract (`@wirework/widget-contracts`),
implemented by `antd-refresher`:

```ts
inputs: {
  schedule: "<path>",   // { enabled: boolean, interval: seconds 1..3600 }, default { false, 5 }
  busy?:    "<path>",   // true while a refresh is in flight
}
events: {
  changed: { enabled, interval },            // required — the reaction stores the schedule
  refresh: { trigger: "manual" | "interval" } // required — the reaction decides WHAT refreshes
}
settings: { label: "Auto-refresh every", buttonLabel: "Refresh" }
```

- The widget owns nothing and fetches nothing: checkbox, number field and
  button; the schedule round-trips through the store like `input` and
  `pagination` (one `set` without `from` stores the whole payload).
- It ticks only while enabled, restarts on an interval change, and SKIPS a
  tick while `busy` is true or the document is hidden: no pile-up of
  requests, no polling from a background tab. While busy, the button spins
  and ignores clicks.
- It emits only from a click or the timer callback, never from render or an
  effect body (StrictMode).
- Auto-refresh is off by default (Morgan, below).

What the refresher refreshes is the reaction's business. The rest of this
document is about making that reaction name a TABLE'S DATA without code.

## Team Tiger review

**Morgan (Product Owner).** The story is: "I add a runs table, point it at
the runs endpoint, put a refresher above it and choose 'refresh: runs
table'. No developer ticket." Auto-refresh must be off until someone turns
it on: a dashboard left open on thirty office screens, polling every five
seconds, is a server bill and an incident. People must see when data was
last updated and when a refresh failed. Stale data that looks fresh is
worse than an error message.

**Alexei (Architect).** The table must not fetch. Widgets READ and EMIT; a
table that fetches writes the store outside reactions, breaks the store
contract, and every table implementation would have to reimplement HTTP,
cancellation and retries. So the URL can be *configured with* the table
but must be *executed by* the engine. My first proposal: let the `data`
port binding carry the request, e.g. `inputs: { data: { path, source: {
url, … } } }`. Source KINDS (`http-json` now, websocket later) are plugins,
registered like layout engines.

**Ren (Contrarian).** Do we even want the URL on the table? Look at our own
demo: ONE response feeds TWO widgets, rows to the table and `total` to the
pagination. If the request belongs to the table, the pagination's total is
a side effect of the table. Add a failed-runs badge and a chart and either
each duplicates the URL (three identical requests per refresh) or they
reach into the table's configuration. Retool binds components to
page-level queries (`{{ query1.data }}`, "Trigger query" on a button) and
Appsmith does the same (`{{ Api1.data }}`, `Api1.run()`), and I have seen
why: on a project with per-widget URLs, the API v2 migration was an edit in
every widget. Make sources NAMED and separate; widgets bind to their
results. The risk of my own proposal is one more concept for authors, and
the builder has to hide it.

**Dmitri (Senior Dev).** Whatever the shape, the target is named in the
reaction: `with: { source: "runs" }`. No "refresh everything on the page",
no "the table next to me", no "whoever writes runs.data". And no mapping
language for responses: select fields by path, and anything more is an
adapter in code, with a name.

**Katya (Team Lead).** One generic action shipped with the framework
instead of one action per table: a new table is configuration, not a pull
request. Convention over configuration: a source's result and status live
at a FIXED place in the store, so nobody invents paths per table. And the
builder should let authors think "the table's URL" while it writes the
normalised source for them. People configure the table; the model stays
clean.

**Sasha (QA).** Every state must be visible to my non-technical testers:
spinner, error text, "updated 12:03:05", plus `data-*` attributes for
Gherkin. The e2e run must go through a real `fetch`: put the fake runs
server behind a Vite dev middleware (`/api/runs`), so the `http-json` kind
is tested end to end, and use `page.route()` to force a 500 or a timeout.
Interval scenarios should use Playwright's clock (`page.clock.install`,
`runFor`) instead of real waits. Unit tests for the runner: latest request
wins, aborts, status transitions, adapter failure lands in `status.error`,
data is kept on error. The steps stay in plain language ("When I click
Refresh"), and the existing refresher scenarios must pass unchanged after
the migration. That is the proof nothing user-visible moved.

**Vlad (Fluency).** The runner reads as one pipeline: query params with
`Object.fromEntries(Object.entries(query).map(…))`, and sources declared
through a typed `defineSource` that mirrors `defineContract`. *Dmitri,
countering:* the latest-wins/abort block stays imperative. That ordering is
the point of the code, and a chain hides it. *Agreed split:* chains for
data shaping, plain statements for the concurrency control.

## Decision

1. **The table never fetches.** It still binds store paths. "The table has
   a URL" means its `rows` port is bound to a named DATA SOURCE that holds
   the URL and fetch details, and the builder creates that source when the
   author sets a URL on the port (Alexei, Ren, Katya).
2. **Sources are named and live in the base view models**
   (`viewModels.sources`), never in the user overlay: a user's saved view
   cannot redirect a page's requests.
3. **Results live at a fixed store place**: `sources.<name>.data` (the
   response body, after the optional adapter) and `sources.<name>.status`
   (`{ loading, error?, updatedAt? }`). Widgets bind plain paths under it;
   there is no response-to-path mapping (Katya, Dmitri). The runner is the
   only writer: a reaction `set` under `sources.` is a boot error.
4. **One action refreshes a source**: `source/refresh` with `with: {
   source }`, shipped with the framework. Refreshers, pagination and buttons
   name the source explicitly (Dmitri). It resolves when the request
   settles, so `[refresh, nav/go]` navigates after the load (sequential
   reactions, doc/actions-design.md).
5. **Latest request wins** per source: a new request aborts the previous one
   (AbortController). On error the last good data stays, and `status.error`
   says what failed (Morgan).
6. **Reshaping a response is code**: `adapter: "<name>"` picks a
   host-registered pure function. Configuration only selects (Ren's
   guardrail: reactions and config never transform).
7. **Security**: URLs are relative or on a host allow-list; credentials are
   never in configuration, so a source names a host-registered `auth`
   profile. Kinds and adapters are code; configuration picks names and
   parameters, validated by schema.
8. **Refetching is explicit in v1.** Changing `runs.page` does not refetch by
   itself; the pagination's reaction calls `source/refresh`. *Ren's risk to
   monitor:* authors forgetting that call. If it shows up, add
   `refetchOn: [paths]` to the source.
9. **Loading on open**: when a page opens, the engine loads every source
   (with `load: "on-open"`, the default) that a cell on that page binds
   under `sources.<name>.`. It is a reserved namespace, checked at boot, not
   a heuristic. Leaving the page aborts in-flight requests.

## Shape

```ts
// viewModels.sources — base view models only
sources: {
  runs: {
    kind: "http-json",
    request: {
      url: "/api/runs",
      method: "GET",                                   // default GET
      query: {
        page:     { path: "runs.page", default: 1 },   // from the store…
        pageSize: { path: "runs.pageSize", default: 5 },
        window:   { value: "last-7d" },                // …or a literal
      },
      auth: "api",                                     // optional, host-registered
      timeoutMs: 10000,
    },
    adapter: "runs-page",   // optional: body -> { items: Run[], total, page }
    load: "on-open",        // default; "manual" = only source/refresh
  },
},
```

The runs page, after migration:

```ts
table: {
  default: {
    inputs: { rows: "sources.runs.data.items", loading: "sources.runs.status.loading" },
    columns: [/* … */],
  },
},
runsPagination: {
  default: {
    inputs: { page: "runs.page", pageSize: "runs.pageSize", total: "sources.runs.data.total" },
    on: {
      changed: [
        { set: "runs.page", from: "page" },
        { set: "runs.pageSize", from: "pageSize" },
        { call: "source/refresh", with: { source: "runs" } },
      ],
    },
  },
},
runsRefresher: {
  default: {
    inputs: { schedule: "runs.autoRefresh", busy: "sources.runs.status.loading" },
    on: {
      changed: [{ set: "runs.autoRefresh" }],
      refresh: [{ call: "source/refresh", with: { source: "runs" } }],
    },
  },
},
```

Host side (code, once, at boot):

```ts
const sourceKinds = createSourceKinds();
sourceKinds.register(httpJsonSource({ allowedOrigins: [location.origin], auth: { api: bearerFromSession } }));

const adapters = createAdapters();
adapters.register({ name: "runs-page", description: "API page -> rows + total", adapt: toRunsPage });

const runner = createSourceRunner({ store, kinds: sourceKinds, adapters });
for (const action of createSourceActions(runner)) actions.register(action);   // source/refresh
```

`PageView` takes the runner and loads the page's on-open sources while it
is mounted.

## How an author wires it (builder)

1. Add a table. On its `rows` port choose **Fetch from URL…**, then
   fill in the URL, method, query parameters (each a store path or a
   literal), an adapter from a list, and the load policy. The builder writes
   `sources.<cell-id>` (renamable) and binds `data` (and `loading`, when
   the widget has it) under it.
2. Add a refresher. For `refresh`, pick the action **source/refresh**; its
   `source` parameter is a select listing the sources as "table-main — GET
   /api/runs". The `schedule` port gets a suggested path next to the
   source's (`runs.autoRefresh`).
3. Boot validation reports a binding under an unknown source, a
   `source/refresh` naming an unknown source, an unknown adapter or auth
   profile, and a `set` under `sources.`.

## Considered and rejected

- **An action per table** (today's `runs/load-page`): a pull request per
  table, and the URL is hidden in code. It stays valid for truly custom
  logic.
- **Request inline on the port binding** (Alexei's first proposal): one
  response cannot feed a second widget without duplicating the request, and
  the page-level list of requests is lost. It is kept only as builder UX
  over named sources.
- **`http/get { url, into }`** (doc/actions-design.md, predefined actions):
  `with` is static, so page and page size cannot be passed, one `into`
  cannot feed rows and total, and the URL repeats in every reaction that
  refreshes. It is replaced by `source/refresh` in `actions-core`.
- **A `target` setting on the refresher** ("refreshes table-main"): the
  refresher would know about tables, and one refresher driving two sources
  would need a list setting. Reactions already are that list.

## Testing

- **Unit (engine):** runner latest-wins and abort, status transitions,
  query from paths with defaults, adapter errors, data kept on error; boot
  validation problems.
- **Storybook:** `refresherConformance`: schedule round-trip, manual
  refresh emits, no tick while disabled or busy (fake timers).
- **e2e:** `refresher.feature` and the paging scenario pass unchanged
  against the migrated demo; new scenarios for a failing server
  (`page.route`) and clock-driven ticks; "updated at" visible.

## Phases

| Phase | Work | Status |
|---|---|---|
| 0 | `refresher` contract, `antd-refresher`, demo wired to `runs/load-page`, fake server progresses runs per request, `refresher.feature` | built |
| 1 | `viewModels.sources` schema, `http-json` kind, adapter registry, runner (latest-wins, abort, status), `source/refresh`, on-open loading in `PageView`, boot validation; needs actions phase 1 (`params`) for `with.source` | 2 days |
| 2 | Demo migration: `/api/runs` Vite middleware over the fake server, demo on `sources.runs`, `runs/load-page` removed, error and clock-driven scenarios | 1 day |
| 3 | Builder: "Fetch from URL…" on data ports, source select for `source/refresh` | 1.5 days |
| 4 | Refresher `updatedAt` port ("Updated 12:03:05"), table `error` port, per-user schedule remembered as persisted DATA — never in the overlay, which carries settings only (doc/builder-user-needs.md, W31) | 1 day |
| later | `refetchOn` (Ren's monitored risk), parallel multi-source refresh, websocket kind | — |
