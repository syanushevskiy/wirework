/**
 * Story harness — the SAME wiring a host gives a widget, in isolation:
 *  - a fresh store seeded per story (inputs read from it),
 *  - a bus whose every event lands in Storybook's Actions panel,
 *  - a cell-scoped, payload-validating `emit` from the engine,
 *  - the view model's own reactions bound, so a counter increments and an
 *    input stores its text exactly as on a page,
 *  - the per-cell error boundary, so a crashing widget shows the placeholder,
 *  - a live readout of the store underneath.
 * `storyArgTypes` turns a widget's primitive settings into controls, the
 * same introspection the builder uses.
 *
 * Dev-only: story code may depend on engine/store/events; widget code never does.
 */
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { action } from "storybook/actions";
import type { AnyWidgetDefinition, WidgetProps } from "@wirework/schema";
import { settingFields } from "@wirework/schema";
import { bindCellReactions, createEmitter, errorText, readableStore } from "@wirework/engine";
import { createEventBus } from "@wirework/events";
import { useStoreSnapshot, WidgetErrorBoundary } from "@wirework/react";
import { createStore } from "@wirework/store";

export interface WidgetStoryProps {
  definition: AnyWidgetDefinition;
  /** The widget's view model template (bindings + settings), validated by the widget. */
  viewModel: Record<string, unknown>;
  /** Initial store state the inputs read from. */
  seed?: Record<string, unknown>;
}

function StoreReadout({ snapshot }: { snapshot: Record<string, unknown> }) {
  return (
    <pre data-testid="story-store" style={{ marginTop: "1rem", fontSize: "0.75rem", opacity: 0.7 }}>
      {JSON.stringify(snapshot, null, 2)}
    </pre>
  );
}

function StoryStore({ store }: { store: ReturnType<typeof createStore> }) {
  const snapshot = useStoreSnapshot(store);
  return <StoreReadout snapshot={snapshot} />;
}

export function WidgetStory({ definition, viewModel, seed = {} }: WidgetStoryProps) {
  // One store + bus per mounted story (re-mount with `key` to re-seed).
  const [{ store, bus }] = useState(() => ({ store: createStore(seed), bus: createEventBus() }));

  const parsed = useMemo(() => {
    try {
      return { viewModel: definition.viewModel.parse(viewModel) as unknown };
    } catch (error) {
      return { problem: errorText(error) };
    }
  }, [definition, viewModel]);

  const emit = useMemo(
    () => createEmitter(bus, definition, { page: "storybook", cell: "story" }),
    [bus, definition],
  );

  // Every event -> Actions panel.
  useEffect(
    () => bus.subscribe({}, (event) => action(`${event.widget}/${event.name}`)(event.payload)),
    [bus],
  );

  // The story's own reactions (`on`) run exactly as on a page.
  useEffect(() => {
    if ("problem" in parsed) return undefined;
    return bindCellReactions(bus, store, { page: "storybook", cell: "story", viewModel: parsed.viewModel });
  }, [bus, store, parsed]);

  const readable = useMemo(() => readableStore(store), [store]);
  const Widget = definition.component as ComponentType<WidgetProps>;

  return (
    <div data-testid="story">
      {"problem" in parsed ? (
        <div role="alert" className="ww-cell-problem">
          Invalid view model: {parsed.problem}
        </div>
      ) : (
        <div className="ww-cell">
          <WidgetErrorBoundary widgetType={definition.type}>
            <Widget viewModel={parsed.viewModel} store={readable} emit={emit} />
          </WidgetErrorBoundary>
        </div>
      )}
      <StoryStore store={store} />
    </div>
  );
}

type ArgType = { control: "text" | "number" | "boolean" | "select"; options?: string[]; description?: string };

/** Controls for a widget's primitive settings — the builder's introspection, reused. */
export function storyArgTypes(definition: AnyWidgetDefinition): Record<string, ArgType> {
  return Object.fromEntries(
    settingFields(definition.viewModel).map((field) => [
      field.name,
      {
        control: field.kind,
        ...(field.options ? { options: field.options } : {}),
        ...(field.description ? { description: field.description } : {}),
      },
    ]),
  );
}

/** Default args for a widget's settings (from `.default()`), so stories start populated. */
export function storyArgs(definition: AnyWidgetDefinition): Record<string, unknown> {
  return Object.fromEntries(
    settingFields(definition.viewModel).flatMap((field) =>
      field.defaultValue === undefined ? [] : [[field.name, field.defaultValue]],
    ),
  );
}
