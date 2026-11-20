# ADR-0005: Actions — business logic users can reuse

- **Status:** Accepted — partly built (phase 1; phases 4–7 designed)
- **Deciders:** the product owner

## 1. Decision

- An action is named host code with a declared contract, registered at
  boot and invoked from a reaction by name (`{ call, with }`). Users never
  write code.
- A follow-up is the ORDER of one event's reactions, an async action
  awaited. Results travel through the store; actions never emit.
- For hundreds of actions: a catalogue (`describeActions`), presets as
  data that a reaction refers to, a picker in layers, no separate path
  for a model.
- Built: most of phase 1 (names, ordered awaited reactions, `params`).
  Not built: `scope` / `for(page)`, phases 2–3, phases 4–7.

## 2. Problem

A reaction in a view model has two verbs (doc/ADR/0002-widget-events.md):
`set` writes the store, and `call` is for everything that is not a store
write — fetch the runs, go to a page, open a dialog. This record says
what a `call` names: how business logic is written once by developers and
reused by users who never write code, how it is registered and checked,
and how a server request and what follows it are expressed.

It also says what an application with hundreds of actions needs on top —
the builder's picker is one flat select labelled `name — description` —
and what a third party whose "user" is an AI model needs.

## 3. Details

### The model

```ts
interface ActionDefinition<P = Record<string, never>> {
  name: string; // "runs/load", "nav/go"  (namespace/name)
  description: string; // what the builder shows
  params?: Validator<P>; // zod; the builder renders it, validation checks it
  scope?: "global" | { pages: string[] }; // default "global" — not built
  handler: (ctx: ActionContext<P>) => void | Promise<void>;
}

interface ActionContext<P> {
  event: WidgetEvent; // who fired it, with payload
  store: Store; // full store: actions are host code
  args: P; // validated against `params`
  page: string; // where the reaction lives
}
```

- **Namespaced names** (`table-view/load`) keep many actions organised;
  the builder groups by namespace.
- **`params`** declares what a reaction's `with` may hold. Boot
  validation and page resolution report a `with` that does not fit as a
  problem of the cell ("reactions call actions wrongly: …"). The handler
  receives the PARSED arguments, defaults applied. The builder's reaction
  form shows one field per parameter (`settingFields(params, { json:
true })`: objects and lists are JSON fields), gates Add on the required
  ones and saves them as `with`. An action WITHOUT `params` passes `with`
  through unchecked, and the editor keeps an existing one untouched.
- **`scope`** (not built) says where an action may be used: everywhere,
  or on named pages. The registry answers `actions.for(page)`, the
  builder lists exactly that, and a reaction calling an action unknown on
  its page is a typed problem, like an unbound port.
- The context also carries an `AbortSignal`, aborted when the page
  unbinds.
- A `call` to an unknown action is reported at boot and at resolve.

### Registration

In code, once, at boot, like widgets and layout engines:

```ts
const actions = createActions();
for (const action of coreActions) actions.register(action); // predefined, global
for (const action of createRunsActions(api)) actions.register(action); // business logic
```

Business logic is packaged as factories that close over host services
(API client, router, dialog manager) and return definitions. Registries
are immutable after boot: register everything before the first render.

### Server requests and what follows

- **A fixed follow-up lives in the handler** — the common case. The
  handler writes a loading status, awaits the request, then writes the
  data or the error beside it.
- **A user-chosen follow-up is ORDER.** The reactions on one event are a
  list. The interpreter runs them in declaration order and awaits an
  async action before starting the next, so `[{ call: "runs/load" },
{ call: "nav/go", with: { to: "/demo/pagination" } }]` navigates after
  the load. A rejected action stops that event's chain and is logged.
  Synchronous reactions stay synchronous. Nothing beyond sequence is
  expressible.
- **Results travel through the store.** An action writes what it fetched
  and a status beside it; widgets bound to those paths render loading,
  data or error. Actions never emit into the bus.
- **Reactions never transform**: `from` selects, `value` is a literal,
  `with` is static. Logic is code with a name.

### The actions there are

- `table-view/load` (`@wirework/table-view`) is how a page fetches, and
  the first action with parameters.
- The playground's navigation is two actions: `nav/go { to }` (a static
  address) and `nav/follow` (no parameters: it goes where the EVENT's
  `href` points — a table's `link-clicked`). Both accept only an address
  of the application (`appPathSchema`: one leading `/`, never another
  origin).
- A predefined global set, `@wirework/actions-core`, is designed and not
  built: `nav/go`, `dialog/open-page { page }` (a wizard is a page
  rendered in a dialog), `dialog/close`, `store/set { path, value }`,
  `debug/log`. The host's page and dialog state live in the store, so
  these are ordinary state writes. `http/get` is not planned.

### Security

Actions run host code with the full store. User configuration only picks
names and parameters, validated by schema. Parameters never contain code.

### Hundreds of actions

Designed, not built (phases 4–7). Four things, in this order.

#### 1. Metadata and the catalogue

Every UI derives from the definition, never the other way round:

```ts
interface ActionDefinition {
  // ...as above, plus:
  category: string; // one word a user understands: "Load", "Navigate", "Dialog"
  tags?: string[]; // what a search matches beside name and description
  accepts?: string[]; // payload fields the handler reads ("href")
  affects?: string[]; // store roots it writes ("runs")
}
```

- `category` is the only new required field (default: the namespace).
  The rest is optional — metadata nobody fills in is worse than none.
- `scope` is built here; alone it cuts hundreds to the dozens a page can
  use.
- `describeActions(registry)` returns the CATALOGUE as JSON: name,
  description, category, tags, `params` as JSON Schema, `accepts`,
  `affects`, and the presets as worked examples. The human picker is one
  view over it; a model reads it directly. The catalogue is built before
  the picker, or the picker hard-codes what the catalogue must then
  honour.
- `ActionDefinition` becomes generic over its `params`, so a preset can
  be typed against the definition itself.
- JSON Schema comes from `zod/v4`'s own `z.toJSONSchema` (inside the zod
  3.25 the repo pins, but another API than the v3 one the contracts use)
  or from the `zod-to-json-schema` package: one migration or one
  dependency, decided when the catalogue is built.

#### 2. Presets

A preset is a named, described set of arguments for one action — "Load
runs of the last 7 days", not `runs/load with { window: "last-7d" }`.
Presets are what users pick and what a model copies.

- **Presets are DATA** under the configuration root `actionPresets`: a
  third member of `CONFIG_ROOTS` (`set` refuses it, only `setConfig`
  writes it) and a SHARED root in the layered store (it outlives a page).
- The server's presets arrive through the same loading path. `deepMerge`
  merges them by id, server over host, deep inside `with`.
- Boot validation checks the MERGED result: `presetSchema`, plus each
  preset's `with` against its action's `params`. A server preset that
  fails is DROPPED with a boot problem and the host's version of that id
  stays: a server deployment cannot take a working page down.
- A preset is a call reaction with a name a user reads: `{ call, with }`
  plus `label` (the picker's one line), `description` and `tags`. Preset
  ids follow the action grammar (`ACTION_NAME`: `namespace/name`).
- An action that has presets must DECLARE `params` (`nav/go` checks `to`
  in its handler today).

The host writes them in a typed file that stays JSON:

```ts
const tableViewLoad = { name: TABLE_VIEW_LOAD, params: tableViewArgsSchema };
export const actionPresets: Record<string, ActionPreset> = {
  "runs/table": preset(tableViewLoad, {
    label: "Load the runs table",
    tags: ["runs", "table", "load"],
    with: { url: RUNS_VIEW_URL, into: "pagination", metadata: true, pageSize: 5 },
  }),
};
```

`preset(action, body)` takes the action's name and `params` from ONE
object — the registered definition once it is generic — so the name and
the schema cannot drift. It types `with` as `z.input<P> & Json`: a wrong
field fails to compile, and the literal cannot hold a function or a Date.
Nothing runs at import: a configuration problem is data, never a throw.

A reaction REFERS to a preset:
`{ call: "table-view/load", preset: "runs/table", with?: { ...overrides } }`.

- `preset` is one optional key on a call reaction, not a third verb.
- `call` STAYS required: the view model reads without the preset table,
  and a preset whose `call` differs from the reaction's is a cell
  problem — the redundancy is the drift check.
- Resolution merges the preset's `with` under the reaction's `with` and
  validates the result.
- A reference to an unknown preset is a cell problem, like an unknown
  action.

The playground holds an EXAMPLE of the preset file
(`src/demo/action-config.ts`, the proposed contract in
`src/actions/action-presets.ts`). It typechecks; nothing loads it and no
test covers it.

#### 3. The picker

Cheapest layer first, each measured before the next:

1. A searchable select grouped by `category`. The LABEL is the
   description or the preset's label, the technical name secondary.
   Presets are listed under their action. The search matches name,
   description and tags.
2. "Used on this page" (read from the page's view models) and "recently
   used" on top. Recent use is a host concern: the builder hook takes
   `recent: string[]` as an input.
3. "Recommended for this event": the actions whose `accepts` match the
   event's payload fields come first, with the reason shown ("reads
   `href`, which this event carries"). One explainable rule, no scores.
4. A two-level cascader (category → action → preset), only if groups
   still overflow.

Every state is driveable from Gherkin in words ("When I choose the action
'Load the runs table'"): roles and labels, test ids on the groups, a
story per picker state.

#### 4. A model as the user

No separate path. The model reads the catalogue (JSON Schema per action,
presets as examples), writes a reaction, and gets back the sentences the
engine already produces ("reactions call actions wrongly: …", "reactions
read payload fields that do not exist: …") to correct itself. The
`accepts` ranking the picker shows is what a model should prefer. A
conformance test: every registered action yields a valid JSON Schema and
every preset passes its action's `params`.

### Phases

1. **The model** — BUILT, except `scope` / `for(page)` and a parameter
   that is a list of choices from the page (a "source" select).
2. **`@wirework/actions-core`**, page and dialog state in the store, a
   wizard page — not started.
3. **A "Writing an action" guide** (factory pattern, unit-test recipe) —
   not started.
4. **Metadata and the catalogue**, `scope` with `for(page)`, the generic
   definition, the conformance test — designed.
5. **Presets as data**: `ActionPreset` and `preset()` in
   `@wirework/schema`, the `actionPresets` root, `preset` on call
   reactions — designed; only the example file exists.
6. **The picker** — designed.
7. **A model as the user**: the catalogue exposed by the host, validation
   sentences returned to the caller — designed.

### Open point for the owner

Whether presets change after pages are built. If the server owns URLs or
tenant values, the reference form above is the only choice.

## 4. Options weighed

The model:

| Option                                                                          | Verdict                                                                                                                                    |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Logic in configuration: reactions that transform, branch or compute             | Dropped. Reactions select and pass literals; nothing beyond sequence is expressible, so configuration never becomes a language.            |
| Actions that emit into the bus, one action's end starting the next              | Dropped. Chains stay explicit and cannot loop. A follow-up is fixed in the handler or is the order of one event's reactions.               |
| Named host code with a declared contract, invoked by name with static arguments | Chosen. It costs a registry and a definition per action; a user's configuration only picks names and parameters, which a schema validates. |

Hundreds of actions:

| Question                     | Options                                                                                                                                                                         | Verdict                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Where presets live           | Virtual actions (a preset registers as an action calling the base one); a preset registry beside the action registry (a fifth `NamedRegistry`); DATA under a configuration root | Data. Virtual actions grow the list by the number of presets — the problem being solved. The server's presets must be merged in, and that makes a preset data, not code. |
| How a reaction uses a preset | Copy the arguments into the page at pick time; refer to the preset                                                                                                              | Refer. A copy freezes server-owned values (URLs, tenant windows) into every page; a reference keeps them live, and `with` overrides stay possible.                       |
| The order of the work        | The grouped select alone, measured before any ranking; the catalogue first                                                                                                      | Both: the catalogue (phase 4) before the picker (phase 6), and the picker's layers cheapest first, each measured before the next.                                        |
| A model as the user          | A separate path; the same catalogue                                                                                                                                             | The same catalogue and the same validation sentences.                                                                                                                    |
