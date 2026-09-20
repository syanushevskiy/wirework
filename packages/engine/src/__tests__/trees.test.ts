/** View-model tree surgery: what editors write back into the page. */
import { describe, expect, it } from "vitest";
import type { UserViewModels, ViewModels } from "@wirework/schema";
import {
  pageTemplates,
  removeUserCell,
  updatePageTemplate,
  updateUserCellSettings,
  updateUserPageTemplate,
  updateWidgetTemplate,
} from "../index";

const base: ViewModels = {
  pages: { demo: { default: { engine: "list", cells: [] }, wide: { engine: "list", cells: [] } } },
  widgets: { demo: { label: { default: { text: "a", tone: "accent" }, "v1.0": { text: "dotted", columns: [1] } } } },
};
const shown = { engine: "list", cells: [{ id: "shown" }] } as never;
const mark = (template: unknown) => ({ ...(template as object), edited: true }) as never;

describe("pageTemplates", () => {
  it("layers the user's templates over the base ones by name", () => {
    const user: UserViewModels = { pages: { demo: { templates: { default: { engine: "mine" } } } } };
    expect(pageTemplates(base, user, "demo")).toMatchObject({ default: { engine: "mine" }, wide: { engine: "list" } });
    expect(pageTemplates(base, undefined, "nope")).toBeUndefined();
  });
});

describe("updatePageTemplate", () => {
  it("replaces one template and leaves an unknown one alone", () => {
    expect(updatePageTemplate(base, "demo", "wide", mark).pages?.["demo"]?.["wide"]).toMatchObject({ edited: true });
    expect(updatePageTemplate(base, "demo", "nope", mark)).toBe(base);
  });
});

describe("updateUserPageTemplate", () => {
  it("creates the user's template from the shown one and selects it", () => {
    const next = updateUserPageTemplate({}, "demo", "my-own", shown, mark);
    expect(next.pages?.["demo"]).toMatchObject({ view: "my-own", templates: { "my-own": { cells: [{ id: "shown" }], edited: true } } });
  });

  it("keeps editing the user's template while it is the selected view (a session's second edit)", () => {
    const first = updateUserPageTemplate({}, "demo", "my-own", shown, mark);
    const second = updateUserPageTemplate(first, "demo", "my-own", { engine: "list", cells: [] } as never, (template) =>
      ({ ...(template as object), again: true }) as never,
    );
    expect(second.pages?.["demo"]?.templates?.["my-own"]).toMatchObject({ cells: [{ id: "shown" }], edited: true, again: true });
  });

  it("regression: an edit while ANOTHER view is shown starts from what is shown, not the stale own template", () => {
    const stale: UserViewModels = {
      pages: { demo: { view: "default", templates: { "my-own": { engine: "list", cells: [{ id: "stale" }] } as never } } },
    };
    const next = updateUserPageTemplate(stale, "demo", "my-own", shown, mark);
    expect(next.pages?.["demo"]?.templates?.["my-own"]).toMatchObject({ cells: [{ id: "shown" }] });
    expect(next.pages?.["demo"]?.view).toBe("my-own");
  });
});

describe("updateUserCellSettings / removeUserCell", () => {
  it("sets one template's settings for one cell, and drops the cell again", () => {
    const next = updateUserCellSettings({}, "demo", "c1", "default", { text: "mine" });
    expect(next.pages?.["demo"]?.cells?.["c1"]?.settings).toEqual({ default: { text: "mine" } });
    expect(removeUserCell(next, "demo", "c1").pages?.["demo"]?.cells).toEqual({});
    expect(removeUserCell({}, "demo", "c1")).toEqual({});
  });
});

describe("updateWidgetTemplate", () => {
  it("regression: a template name with a dot is read AND written as one segment", () => {
    const next = updateWidgetTemplate(base, "widgets.demo.label", "v1.0", (current) => ({
      ...(current as object),
      text: "edited",
    }));
    // `columns` survives: the updater received the real template, not undefined.
    expect((next.widgets["demo"] as Record<string, Record<string, unknown>>)["label"]?.["v1.0"]).toEqual({
      text: "edited",
      columns: [1],
    });
  });
});
