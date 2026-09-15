# Widget events — typed signals widgets emit

## Motivation

Widgets already exchange STATE through the store (doc/widget-io-design.md).
Nothing expresses INTENT: "a row was clicked", "filters were applied",
"refresh requested". Modelling those as store writes gives last-value
semantics (bursts collapse to one render), pollutes exported state with
transient junk, and replays phantom events when the inspector applies a
snapshot. A builder also cannot tell what a widget can signal.

**Rule:** widgets READ state from the store and EMIT everything else. A
state change is an event plus a reaction (`on`) that writes the store; a
one-shot intent is an event someone subscribes to. There are no output
ports (decision below).

## Contract

Every `WidgetDefinition` declares its events next to its IO ports:

```ts
interface EventDefinition<T = unknown> {
  description?: string;
  payload: Validator<T>;         // zod-compatible, runs on EVERY emit
}
type WidgetEvents = Record<string, EventDefinition>;   // kebab-case names

interface WidgetDefinition<VM, TComponent, E extends WidgetEvents> {
  type: string;
  io: WidgetIO;
  events: E;                     // NEW — required; NO_EVENTS for none
  viewModel: Validator<VM>;
  component: TComponent;
}

interface WidgetProps<VM, E extends WidgetEvents> {
  viewModel: VM;
  store: Store;
  emit: Emit<E>;                 // NEW — only declared names, typed payloads
}
```

`Emit<E>` is inferred from the declaration literal: `emit("incremented",
{ value: 3 })` compiles, `emit("nope", …)` does not.

```ts
const events = {
  incremented: {
    description: "Fired after the counter wrote its new value",
    payload: z.object({ value: z.number() }),
  },
} satisfies WidgetEvents;

function DummyCounter({ viewModel, store, emit }: WidgetProps<VM, typeof events>) { … }

export const dummyCounter = defineWidget<VM, typeof events>({ type, io, events, viewModel, component });
```

## Bus

```ts
interface WidgetEvent<T> {
  widget: string;                // definition.type
  name: string;
  payload: T;                    // already validated
  source: { page: string; cell: string };   // cell identity, never type alone
  seq: number;                   // monotonic per bus
}

interface EventBus {
  emit(event: Omit<WidgetEvent, "seq">): void;
  subscribe<T>(filter: EventFilter<T>, listener: (e: WidgetEvent<T>) => void): Unsubscribe;
}
```

`@wirework/events` provides `createEventBus()`: synchronous, listener
errors isolated, subscription set snapshotted per emit, nested emits past
`MAX_EMIT_DEPTH` throw `EventLoopError`. Hosts may substitute their own bus
(a recording bus in tests), exactly like the store.

Fire-and-forget by design: no replay, no last value. Need the last value?
That is state — write it to the store (see host example below).

## Emitting

The engine builds one `emit` per rendered cell (`createEmitter`), the React
adapter memoizes it (`useCellEmitter`) and passes it as a prop. The emitter:

1. rejects names the widget did not declare (`WidgetEventError`),
2. validates the payload with the declared validator (`WidgetEventError`),
3. stamps `{ page, cell }` — a widget cannot forge its source.

Violations throw: they are widget bugs. Emit from event handlers only;
never from effects (StrictMode double-fires them).

## Subscribing

Host code:

```ts
useWidgetEvent(bus, eventFilter(dummyRunsTable, "row-selected"), (event) =>
  store.set("runs.selected", event.payload.id),   // payload typed, no cast
);
```

`eventFilter(definition, name, cell?)` carries the payload type from the
declaration to the listener. A plain `{ widget?, name?, cell? }` filter
works too (payload `unknown`); an empty filter matches everything.

## Validation

- **Registration**: a definition without an `events` object, with a
  non-kebab-case event name, or with an event lacking a payload validator
  is rejected (`WidgetRegistrationError`).
- **Emit**: undeclared name / invalid payload throw `WidgetEventError`.
- **Boot**: nothing yet — view models do not reference events in v1.

## Builder and playground

- The builder lists "Emits" (name + description) for the selected widget,
  read from `definition.events`.
- The playground's Event Log subscribes with an empty filter and shows the
  last 50 events newest first, each row carrying `data-widget`,
  `data-event`, `data-cell` and the payload JSON — visible to people,
  addressable to Gherkin scenarios (e2e/features/events.feature).
- Host example: `row-selected` from the runs table is turned into
  `runs.selected` in the store; an echo cell displays it.

## Outputs replaced by events (built)

Output ports were removed. They were declarative only: the write itself
was an unchecked `store.set` inside widget code. Events are enforced end to
end — declared names, validated payloads, stamped source, visible in the
log, wireable by users. So:

- widgets receive a `ReadableStore` (no `set`) — enforcement, not a cast;
- an `EventDefinition` may be `required: true`: the event carries state,
  so boot validation and resolve report a cell whose view model binds no
  reaction to it (`unboundRequirements`, the same check as required ports);
- the builder marks required events with `*` and gates Add on their
  reaction path, so the common case ("counter stores its value") is still
  one input field + one reaction field. For object payloads the `from`
  field is a select of the payload's top-level keys (plus "whole payload")
  and DEFAULTS to the only key — writing `{ value }` into a number-typed
  path was the classic wiring trap.

Ren's two conditions are policy: reactions never transform (`from` selects,
`value` is a literal — no expressions), and a noisy emitter is a widget
problem, not a bus feature.

## Listening and handling — three layers

A widget only EMITS (the button is the archetype: no inputs, no state, one
`clicked` event). WHO reacts, and how, is layered:

1. **Host code** — `useWidgetEvent(bus, eventFilter(dummyButton, "clicked"),
   handler)` or `bus.subscribe(...)`: for behaviour the application owns and
   nobody configures. Typed payload, no cast.
2. **User configuration (reactions)** — the widget's view model says what
   its events DO, with exactly two verbs:
   - `{ set, from?, value? }` writes the store (state changes);
   - `{ call, with? }` runs a host-registered ACTION by name.
   The builder offers both per event: a store path + payload field, or a
   dropdown of the registered actions with their descriptions. Required
   events must have one of them.
3. **Host actions (`ActionDefinition`)** — the escape hatch for everything
   that is not a store write: refresh the runs, reset a counter, open a
   dialog. Registered with `createActions()` under a kebab-case name and a
   description; the handler receives the event, the store and the
   reaction's static `with` args. Boot validation and resolve report a
   reaction that calls an unregistered name; at runtime an unknown name is
   logged, never thrown.

`EventDefinition.primary` names the payload field carrying the event's main
value; builders default a `set` reaction's `from` to it (else to the only
field, else to the whole payload).

### Input validation (dummy-input as the reference)

A text input is a CONTROLLED widget: the text lives in the store (input
port `value`), each keystroke emits `changed { value, valid, message? }`,
and the required reaction writes `value` back. Validity travels in the
payload so a second reaction can store the message somewhere.

- **Premade rules** are a closed enum setting (`validation`: none,
  required, email, integer, url) — the builder shows it as a select because
  enum settings are introspected like the others.
- **Custom rule from configuration** is a regular expression setting
  (`pattern` + `patternMessage`), no code.
- **Custom rule from code** is not built. The team's design: a VALIDATOR
  registry the host fills (`{ name, description, validate(value) }`),
  injected into widgets like `emit` and offered as a select — the exact
  shape of the action registry, so no new concept. Ren's condition applies:
  validators stay pure functions of the value; anything needing the store
  or the bus is an action, not a validator.

Team decision (Ren's guardrail, unchanged): reactions never transform.
`from` selects, `value` is a literal, `with` is static. The moment a
handler needs logic, it is an action — host code with a name — not a
config expression.

## Reactions — phase two (built)

A widget's view model may declare what its events DO, under the reserved
`on` key next to `inputs`:

```ts
on: { "row-selected": [{ set: "runs.selected", from: "id" }] }
```

`reactionSchema = { set: storePath, from?: payloadPath, value?: literal }`.
The only action is `set`: write `value` if given, else the payload field at
`from`, else the whole payload. The team's explicit decision is to NOT grow
this into a workflow engine by accretion — a second action needs a second
design.

- `eventBindingsSchema(events)` derives the `on` section from the events
  declaration (strict), so reacting to an undeclared event is rejected by
  the widget's own validator at boot and at resolve — same mechanism as
  ports. `widgetBindingsSchema(io, events)` builds `inputs + on`.
- `bindReactions(bus, store, plan)` (engine) subscribes every resolved
  cell's reactions to THAT cell's events and returns one unsubscribe;
  `useReactions` keeps them bound while `PageView` is mounted.
- The builder shows, per event, "on <event>: set <store path> from <payload
  field>"; a non-empty path becomes a reaction in the new template. That is
  the user-level subscription: no code, saved in the view model, visible in
  the state inspector.
- Tested in e2e/features/events.feature (fixture reaction on the counter;
  builder-wired reaction on the runs table). The "reaction to an undeclared
  event is rejected at boot" case lives in `failurePathViewModels`
  (@wirework/view-data-models-examples, cell `bad-reaction`) for engine
  tests — it is no longer on a playground page.
