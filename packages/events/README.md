# @wirework/events

The widget event bus — the default implementation of the `EventBus`
contract of `@wirework/schema`. Widgets emit typed events through it;
reactions and host code subscribe by widget type, event name, page and
cell.

- `createEventBus()` — synchronous and fire-and-forget: every matching
  subscriber in registration order, one throwing listener never starving
  the rest, (un)subscribing during a notification allowed.
- `matchesFilter(filter, event)` — the one rule of what a subscription's
  filter matches: every set field, unset fields match all.
- `EventLoopError`, `MAX_EMIT_DEPTH` — a listener re-emitting in a loop
  fails loudly after 32 nested emits, all the way up to the emitter.
