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

export type ReactWidgetDefinition<
  VM = unknown,
  E extends WidgetEvents = WidgetEvents,
> = WidgetDefinition<VM, ComponentType<WidgetProps<VM, E>>, E>;

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

export interface ContractImplementation<C extends AnyWidgetContract> {
  /** Unique registry name of THIS implementation ("antd-button", "mui-button"). */
  type: string;
  /** Defaults to the contract's description. */
  description?: string;
  /** Defaults to the contract's preview. */
  preview?: WidgetPreviewSpec;
  component: ComponentType<ContractProps<C>>;
}

/**
 * A widget definition that implements a contract: ports, events and view
 * model come from the contract, only the component (and the type name) is
 * the implementation's. The definition records the contract's `kind`.
 */
export function implementContract<C extends AnyWidgetContract>(
  contract: C,
  implementation: ContractImplementation<C>,
): ReactWidgetDefinition<ContractViewModel<C>, C["events"]> {
  return {
    type: implementation.type,
    description: implementation.description ?? contract.description,
    kind: contract.kind,
    preview: implementation.preview ?? contract.preview,
    io: contract.io,
    events: contract.events,
    viewModel: contract.viewModel,
    component: implementation.component,
  };
}
