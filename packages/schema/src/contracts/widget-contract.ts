/**
 * Widget contracts — a widget declaration WITHOUT the component
 * (doc/widget-contracts-design.md).
 *
 * A contract fixes what a KIND of widget is: its input ports, its events
 * and its settings. "A button" is: no inputs, a `clicked` event, a `label`
 * setting. Any implementation — plain HTML, a design system, another
 * library — implements the same contract, so pages, builder forms,
 * reactions and conformance stories keep working when the implementation
 * is swapped. Contracts are data (zod + the contract types), never React.
 *
 * `@wirework/widget-contracts` ships the standard kinds; an application
 * defines its own with `defineContract` and registers them next to the
 * standard ones (engine `createContracts`).
 */
import { z } from "zod";
import type { WidgetEvents } from "./events";
import type { WidgetIO } from "./io";
import { widgetBindingsSchema } from "./reactions";
import type { WidgetPreviewSpec, WidgetProps } from "./widget";

export interface WidgetContractInput<
  IO extends WidgetIO,
  E extends WidgetEvents,
  S extends z.ZodRawShape,
> {
  /** Kebab-case kind name ("label", "button", "input", ...). */
  kind: string;
  /** What implementations must do — shown by builders as the group label. */
  description?: string;
  io: IO;
  events: E;
  /** The widget's own settings (a zod object); builders render them as fields. */
  settings: z.ZodObject<S>;
  /** Default palette preview for every implementation of this kind. */
  preview?: WidgetPreviewSpec;
}

/**
 * A contract: the input plus the DERIVED view-model schema
 * (inputs + on + settings), so contract and schema can never drift.
 */
export function defineContract<
  IO extends WidgetIO,
  E extends WidgetEvents,
  S extends z.ZodRawShape,
>(input: WidgetContractInput<IO, E, S>) {
  return {
    // `.extend()` on a strict object stays strict: an unknown setting key is
    // a config error, never silently stripped.
    ...input,
    viewModel: widgetBindingsSchema(input.io, input.events).extend(input.settings.shape),
  };
}

export type WidgetContract<
  IO extends WidgetIO = WidgetIO,
  E extends WidgetEvents = WidgetEvents,
  S extends z.ZodRawShape = z.ZodRawShape,
> = ReturnType<typeof defineContract<IO, E, S>>;

/** Erasure point for registries. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyWidgetContract = WidgetContract<any, any, any>;

/** The view model an implementation of `C` receives. */
export type ContractViewModel<C extends AnyWidgetContract> = z.infer<C["viewModel"]>;

/** The props an implementation of `C` receives: typed view model + typed emit. */
export type ContractProps<C extends AnyWidgetContract> = WidgetProps<ContractViewModel<C>, C["events"]>;
