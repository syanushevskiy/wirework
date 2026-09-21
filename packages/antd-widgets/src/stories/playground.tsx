/**
 * The PLAYGROUND story — one per widget, generated from its declaration, so
 * everything a widget can be given has a control:
 *
 *  - Settings: EVERY setting of the view model — text, number, boolean and
 *    enum as their own controls, lists and objects (a table's columns, a
 *    select's options) as object controls; descriptions and defaults come
 *    from the widget's schema (`.describe()`, `.default()`).
 *  - Inputs (store data): one control per input PORT, holding the VALUE at
 *    the path the port is bound to. Changing it writes the store — what a
 *    host or an action would do — and when the widget's own reaction writes
 *    that path (a click, a keystroke), the control follows.
 *  - Story: the width of the cell the widget sits in, and the store readout.
 *
 * It starts from the widget's PREVIEW sample (`definition.preview`: the seed
 * and wiring the palette shows), so every playground works out of the box:
 * a counter counts, a select stores its choice. Ports the preview leaves
 * unbound are bound to generated paths (`story.<widget>.<port>`), so they
 * have a control too. Events land in the Actions panel, as in every story.
 *
 * Dev-only: story code may depend on engine/store/events; widget code never does.
 */
import type { StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { z } from "zod";
import { getPath, settingFields, type AnyWidgetDefinition, type SettingField } from "@wirework/schema";
import { suggestedInputPaths } from "@wirework/engine";
import { WidgetStory } from "./harness";

// Story files differ in their Meta types; `any` keeps the playground assignable to each (as in conformance.tsx).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Story = StoryObj<any>;
type Args = Record<string, unknown>;

export interface PlaygroundOptions {
  /** View model to start from instead of the widget's preview (bindings, reactions, settings). */
  viewModel?: Record<string, unknown>;
  /** Store state to start from instead of the preview's. */
  seed?: Record<string, unknown>;
  /** Controls of the story FILE (its meta's own args) that mean nothing here, e.g. a seeding arg. */
  hide?: readonly string[];
}

const SETTINGS = "Settings";
const INPUTS = "Inputs (store data)";
const STORY = "Story";

const CELL_WIDTH = "storyCellWidth";
const SHOW_STORE = "storyShowStore";
const inputArg = (port: string): string => `input_${port}`;

type Control = "text" | "number" | "boolean" | "select" | "object";
const controlOf = (field: SettingField): Control => (field.kind === "json" ? "object" : field.kind);

/** What a port holds, as a control kind: read off its validator like a setting's. */
function portFields(definition: AnyWidgetDefinition): Map<string, SettingField> {
  const shape = Object.fromEntries(
    Object.entries(definition.io.inputs).flatMap(([name, port]) =>
      port.value instanceof z.ZodType ? [[name, port.value] as const] : [],
    ),
  );
  return new Map(settingFields(z.object(shape), { json: true }).map((field) => [field.name, field]));
}

const summary = (value: unknown): string => (typeof value === "string" ? value : JSON.stringify(value));

export function playground(definition: AnyWidgetDefinition, options: PlaygroundOptions = {}): Story {
  const base = options.viewModel ?? definition.preview?.viewModel ?? {};
  const seed = options.seed ?? definition.preview?.seed ?? {};
  const settings = settingFields(definition.viewModel, { json: true });
  const ports = portFields(definition);

  // Every port gets a path: the sample's, else a generated one — so every port has a control.
  const inputs: Record<string, string> = {
    ...suggestedInputPaths("story", definition, []),
    ...((base["inputs"] ?? {}) as Record<string, string>),
  };
  const portOfPath = new Map(Object.entries(inputs).map(([port, path]) => [path, port]));

  const argTypes = {
    ...Object.fromEntries(
      settings.map((field) => [
        field.name,
        {
          control: controlOf(field),
          ...(field.options ? { options: field.options } : {}),
          description: `${field.description ?? ""}${field.required ? " (required)" : ""}`.trim(),
          table: {
            category: SETTINGS,
            ...(field.defaultValue === undefined ? {} : { defaultValue: { summary: summary(field.defaultValue) } }),
          },
        },
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(definition.io.inputs).map(([port, declared]) => {
        const field = ports.get(port);
        return [
          inputArg(port),
          {
            name: port,
            control: field ? controlOf(field) : "object",
            ...(field?.options ? { options: field.options } : {}),
            description: `${declared.description ?? ""} — the value at "${inputs[port]}"`.replace(/^ — /, ""),
            table: {
              category: INPUTS,
              ...(declared.default === undefined ? {} : { defaultValue: { summary: summary(declared.default) } }),
            },
          },
        ];
      }),
    ),
    [CELL_WIDTH]: {
      name: "cell width",
      control: { type: "range", min: 160, max: 1200, step: 20 },
      description: "Width of the cell the widget sits in, px",
      table: { category: STORY },
    },
    [SHOW_STORE]: {
      name: "show store",
      control: "boolean",
      description: "The live store readout under the widget",
      table: { category: STORY },
    },
    ...Object.fromEntries((options.hide ?? []).map((name) => [name, { table: { disable: true } }])),
  };

  const args: Args = {
    ...Object.fromEntries(
      settings.flatMap((field) => {
        const value = base[field.name] ?? field.defaultValue;
        return value === undefined ? [] : [[field.name, value]];
      }),
    ),
    ...Object.fromEntries(
      Object.entries(definition.io.inputs).flatMap(([port, declared]) => {
        const value = getPath(seed, inputs[port] ?? "") ?? declared.default;
        return value === undefined ? [] : [[inputArg(port), value]];
      }),
    ),
    [CELL_WIDTH]: 480,
    [SHOW_STORE]: true,
  };

  return {
    argTypes,
    args,
    // A named function component: `useArgs` is a Storybook hook.
    render: function Playground(current: Args) {
      const [, updateArgs] = useArgs();
      // A cleared control means "not set": the widget's own default applies.
      const chosen = Object.fromEntries(
        settings.flatMap((field) => {
          const value = current[field.name];
          return value === undefined || value === "" ? [] : [[field.name, value]];
        }),
      );
      const data = Object.fromEntries(Object.entries(inputs).map(([port, path]) => [path, current[inputArg(port)]]));
      return (
        <WidgetStory
          definition={definition}
          seed={seed}
          viewModel={{ ...chosen, inputs, ...(base["on"] === undefined ? {} : { on: base["on"] }) }}
          data={data}
          onData={(path, value) => {
            const port = portOfPath.get(path);
            if (port !== undefined) updateArgs({ [inputArg(port)]: value });
          }}
          cellWidth={typeof current[CELL_WIDTH] === "number" ? current[CELL_WIDTH] : undefined}
          showStore={current[SHOW_STORE] !== false}
        />
      );
    },
  };
}
