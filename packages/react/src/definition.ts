/**
 * React binding of the framework-agnostic widget contract: the `component`
 * slot is a React component receiving WidgetProps typed by the widget's
 * view model AND its events declaration.
 */
import type { ComponentType } from "react";
import type {
  AnyWidgetContract,
  ContractProps,
  ContractViewModel,
  WidgetDefinition,
  WidgetEvents,
  WidgetPreviewSpec,
  WidgetProps,
} from "@wirework/schema";
import { lazyComponent, type ComponentLoader } from "./lazy";

export type ReactWidgetDefinition<VM = unknown, E extends WidgetEvents = WidgetEvents> = WidgetDefinition<
  VM,
  ComponentType<WidgetProps<VM, E>>,
  E
>;

/**
 * Identity helper for authoring React widgets with full type inference:
 * `defineWidget<VM, typeof events>({ ... })` makes `emit` accept only the
 * declared names with their declared payloads.
 */
export function defineWidget<VM, E extends WidgetEvents = WidgetEvents>(
  def: ReactWidgetDefinition<VM, E>,
): ReactWidgetDefinition<VM, E> {
  return def;
}

/** The component itself, in the bundle of whoever imports the definition. */
interface EagerComponent<P> {
  component: ComponentType<P>;
  load?: undefined;
}

/**
 * The component's code asked for when a page first shows the widget
 * (doc/ADR/0018-lazy-widgets.md): `load: () => import("./code-editor")`, the
 * module's default export being the component. The contract stays in the
 * bundle — validation, the builder's form and the palette need nothing else.
 */
interface LazyLoadedComponent<P> {
  load: ComponentLoader<P>;
  component?: undefined;
  /** What the cell shows meanwhile: a least height where the cell sizes to its content (4.5rem when absent). */
  placeholder?: { minHeight: string };
}

export type ContractImplementation<C extends AnyWidgetContract> = {
  /** Unique registry name of THIS implementation ("antd-button", "mui-button"). */
  type: string;
  /** Defaults to the contract's description. */
  description?: string;
  /** Defaults to the contract's preview. */
  preview?: WidgetPreviewSpec;
} & (EagerComponent<ContractProps<C>> | LazyLoadedComponent<ContractProps<C>>);

/**
 * A widget definition that implements a contract: ports, events and view
 * model come from the contract, only the component (and the type name) is
 * the implementation's — given as `component`, or as `load` for a heavy one
 * only the pages that show it should download. The definition records the
 * contract's `kind`.
 */
export function implementContract<C extends AnyWidgetContract>(
  contract: C,
  implementation: ContractImplementation<C>,
): ReactWidgetDefinition<ContractViewModel<C>, C["events"]> {
  const description = implementation.description ?? contract.description;
  const preview = implementation.preview ?? contract.preview;
  return {
    type: implementation.type,
    ...(description === undefined ? {} : { description }),
    kind: contract.kind,
    ...(preview === undefined ? {} : { preview }),
    ...(contract.contains === undefined ? {} : { contains: contract.contains }),
    io: contract.io,
    events: contract.events,
    viewModel: contract.viewModel,
    component:
      implementation.load === undefined
        ? implementation.component
        : lazyComponent(implementation.load, {
            name: implementation.type,
            minHeight: implementation.placeholder?.minHeight,
          }),
  };
}
