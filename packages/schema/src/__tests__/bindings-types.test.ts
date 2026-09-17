/**
 * Type-level regression: a view model's `inputs` and `on` are typed by the
 * DECLARED port and event names (they used to be `any`, so a misspelled
 * port compiled and silently read nothing — team-tiger review, Vlad).
 * Checked by `tsc` (typecheck); the runtime assertion keeps vitest happy.
 */
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { widgetBindingsSchema, type WidgetEvents, type WidgetIO } from "../index";

const io = {
  inputs: { data: { value: z.string() }, loading: { value: z.boolean(), required: false } },
} satisfies WidgetIO;
const events = { selected: { payload: z.object({ id: z.string() }) } } satisfies WidgetEvents;
const schema = widgetBindingsSchema(io, events);
type ViewModel = z.infer<typeof schema>;

describe("widget bindings types", () => {
  it("types inputs by port name: required ports are strings, optional ones may be absent", () => {
    expectTypeOf<ViewModel["inputs"]>().toEqualTypeOf<{ data: string; loading?: string | undefined }>();
    // @ts-expect-error — a port the widget never declared does not exist
    type Misspelled = ViewModel["inputs"]["daat"];
    expect(schema.parse({ inputs: { data: "runs.data" } }).inputs.data).toBe("runs.data");
  });

  it("types `on` by event name", () => {
    expectTypeOf<keyof ViewModel["on"]>().toEqualTypeOf<"selected">();
  });
});
