/**
 * Story harness — the SAME wiring a host gives a widget, in isolation:
 *  - a fresh store seeded per story (inputs read from it),
 *  - a bus whose every event lands in Storybook's Actions panel,
 *  - a cell-scoped, payload-validating `emit` from the engine,
 *  - the view model's reactions bound, the default write-backs among them,
 *    so a counter increments and an input stores its text exactly as on a page,
 *  - the per-cell error boundary, so a crashing widget shows the placeholder,
 *  - a live readout of the store underneath,
 *  - optionally DRIVEN store values (`data` / `onData`) and a cell width —
 *    what the playground story (playground.tsx) puts controls on.
 * `storyArgTypes` turns a widget's primitive settings into controls, the
 * same introspection the builder uses; `playground` goes all the way:
 * every setting, every input port's data, the cell.
 *
 * Dev-only: story code may depend on engine/store/events; widget code never does.
 */
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { action } from "storybook/actions";
import type { AnyWidgetDefinition, ViewModels, WidgetProps } from "@wirework/schema";
import { settingFields } from "@wirework/schema";
import {
  bindCellReactions,
  createEmitter,
  errorText,
  readableStore,
  withDefaultReactions,
  type LayoutEngineRegistry,
  type WidgetRegistry,
} from "@wirework/engine";
import { createEventBus } from "@wirework/events";
import { CellKeyContext, PageContext, useStoreSnapshot, WidgetErrorBoundary, type PageScope } from "@wirework/react";
import { createStore } from "@wirework/store";

export interface WidgetStoryProps {
  definition: AnyWidgetDefinition;
  /** The widget's view model template (bindings + settings), validated by the widget. */
  viewModel: Record<string, unknown>;
  /** Initial store state the inputs read from. */
  seed?: Record<string, unknown> | undefined;
  /**
   * Store values DRIVEN from outside (a playground's data controls): path ->
   * value, written into the store whenever they change.
   */
  data?: Record<string, unknown> | undefined;
  /**
   * Called when the store holds something else at one of the `data` paths —
   * the widget's own reaction wrote it (a click, a keystroke) — so controls
   * can follow what the widget did.
   */
  onData?: ((path: string, value: unknown) => void) | undefined;
  /** Width of the cell the widget sits in, px; the full canvas when absent. */
  cellWidth?: number | undefined;
  /** Show the live store readout underneath. Default true. */
  showStore?: boolean | undefined;
  /**
   * For a CONTAINER (a card, tabs): the widgets its layouts may hold and
   * the engines that lay them out — what a page would give it. Without it a
   * container shows only that it holds a layout.
   */
  inside?:
    { registry: WidgetRegistry; layoutEngines: LayoutEngineRegistry; viewModels?: ViewModels | undefined } | undefined;
}

/** Same data, whatever the object identity: controls hand over fresh objects on every change. */
const sameValue = (a: unknown, b: unknown): boolean => Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b);

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

export function WidgetStory({
  definition,
  viewModel,
  seed = {},
  data,
  onData,
  cellWidth,
  showStore = true,
  inside,
}: WidgetStoryProps) {
  // One store + bus per mounted story (re-mount with `key` to re-seed).
  const [{ store, bus }] = useState(() => ({ store: createStore(seed), bus: createEventBus() }));

  // What is driven RIGHT NOW — kept first, so the write below already sees it:
  // a value the controls just set must not be reported back to them.
  const latest = useRef({ data, onData });
  useEffect(() => {
    latest.current = { data, onData };
  });

  // Controls -> store: a driven value that differs from the store's is written.
  // (Story code may write the store; widget code never does.)
  useEffect(() => {
    for (const [path, value] of Object.entries(data ?? {})) {
      if (!sameValue(store.get(path), value)) store.set(path, value);
    }
  }, [store, data]);

  // Store -> controls: the widget's own reaction changed a driven value.
  const drivenPaths = Object.keys(data ?? {}).join("\n");
  useEffect(() => {
    const stops = drivenPaths
      .split("\n")
      .filter(Boolean)
      .map((path) =>
        store.subscribe(path, () => {
          const value = store.get(path);
          if (!sameValue(value, latest.current.data?.[path])) latest.current.onData?.(path, value);
        }),
      );
    return () => stops.forEach((stop) => stop());
  }, [store, drivenPaths]);

  // Parsed and completed as resolve does it: a controlled widget's default
  // write-back is in place without the story spelling it out.
  const parsed = useMemo(() => {
    try {
      return { viewModel: withDefaultReactions(definition, definition.viewModel.parse(viewModel)) };
    } catch (error) {
      return { problem: errorText(error) };
    }
  }, [definition, viewModel]);

  const emit = useMemo(() => createEmitter(bus, definition, { page: "storybook", cell: "story" }), [bus, definition]);

  // Every event -> Actions panel.
  useEffect(() => bus.subscribe({}, (event) => action(`${event.widget}/${event.name}`)(event.payload)), [bus]);

  // The story's own reactions (`on`) run exactly as on a page.
  useEffect(() => {
    if ("problem" in parsed) return undefined;
    return bindCellReactions(bus, store, { page: "storybook", cell: "story", viewModel: parsed.viewModel });
  }, [bus, store, parsed]);

  const readable = useMemo(() => readableStore(store), [store]);
  const Widget = definition.component as ComponentType<WidgetProps>;

  // A page around the story, for a container's layouts: the widgets inside resolve against `inside`.
  const scope = useMemo<PageScope | undefined>(
    () =>
      inside === undefined
        ? undefined
        : {
            page: "storybook",
            viewModels: inside.viewModels ?? { pages: {}, widgets: {} },
            overlays: [],
            registry: inside.registry,
            layoutEngines: inside.layoutEngines,
            actions: undefined,
            predicates: undefined,
            appearances: undefined,
            store,
            bus,
            onError: undefined,
            depth: 0,
          },
    [inside, store, bus],
  );

  return (
    <div data-testid="story">
      {"problem" in parsed ? (
        <div role="alert" className="ww-cell-problem">
          Invalid view model: {parsed.problem}
        </div>
      ) : (
        // A widget lives in a CELL of some width: narrow it to see how it copes.
        <div className="ww-cell" style={cellWidth === undefined ? undefined : { width: cellWidth, maxWidth: "100%" }}>
          <WidgetErrorBoundary widgetType={definition.type}>
            <PageContext value={scope}>
              <CellKeyContext value="story">
                <Widget viewModel={parsed.viewModel} store={readable} emit={emit} />
              </CellKeyContext>
            </PageContext>
          </WidgetErrorBoundary>
        </div>
      )}
      {showStore ? <StoryStore store={store} /> : null}
    </div>
  );
}

type ArgType = {
  control: "text" | "number" | "boolean" | "select" | "object";
  options?: string[];
  description?: string;
};

/** Controls for a widget's primitive settings — the builder's introspection, reused. */
export function storyArgTypes(definition: AnyWidgetDefinition): Record<string, ArgType> {
  return Object.fromEntries(
    settingFields(definition.viewModel).map((field) => [
      field.name,
      {
        // A list — "json" (on request, action parameters) or the named items of tabs and panels — Storybook edits as an object.
        control: field.kind === "json" || field.kind === "items" ? "object" : field.kind,
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
