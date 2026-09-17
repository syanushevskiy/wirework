/**
 * Widget contract — framework-agnostic.
 *
 * A widget is a registration envelope: identity, typed input ports, typed
 * events, view-model validator, and an OPAQUE component slot. The engine never
 * touches the component; a framework adapter (e.g. @wirework/react) narrows
 * the `TComponent` type and knows how to render it. Widget CODE imports this
 * package plus its framework adapter — never engine, store or bus
 * internals (the adapter itself uses them to render and preview).
 */
import type { Emit, WidgetEvents } from "./events";
import type { WidgetIO } from "./io";
import type { ReadableStore } from "./store";

/**
 * Structural validator — `zod` schemas satisfy this shape without this
 * package prescribing a validation library to widget authors.
 * `parse` MUST throw on invalid input and return the typed value on success.
 */
export interface Validator<T> {
  parse(input: unknown): T;
}

/** Props every widget component receives from a rendering adapter. */
export interface WidgetProps<VM = unknown, E extends WidgetEvents = WidgetEvents> {
  /**
   * The widget's RESOLVED view model: selected template merged with the
   * user's settings overlay, already validated by `viewModel`.
   */
  viewModel: VM;
  /**
   * The READ side of the store — the only channel to read/observe data.
   * Widgets never write: emit an event and let a reaction write.
   */
  store: ReadableStore;
  /**
   * Emit one of the widget's DECLARED events. Scoped to this cell: the
   * adapter stamps the source and validates the payload. Call it from
   * event handlers, never from effects (StrictMode double-fires those).
   */
  emit: Emit<E>;
}

/**
 * Sample data for a catalog/palette preview (doc/widget-previews-design.md):
 * the widget is rendered live, in an isolated sandbox, with this.
 */
export interface WidgetPreviewSpec {
  /** Store state the preview's input ports read (e.g. `{ preview: { count: 3 } }`). */
  seed?: Record<string, unknown>;
  /** View-model template (bindings + settings) to render with; `{}` when absent. */
  viewModel?: Record<string, unknown>;
}

/** The registration envelope for a widget. */
export interface WidgetDefinition<
  VM = unknown,
  TComponent = unknown,
  E extends WidgetEvents = WidgetEvents,
> {
  /**
   * Unique registry name. Layout cells reference it via `widget: "<type>"`.
   * Must be a non-empty kebab-case string.
   */
  type: string;
  /** Human description shown by builders next to the type. */
  description?: string;
  /**
   * The contract kind this widget implements ("label", "button", ...),
   * set by `implementContract`. Tooling groups and searches by it; a registry
   * created with the contracts checks the kind is registered and matches.
   */
  kind?: string;
  /** Sample data for a live palette preview; without it the palette tries `{}`. */
  preview?: WidgetPreviewSpec;
  /**
   * Typed input ports (store values the widget reads). The view model
   * binds port names to store paths under the reserved `inputs` key.
   * See doc/widget-io-design.md.
   */
  io: WidgetIO;
  /**
   * Typed events the widget emits (kebab-case name -> payload validator).
   * Required; use NO_EVENTS for none. See doc/widget-events-design.md.
   */
  events: E;
  /**
   * Validator for this widget's view-model templates. The engine runs it
   * at boot validation and before every render — an invalid template fails
   * loudly instead of rendering garbage.
   */
  viewModel: Validator<VM>;
  /**
   * Framework-specific renderer, opaque to the engine. Typed by the
   * framework adapter (ReactWidgetDefinition in @wirework/react).
   */
  component: TComponent;
}

/**
 * Erasure point for collecting definitions into heterogeneous lists.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyWidgetDefinition = WidgetDefinition<any, any, any>;
