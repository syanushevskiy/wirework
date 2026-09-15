/**
 * React binding of the framework-agnostic widget contract: the `component`
 * slot is a React component receiving WidgetProps typed by the widget's
 * view model AND its events declaration.
 */
import type { ComponentType } from "react";
import type { WidgetDefinition, WidgetEvents, WidgetProps } from "@wirework/schema";

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
