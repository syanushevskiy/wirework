# ADR-0005: Actions — business logic users can reuse

- **Status:** Accepted — partly built (phase 1; phases 4–7 designed 2026-10-14)
- **Date:** 2026-09-16
- **Deciders:** the product owner

## Description

A reaction in a view model has two verbs (doc/ADR/0002-widget-events.md):
`set` writes the store, and `call` is for everything that is not a store
write — fetch the runs, go to a page, open a dialog. This record says what
the thing a `call` names is: how business logic is written once by
developers and reused by users who never write code, how it is registered
and checked, how a server request and what follows it are expressed, and —
designed 2026-10-14 — what an application with hundreds of actions, and a
third party whose "user" is an AI model, needs on top.

## Options considered

For the model itself the record contrasts two things it does not do with
the one it does:

- **Logic in configuration** — reactions that transform, branch or
  compute. Turned down: reactions never transform (`from` selects, `value`
  is a literal, `with` is static), and nothing beyond sequence is
  expressible.
- **Actions that emit into the bus**, so that one action's end starts the
  next. Turned down: chains stay explicit and cannot loop. A follow-up is
  either fixed in the handler or the ORDER of the reactions on one event.
- **Named host code with a declared contract** — a name, a description,
  `params` and a `scope` —, invoked by name with static arguments. It
  costs a registry and a definition per action; a user's configuration
  then only picks names and parameters, which a schema validates.

For the hundreds of actions (2026-10-14):

- **Where presets live** — three places, weighed in "Presets" below:
  virtual actions (no builder change, but the list grows by the number of
  presets — the problem being solved), a preset registry beside the action
  registry (explicit, validated at boot; a fifth registry), or presets as
  DATA under a configuration root (chosen: the server's presets must be
  merged in, and that is what makes a preset data, not code).
- **A reaction that copies a preset's arguments or refers to the preset.**
  A copy made at pick time would freeze server-owned values (URLs, tenant
  windows) into every page; a reference keeps them live.
- **The order of the work.** The grouped select alone, measured before
  any ranking is added; or the catalogue first, the picker a view over it.
  Both hold in what is designed: the catalogue (phase 4) comes before the
  picker (phase 6), and the picker's layers are built cheapest first, each
  measured before the next.
- **A separate path for a model as the user.** None: the model reads the
  same catalogue and gets back the same validation sentences.

## Decision

An action is named host code with a declared contract, registered in code
at boot and invoked from a reaction by name (`{ call, with }`). Users
never write code; parameters never contain code. A follow-up is order:
the reactions of one event run in sequence, an async action awaited before
the next. Results travel through the store; actions never emit into the
bus.

For hundreds of actions: metadata on the definition and a catalogue
(`describeActions`) every UI derives from, built before the picker;
presets as data under the `actionPresets` configuration root, merged with
the server's by id and REFERRED to by a call reaction that still names its
action; a picker built in layers; and no separate path for a model.

## The model

An action is named host code with a declared contract. Reactions in a
view model invoke it by name (`{ call, with }`); users pick it in the
builder; developers write it once.

```ts
interface ActionDefinition<P = Record<string, never>> {
  name: string; // "runs/load", "nav/go"  (namespace/name)
  description: string; // what the builder shows
  params?: Validator<P>; // zod; the builder renders it, validation checks it
  scope?: "global" | { pages: string[] }; // default "global"
  handler: (ctx: ActionContext<P>) => void | Promise<void>;
}

interface ActionContext<P> {
  event: WidgetEvent; // who fired it, with payload
  store: Store; // full store: actions are host code
  args: P; // validated against `params`
  page: string; // where the reaction lives
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
for (const action of coreActions) actions.register(action); // predefined, global
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
  return [
    {
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
    },
  ];
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

## Hundreds of actions: metadata, presets, the picker, a model as the user

Designed 2026-10-14. The builder's picker today is
one flat select labelled `name — description`; an application with
hundreds of actions, and a third party whose "user" is an AI model, needs
four things, in this order.

### 1. Metadata the registry can be searched by

Every UI derives from the definition, never the other way round:

```ts
interface ActionDefinition {
  // ...as today, plus:
  category: string; // one word a user understands: "Load", "Navigate", "Dialog"
  tags?: string[]; // what a search matches beside name and description
  accepts?: string[]; // payload fields the handler reads ("href") — ranks it for an event that carries them
  affects?: string[]; // store roots it writes ("runs") — what a page sees change
  scope?: "global" | { pages: string[] }; // designed above, built here
}
```

`category` is the only new required field (default: the namespace);
the rest is optional — metadata nobody fills in is worse than none.
`scope` alone cuts hundreds to the dozens a page can use.

`describeActions(registry)` returns the CATALOGUE as JSON: name,
description, category, tags, `params` as JSON Schema (zod → JSON Schema),
`accepts`, `affects`, and the presets as worked examples. The human
picker is one view over it; a model reads it directly. The catalogue is
built before the picker, or the picker hard-codes what the catalogue then
has to honour.

Two decisions phase 4 makes on the way: `ActionDefinition` becomes
generic over its `params` (as the model at the top of this document
already writes it), so a preset can be typed against the definition itself;
and JSON Schema comes either from `zod/v4`'s own `z.toJSONSchema` (shipped
inside the zod 3.25 the repo pins, but a different API from the v3 one the
contracts use) or from the `zod-to-json-schema` package — one dependency
or one migration, decided when the catalogue is built.

### 2. Presets: typed in code, JSON at runtime, merged with the server's

A preset is a named, described set of arguments for one action — "Load
runs of the last 7 days", not `runs/load with { window: "last-7d" }`.
Presets are what users pick and what a model copies.

Three places they could live, and the one chosen:

- _Virtual actions_ (a preset registers as an action that calls the base
  one): zero builder change, but the list grows by the number of presets —
  the problem being solved.
- _A preset registry_ beside the action registry: explicit, validated at
  boot; the fifth `NamedRegistry`.
- **Presets as DATA** under a configuration root, like view models: the
  root is `actionPresets`, a third member of `CONFIG_ROOTS` (so `set`
  refuses it and only `setConfig` writes it) and a SHARED root in the
  layered store (it outlives a page). The server's presets arrive through
  the same loading path, `deepMerge` merges them by id (server over host,
  deep inside `with`), boot validation reports a preset whose `with` the
  action's `params` refuse, the builder reads them from the store. Chosen
  because the server-merge requirement is what makes a preset data, not
  code. A server preset that fails validation is DROPPED with a boot
  problem and the host's version of that id stays: a server deployment
  cannot take a working page down.

A preset IS a call reaction with a name a user reads — `{ call, with }`
plus `label` (the one line the picker shows), `description` (help beside
it) and `tags` (what a search matches). Preset ids follow the action
grammar (`ACTION_NAME`: `namespace/name`), one grammar for both. The host
writes them in a typed file that stays JSON:

```ts
// apps/playground/src/demo/action-config.ts (the example; the contract in actions/action-presets.ts)
const tableViewLoad = { name: TABLE_VIEW_LOAD, params: tableViewArgsSchema }; // phase 4: the definition itself
export const actionPresets: Record<string, ActionPreset> = {
  "runs/table": preset(tableViewLoad, {
    label: "Load the runs table",
    tags: ["runs", "table", "load"],
    with: { url: RUNS_VIEW_URL, into: "runs", metadata: true, pageSize: 5 },
  }),
};
```

`preset(action, body)` takes the action's name and `params` from ONE
object — the registered definition once phase 4 makes it generic — so the
name and the schema cannot drift, and types `with` as `z.input<P> & Json`:
a wrong field fails to compile and the literal cannot hold a function or a
Date. Nothing runs at import: a configuration problem is data, never a
throw, so the host's file is checked by the compiler and the MERGED result
by boot validation (`presetSchema` plus each action's `params` — the check
`with` already gets). An action that has presets must DECLARE `params`
(`nav/go` checks `to` in its handler today; phase 4 declares it).

A reaction REFERS to a preset: `{ call: "table-view/load", preset:
"runs/table", with?: { ...overrides } }`. Copying the arguments into the
page at pick time would freeze server-owned values (URLs, tenant windows)
into every page; a reference keeps them live, and `with` overrides stay
possible. `preset` is one optional key on a call reaction, not a third
verb, and `call` STAYS required: the view model reads without the preset
table, and a preset whose `call` differs from the reaction's is a cell
problem — the redundancy is the drift check. Resolution merges the
preset's `with` under the reaction's `with` and validates the result; a
reference to an unknown preset is a cell problem like an unknown action.

### 3. The picker

Cheapest layer first, each measured before the next:

1. A searchable select grouped by `category`, the LABEL being the
   description or the preset's label, the technical name secondary;
   presets listed under their action; the search matching name,
   description and tags. One afternoon of antd.
2. "Used on this page" (read from the page's view models) and "recently
   used" (a host concern: the builder hook takes `recent: string[]` as an
   input, like everything only a host knows) on top.
3. "Recommended for this event": the actions whose `accepts` match the
   event's payload fields, first, with the reason shown ("reads `href`,
   which this event carries"). One explainable rule, no scores.
4. A two-level cascader (category → action → preset) only if groups still
   overflow.

Every state is driveable from Gherkin by a non-technical tester: "When I
choose the action 'Load the runs table'" — roles and labels in words, test
ids on the groups, a story per picker state.

### 4. A model as the user

No separate path. The model reads the catalogue (JSON Schema per action,
presets as examples), writes a reaction, and gets back the sentences the
engine already produces ("reactions call actions wrongly: …", "reactions
read payload fields that do not exist: …") to correct itself. The same
`accepts` ranking the picker shows is what a model should prefer. A
conformance test: every registered action yields a valid JSON Schema and
every preset passes its action's `params`.

Alternatives recorded: shipping the grouped select alone and measuring
before any ranking; building the catalogue first. Putting the example
preset file under a test today, not with phase 5, was weighed and not
done — the playground has no unit-test setup and none was added for four
presets the compiler already checks. Open to the product owner: whether presets
change after pages are built (if the server owns URLs or tenant values,
the reference form above is the only choice).

## Security

Actions run host code with the full store. User configuration only picks
names and parameters, validated by schema; parameters never contain code.

## Phases

| Phase | Work                                                                                                                                                                                                                                                                                                                                                                                                                             | Estimate   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1     | `params`, `scope`, namespaced names, `for(page)`, sequential awaited reactions with error isolation, `with` and page availability validated, parameter form in the builder                                                                                                                                                                                                                                                       | 1 day      |
| 2     | `@wirework/actions-core`; playground page + dialog state in the store; a wizard page in the fixtures; a static JSON endpoint for a `load-runs` demo; scenarios                                                                                                                                                                                                                                                                   | 1–1.5 days |
| 3     | "Writing an action" guide (factory pattern, unit-test recipe)                                                                                                                                                                                                                                                                                                                                                                    | 0.5 day    |
| 4     | Metadata: `category` (required, default the namespace), `tags`, `accepts`, `affects`; `scope` built with `for(page)`; `ActionDefinition` generic over `params`, declared on every action with presets (`nav/go`); `describeActions` → catalogue JSON with zod → JSON Schema (decide `zod/v4` vs `zod-to-json-schema`); conformance test                                                                                          | 1 day      |
| 5     | Presets as data: `ActionPreset`, `preset()` in `@wirework/schema`; the `actionPresets` root in `CONFIG_ROOTS`, shared, loaded at boot and merged with the server's by id, a failing server preset dropped with a problem; boot validation of every preset against its action; `preset` on call reactions (`call` kept and matched), resolved and validated with `with` overrides; the playground's example loaded and under test | 1–1.5 days |
| 6     | The picker: grouped searchable select with labels in words and presets under actions; "used on this page"; "recommended for this event" with the reason; stories and scenarios for each state                                                                                                                                                                                                                                    | 1–1.5 days |
| 7     | A model as the user: the catalogue exposed by the host; validation sentences returned to the caller; a scenario that wires a reaction from the catalogue alone                                                                                                                                                                                                                                                                   | 0.5 day    |

Status: phase 1 mostly built. Phases 4–7 designed 2026-10-14; the
playground holds an EXAMPLE of the preset file
(`src/demo/action-config.ts`, the proposed contract in
`src/actions/action-presets.ts`) that typechecks and nothing loads yet. Built: namespaced names (`table-view/load`),
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
select). Phases 2–3 not started; `http/get` is not planned —
`table-view/load` (`@wirework/table-view`) is how a page fetches today.
