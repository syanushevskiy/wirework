# Actions — business logic users can reuse

## The model

An action is named host code with a declared contract. Reactions in a
view model invoke it by name (`{ call, with }`); users pick it in the
builder; developers write it once.

```ts
interface ActionDefinition<P = Record<string, never>> {
  name: string;                       // "runs/load", "nav/go"  (namespace/name)
  description: string;                // what the builder shows
  params?: Validator<P>;              // zod; the builder renders it, validation checks it
  scope?: "global" | { pages: string[] };   // default "global"
  handler: (ctx: ActionContext<P>) => void | Promise<void>;
}

interface ActionContext<P> {
  event: WidgetEvent;                 // who fired it, with payload
  store: Store;                       // full store: actions are host code
  args: P;                            // validated against `params`
  page: string;                       // where the reaction lives
}
```

- **Namespaced names** keep hundreds of actions organised; the builder
  groups by namespace.
- **`params`** declares what a user fills in. The builder renders it with
  the same settings introspection used for widgets (enums become
  dropdowns, required parameters gate saving); boot validation and page
  resolution check a reaction's `with` against it.
- **`scope`** says where the action may be used: everywhere, or on named
  pages. The registry answers `actions.for(page)`; the builder lists
  exactly that; a reaction calling an action unknown on its page is a
  typed problem, like an unbound port.

## Registration

In code, once, at boot, like widgets and layout engines:

```ts
const actions = createActions();
for (const action of coreActions) actions.register(action);            // predefined, global
for (const action of createRunsActions(api)) actions.register(action); // business logic
```

Business logic is packaged as factories that close over host services
(API client, router, dialog manager) and return definitions. Registries
are immutable after boot; register everything before the first render.

Users never write code. They reuse actions by name in view models; moving
a widget to another page keeps its reactions valid when the action is
global or scoped to that page, and reports them otherwise.

## Server requests and "do something after"

- **Fixed follow-up** lives in the handler (the common case):

```ts
export function createRunsActions(api: RunsApi): ActionDefinition[] {
  return [{
    name: "runs/load",
    description: "Fetch runs for a time window into runs.data",
    params: z.object({ window: z.enum(["today", "last-7d", "last-30d"]).default("today") }),
    scope: { pages: ["runs", "dashboard"] },
    handler: async ({ store, args }) => {
      store.set("runs.status", { loading: true });
      try {
        store.set("runs.data", await api.load(args.window));
        store.set("runs.status", { loading: false });
      } catch (error) {
        store.set("runs.status", { loading: false, error: String(error) });
      }
    },
  }];
}
```

- **User-chosen follow-up** is ORDER: reactions on one event are a list,
  the interpreter runs them in order and awaits an async action before
  starting the next, so `[ { call: "runs/load" }, { call: "nav/go", with:
  { page: "runs" } } ]` navigates after the load. A rejected action stops
  that event's chain and is logged. Nothing beyond sequence is expressible.

Results travel through the store: an action writes what it fetched and a
status beside it; widgets bound to those paths render loading, data or
error. Actions never emit into the bus (explicit chains, no loops).
Reactions never transform (`from` selects, `value` is a literal, `with`
is static); logic is code with a name.

## Predefined actions (`@wirework/actions-core`, global)

`nav/go { page }`, `dialog/open-page { page }` (a wizard is a page rendered
in a dialog), `dialog/close`, `store/set { path, value }`, `http/get { url,
into }` restricted to relative URLs, `debug/log`. The host's page and
dialog state live in the store so these are ordinary state writes.

## Security

Actions run host code with the full store. User configuration only picks
names and parameters, validated by schema; parameters never contain code.

## Phases

| Phase | Work | Estimate |
|---|---|---|
| 1 | `params`, `scope`, namespaced names, `for(page)`, sequential awaited reactions with error isolation, `with` and page availability validated, parameter form in the builder | 1 day |
| 2 | `@wirework/actions-core`; playground page + dialog state in the store; a wizard page in the fixtures; a static JSON endpoint for a `load-runs` demo; scenarios | 1–1.5 days |
| 3 | "Writing an action" guide (factory pattern, unit-test recipe) | 0.5 day |

Status: phase 1 mostly built. Built: namespaced names (`table-view/load`),
reactions running in declaration order with async actions awaited and a
failure stopping its chain, synchronous reactions staying synchronous, an
`AbortSignal` on the action context aborted when the page unbinds, a
`call` to an unknown action reported at boot and resolve. Built too:
`params` — an action declares what its `with` may hold; boot validation
and page resolution report a `with` that does not fit as a problem of the
cell ("reactions call actions wrongly: …"), the handler receives the PARSED
arguments (defaults applied), and the builder's reaction form shows one
field per parameter (`settingFields(params, { json: true })`: objects and
lists are JSON fields), gates Add on the required ones and saves them as
`with`. `table-view/load` is the first action with parameters. An action
WITHOUT `params` behaves as before: `with` passes through unchecked and the
editor keeps an existing one untouched. The playground's navigation is two
actions: `nav/go { to }` (a static address) and `nav/follow` (no
parameters: it goes where the EVENT's `href` points — a table's
`link-clicked`); both accept only an address of the application
(`appPathSchema`: one leading `/`, never another origin). Not built: `scope` / `for(page)`,
and a parameter that is a list of choices from the page (a "source"
select). Phases 2–3 not started; `http/get` is superseded by
`source/refresh` in doc/refresher-design.md.
