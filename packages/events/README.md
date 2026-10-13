# @wirework/events

The widget event bus — the default implementation of the `EventBus`
contract of `@wirework/schema`. Widgets emit typed events through it;
reactions and host code subscribe by widget type, event name, page and
cell (every set field of the filter must match, unset fields match all).

- `createEventBus()` — synchronous and fire-and-forget: every matching
  subscriber in registration order, one throwing listener never starving
  the rest, (un)subscribing during a notification allowed.
- `EventLoopError` — a listener re-emitting in a loop fails loudly after
  32 nested emits, all the way up to the emitter.
