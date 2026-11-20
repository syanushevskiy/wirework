# ADR-0002: Widget events — typed signals widgets emit

- **Status:** Accepted — built
- **Deciders:** the product owner

## 1. Decision

Widgets READ state from the store and EMIT everything else: there are no
output ports. A widget declares its events (kebab-case names, a payload
validator each); the engine checks every emit and stamps the source cell; the
bus is fire-and-forget. What an event DOES is declared in the view model under
`on`, as reactions with two verbs — `set` writes the store, `call` runs a host
action — that never transform. All built, except an input's custom rule from
code (a validator registry).

## 2. Problem

Widgets exchange STATE through the store (doc/ADR/0001-widget-io.md). Nothing
expressed INTENT: "a row was clicked", "filters were applied", "refresh
requested". A builder could not tell what a widget can signal either.

This record says how a widget signals something, who reacts to it, and how a
widget changes state at all — it holds no `store.set`.

## 3. Details

Diagrams: doc/events-and-reactions.drawio (1: from a click to the store, 2:
how one event's reaction chain runs).

### The rule

- A state change is an event plus a reaction (`on`) that writes the store. A
  one-shot intent is an event someone subscribes to.
- Widgets receive a `ReadableStore` (read and subscribe, no `set`).
- Events are enforced end to end: declared names, validated payloads, a
  stamped source, visible in the log, wireable by users.
- Reactions never transform: `from` selects, `value` is a literal, `with` is
  static. A handler that needs logic is an action — host code with a name.
- A noisy emitter is a widget problem, not a bus feature.

### Contract

Every `WidgetDefinition` declares its events next to its IO ports:

```ts
interface EventDefinition<T = unknown> {
  description?: string;
  payload: Validator<T>; // zod-compatible, runs on EVERY emit
  primary?: string; // the payload field carrying the main value
  writesBack?: string; // the INPUT PORT whose state this event changes
  required?: boolean; // the event carries state and has no default
}
type WidgetEvents = Record<string, EventDefinition>; // kebab-case names

interface WidgetDefinition<VM, TComponent, E extends WidgetEvents> {
  type: string;
  io: WidgetIO;
  events: E; // required; NO_EVENTS for none
  viewModel: Validator<VM>;
  component: TComponent;
}

interface WidgetProps<VM, E extends WidgetEvents> {
  viewModel: VM;
  store: ReadableStore;
  emit: Emit<E>; // only declared names, typed payloads
}
```

`Emit<E>` is inferred from the declaration literal: `emit("incremented",
{ value: 3 })` compiles, `emit("nope", …)` does not.

### Bus

```ts
interface WidgetEvent<T> {
  widget: string; // definition.type
  name: string;
  payload: T; // already validated
  source: { page: string; cell: string }; // cell identity, never type alone
  seq: number; // monotonic per bus
}

interface EventBus {
  emit(event: Omit<WidgetEvent, "seq">): void;
  subscribe<T>(filter: EventFilter<T>, listener: (e: WidgetEvent<T>) => void): Unsubscribe;
}
```

`@wirework/events` provides `createEventBus()`:

- synchronous; listener errors are isolated; the subscription set is
  snapshotted per emit;
- nested emits past 32 throw `EventLoopError`, which is NOT isolated: it
  unwinds to the original emitter, so a branching loop stops at the first
  trip. The guard sees synchronous re-emits only; a loop through the store and
  a re-render is outside the bus;
- no replay, no last value. The last value is state — write it to the store;
- a host may substitute its own bus (a recording bus in tests), like the
  store.

### Emitting

The engine builds one `emit` per rendered cell (`createEmitter`); the React
adapter memoizes it (`useCellEmitter`) and passes it as a prop. The emitter:

1. rejects names the widget did not declare (`WidgetEventError`),
2. validates the payload with the declared validator (`WidgetEventError`),
3. stamps `{ page, cell }` — a widget cannot forge its source.

Violations throw: they are widget bugs. Emit from event handlers only, never
from an effect's body (StrictMode double-fires them).

### Who reacts — three layers

1. **Host code** — for behaviour the application owns and nobody configures:

   ```ts
   useWidgetEvent(
     bus,
     eventFilter(antdTable, "row-selected", { page: "pagination", cell: "table-main" }),
     (event) => store.set("pagination.selected", event.payload.key), // typed, no cast
   );
   ```

   `eventFilter(definition, name, cell?)` carries the payload type to the
   listener. A plain `{ widget?, name?, cell? }` filter works too (payload
   `unknown`); an empty filter matches everything.

2. **Reactions** — the view model says what the widget's events do (below).
3. **Host actions** (`ActionDefinition`, doc/ADR/0005-actions.md) — everything
   that is not a store write: refresh the runs, open a dialog. Registered with
   `createActions()` under a kebab-case name and a description; the handler
   receives the event, the store and the reaction's static `with` args. An
   unknown name at runtime is logged, never thrown.

### Reactions

A widget's view model declares what its events do under the reserved `on` key
next to `inputs`:

```ts
on: { "row-selected": [{ set: "pagination.selected", from: "key" }] }
```

- `reactionSchema` is `{ set: storePath, from?: payloadPath, value?: literal }`
  (`from` and `value` are exclusive) or `{ call: actionName, with?: args }`.
- `set` writes `value` if given, else the payload field at `from`, else the
  whole payload. `call` runs a host action.
- `eventBindingsSchema(events)` derives a strict `on` section from the events
  declaration; `widgetBindingsSchema(io, events)` builds `inputs + on`.
- `bindReactions(bus, store, plan)` (engine) subscribes every resolved cell's
  reactions to THAT cell's events and returns one unsubscribe; `useReactions`
  keeps them bound while `PageView` is mounted.
- Reactions are not a workflow engine and are not to grow into one.

Timing is part of the contract:

- the reactions of one event run in declaration order;
- synchronous ones run synchronously inside the emit (a controlled input's
  `set` must land in its change handler);
- an async action is awaited before the next reaction starts;
- a failure is logged and stops that chain;
- unbinding the page aborts chains in flight: the rest never starts, and the
  action's `signal` is aborted.

### Default write-back

A controlled widget — input, checkbox, select, multi-select, filter-bar,
pagination, refresher, the counter — writes its value back to its port without
a line in the template. The CONTRACT says so:

```ts
events: {
  changed: {
    payload: z.object({ value: z.string(), valid: z.boolean(), message: z.string().optional() }),
    primary: "value",
    writesBack: "value",
  },
},
```

- `writesBack` names an input port. A port nobody declared fails the widget
  and the contract at boot; an implementation must name the same port as its
  contract.
- The default reaction is `{ set: <the port's bound path>, from: <primary> }`,
  or `{ set: <path> }` (the whole payload) for an event without a primary
  field (the refresher's schedule).
- The engine puts it in place when it RESOLVES a template
  (`withDefaultReactions`, inside `checkTemplate`), FIRST under its event — so
  a `call` that reloads a table runs after the value is stored.
- A template that declares the same write itself (`sameReaction`) is left
  alone: it runs where it was placed, once.
- The plan, boot validation, `bindReactions` and the editor all see one list.
  A caller binding a view model of its own (the story harness) calls
  `withDefaultReactions` itself.
- An unbound port gives no default — and the port is required, so that is a
  problem already reported.
- `required: true` is for events that carry state and have NO default (the
  refresher's `refresh`). A cell that binds no reaction to one is a reported
  problem.
- The table's `filter-changed` has no default on purpose: it carries several
  ports' state, and a default for one would be half a default. Its templates
  declare the writes.

### Validation

- **Registration:** a definition without an `events` object, with a
  non-kebab-case event name, or with an event lacking a payload validator is
  rejected (`RegistrationError`, the one error class of every registry).
- **Emit:** an undeclared name or an invalid payload throws
  `WidgetEventError`.
- **Boot and resolve** (the same `contractProblems`): reacting to an
  undeclared event fails the widget's own schema. A required event without a
  reaction, a `call` to an unregistered action, and a `from` naming a field
  the payload lacks are reported problems.

### Page events and load events

What happens when a page opens is a reaction too — typically the action that
fetches the data.

**A page emits `load`**, once per opening, after its reactions are bound. The
page's reactions live in the view models, BESIDE the templates:

```ts
viewModels: {
  pages:   { run: { default: { engine, cells } } },
  on:      { run: { load: [{ call: "run/load" }] } },   // page -> event -> reactions
  widgets: { … },
}
```

- Not inside a page template: a template belongs to its layout engine, a page
  may have several, and a user's own copy must never carry reactions. Base
  view models only — the user overlay has no `on`.
- `pageEvents` (`@wirework/schema`) declares them (today: `load`, payload
  `{ page }`). `pageBindingsSchema` is strict: `on: { opened: … }` is refused.
- On the bus a page event has `widget: "page"` and the EMPTY cell id, which no
  cell can have.
- `checkPageReactions` is the one rule for render and boot: an unknown action,
  arguments that do not fit the action's `params`, a `from` naming a field the
  payload lacks. Wrong reactions are ignored as a whole, loudly — a warning on
  the plan (the page still renders), an error at boot.
- `plan.on` holds what will run; `bindReactions` binds it like a cell's.
- `usePageLoad` (adapter, inside `PageView`) emits it. `emitPageLoad` is the
  engine call for other adapters: once per opening, AFTER `bindReactions`.

**A table emits `load`**, once when it appears (`table` contract). The table
never fetches; its reaction does:

```ts
table: { default: {
  inputs: { rows: "pagination.data", columns: "pagination.columns", loading: "pagination.loading" },
  on: { load: [{ call: "table-view/load", with: { url: "/api/v1/view/runs", into: "pagination" } }] } } }
```

So a table added in the builder loads its data by itself. The page's `load` is
for what belongs to the page (the record an address names), the table's for
what belongs to that table.

**Both are deferred.** Effects of one commit run children first and the page
binds its reactions in an effect; StrictMode mounts, unmounts and mounts again.
So both events fire from a task scheduled by the mount effect and cleared by
its cleanup (`useAfterMount` for widgets): once, for the binding that stays. A
host's own opening code runs before them.

**Loading again.** A host that CHANGES a page while it is open says so by
changing `PageView`'s `reloadKey`: the page's `load` fires again and the cells
mount afresh, so every widget that asks for its data when it appears asks
again, by the new configuration. The store is untouched. The playground does
it after Add widget and after Save page, not after Cancel. Nothing re-fires by
itself: the HOST decides when a page loads again. (`table-view/load` applies a
page size declared anew instead of the one the last answer left in the store.)

Both show in the event log (`page · load`, `antd-table · load`).

### Input validation (antd-input as the reference)

A text input is a CONTROLLED widget: the text lives in the store (input port
`value`), each keystroke emits `changed { value, valid, message? }`, and the
default reaction writes `value` back. Validity travels in the payload, so a
second reaction can store the message.

- **Premade rules:** a closed enum setting `validation` (none, required,
  email, integer, url), shown by the builder as a select.
- **Custom rule from configuration:** a regular expression (`pattern` +
  `patternMessage`), no code.
- **Custom rule from code: NOT BUILT.** The design: a VALIDATOR registry the
  host fills (`{ name, description, validate(value) }`), injected into widgets
  like `emit` and offered as a select — the shape of the action registry.
  Validators stay pure functions of the value; anything needing the store or
  the bus is an action.

The same "never transform" line holds for a table's cell kinds
(`table-cell.ts` in `@wirework/widget-contracts`): a link cell's `to:
"/demo/runs/{id}"` is a pattern whose slots SELECT row properties, with
URL-encoding as its only processing. A link's plain click is an event
(`link-clicked`, payload `href`); going there is the host's `nav/follow`.

### Builder and playground

- The builder lists "Emits" (name and description) for the selected widget,
  from `definition.events`, and marks required events with `*`.
- Per event it shows the reactions as a LIST of rows run in order — "set
  <store path> from <payload field>" or "call <action>" with the action's
  parameters; "+ reaction" adds one, × removes one. Add is gated on a required
  event's reaction.
- `from` is a select of the payload's top-level keys plus "whole payload". It
  defaults to `primary`, else the only key, else the whole payload.
- The default write-back shows above the rows, read-only, following the port
  field as the user types. A row equal to the default is NOT saved
  (`collect`), and the editor leaves a leading default out of its rows
  (`valuesFromViewModel`): the default follows the port, a saved copy would go
  stale.
- What a row does not show (a set's `value`, a parameterless call's `with`)
  survives a save while the row's target is unchanged.
- The playground's Event Log subscribes with an empty filter and shows the
  last 50 events newest first, each row with `data-widget`, `data-event`,
  `data-cell` and the payload JSON.

### How it is tested

`e2e/features/events.feature`, `load-events.feature` and `builder.feature`;
the engine's `resolve.test.ts` ("default write-back"), reactions tests and
`failure-path.test.ts` (a reaction to an undeclared event, from
`failurePathViewModels`); the `WritesBackByDefault` story.

## 4. Options weighed

| Option                                             | Verdict                                                                                                                                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intents as store writes                            | Dropped. No new concept, but last-value semantics (bursts collapse to one render), transient junk in exported state, phantom events when the inspector applies a snapshot.                                      |
| Output ports for the state a widget changes        | Dropped. Declarative only: the write itself was an unchecked `store.set` inside widget code.                                                                                                                    |
| Typed events on a bus, reactions in the view model | Chosen. Names and payloads checked on every emit, the source stamped, behaviour declared under `on`. Costs a bus and a reaction per state change — which the default write-back removes for controlled widgets. |
| A bus that replays or keeps the last value         | Dropped. What must be remembered is state, and state is written to the store.                                                                                                                                   |
| Reactions that compute (expressions, conditionals) | Dropped. It grows into a workflow engine by accretion; logic is an action — host code with a name.                                                                                                              |
