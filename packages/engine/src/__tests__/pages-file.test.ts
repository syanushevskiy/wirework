/**
 * A page as a FILE: cut out of the trees with the widgets its cells reference
 * — inside containers too —, written and read back, and files merged into a
 * tree with their disagreements reported.
 */
import { describe, expect, it } from "vitest";
import { NO_EVENTS, pageViewModelSchema, widgetBindingsSchema, type AnyWidgetDefinition } from "@wirework/schema";
import {
  exportPageFile,
  mergePageFiles,
  pageFile,
  pageFileName,
  pageFolder,
  pageFromFolder,
  parsePageFile,
  validateViewModels,
} from "../index";
import { cell, counter, enginesWith, listEngine, registryWith } from "./fixtures";

/** A container: `content` holds a layout. */
const box: AnyWidgetDefinition = {
  type: "box",
  io: { inputs: {} },
  events: NO_EVENTS,
  viewModel: widgetBindingsSchema({ inputs: {} }, NO_EVENTS).extend({ content: pageViewModelSchema.optional() }),
  contains: ["content"],
  component: () => null,
};

const layout = (cells: unknown[]) => ({ engine: "list", cells });
const registry = registryWith(counter, box);
const layoutEngines = enginesWith(listEngine);

const counterTemplates = { default: { inputs: { value: "demo.n" }, on: { changed: [{ set: "demo.n" }] } } };
const inner = layout([cell({ id: "inner", model: "widgets.demo.counter" })]);
const viewModels = {
  pages: {
    demo: {
      default: layout([cell({ id: "box-1", widget: "box", model: "widgets.demo.box" })]),
      // The compact view points at the counter directly: the same template map, listed once.
      compact: layout([
        cell({ id: "c", model: "widgets.demo.counter" }),
        cell({ id: "ghost", model: "widgets.nobody" }),
      ]),
    },
    other: { default: layout([cell({ id: "o", model: "widgets.other.counter" })]) },
  },
  on: { demo: { load: [{ call: "demo/load" }] } },
  widgets: {
    demo: { box: { default: { content: inner } }, counter: counterTemplates },
    other: { counter: counterTemplates },
  },
};
const input = { viewModels, registry, layoutEngines };
const route = { path: "/demo", title: "Demo", menu: true };

/** The box's cell as the FILE writes it: its template map nested, the counter inside plain. */
const boxCell = {
  ...cell({ id: "box-1", widget: "box", model: "widgets.demo.box" }),
  templates: { default: { content: inner } },
};

describe("pageFile", () => {
  it("cuts the page's templates with the box's layout NESTED in its cell, its reactions, its route and the other widgets each once, sorted", () => {
    expect(pageFile(input, "demo", route)).toEqual({
      kind: "wirework-page",
      version: 1,
      page: "demo",
      route,
      templates: { default: layout([boxCell]), compact: viewModels.pages.demo.compact },
      on: viewModels.on.demo,
      widgets: { "widgets.demo.counter": counterTemplates },
    });
  });

  it("nests a container's templates once — in the first cell that points at it — and a container inside a container in turn", () => {
    const outerInner = layout([cell({ id: "inner-box", widget: "box", model: "widgets.demo.box" })]);
    const twice = {
      ...viewModels,
      pages: {
        demo: {
          default: layout([
            cell({ id: "outer", widget: "box", model: "widgets.demo.outer" }),
            cell({ id: "again", widget: "box", model: "widgets.demo.box" }),
          ]),
        },
      },
      widgets: {
        ...viewModels.widgets,
        demo: { ...viewModels.widgets.demo, outer: { default: { content: outerInner } } },
      },
    };
    const file = pageFile({ ...input, viewModels: twice }, "demo");
    expect(file?.templates).toEqual({
      default: layout([
        {
          ...cell({ id: "outer", widget: "box", model: "widgets.demo.outer" }),
          templates: {
            default: {
              content: layout([
                {
                  ...cell({ id: "inner-box", widget: "box", model: "widgets.demo.box" }),
                  templates: { default: { content: inner } },
                },
              ]),
            },
          },
        },
        // The same box again: named, not written twice.
        cell({ id: "again", widget: "box", model: "widgets.demo.box" }),
      ]),
    });
    expect(Object.keys(file?.widgets ?? {})).toEqual(["widgets.demo.counter"]);
    if (!file) throw new Error("no file");
    // Back in a tree, every nested map is at its model path again (the other page's counter was never in this file).
    expect(mergePageFiles([file]).viewModels).toEqual({
      pages: twice.pages,
      on: twice.on,
      widgets: { demo: twice.widgets.demo },
    });
  });

  it("leaves out what the page has not — a route, reactions — and is nothing for a page the tree lacks", () => {
    const other = pageFile(input, "other");
    expect(other).toEqual({
      kind: "wirework-page",
      version: 1,
      page: "other",
      templates: viewModels.pages.other,
      widgets: { "widgets.other.counter": counterTemplates },
    });
    expect(other && "route" in other).toBe(false);
    expect(other && "roles" in other).toBe(false);
    expect(pageFile(input, "nobody")).toBeUndefined();
    expect(pageFileName("demo")).toBe("demo.page.json");
  });

  it("carries what every role says about the page, and the widgets the roles' layouts reference (doc/ADR/0012-roles.md)", () => {
    const admin = {
      view: "admin",
      templates: { admin: layout([cell({ id: "c" }), cell({ id: "owner", model: "widgets.demo.owner" })]) },
    };
    const withRoles = {
      ...viewModels,
      widgets: { ...viewModels.widgets, demo: { ...viewModels.widgets.demo, owner: counterTemplates } },
      roles: { admin: { pages: { demo: admin, other: { view: "x" } } }, ops: { pages: { other: {} } } },
    };
    const file = pageFile({ ...input, viewModels: withRoles }, "demo");
    expect(file?.roles).toEqual({ admin });
    expect(Object.keys(file?.widgets ?? {})).toEqual(["widgets.demo.counter", "widgets.demo.owner"]);
    if (!file) throw new Error("no file");
    // Merged back, the role's entry for the page lands under the role, beside what the role says about other pages.
    const merged = mergePageFiles([file], {
      pages: {},
      widgets: {},
      roles: { admin: { pages: { other: { view: "x" } } } },
    });
    expect(merged.viewModels.roles).toEqual({ admin: { pages: { other: { view: "x" }, demo: admin } } });
    expect(parsePageFile(exportPageFile(file))).toEqual({ file });
  });
});

describe("the file as text", () => {
  it("round-trips through export and parse", () => {
    const file = pageFile(input, "demo", route);
    if (!file) throw new Error("no file");
    expect(parsePageFile(exportPageFile(file))).toEqual({ file });
    expect(exportPageFile(file).startsWith('{\n  "kind": "wirework-page",\n  "version": 1,\n  "page": "demo"')).toBe(
      true,
    );
  });

  it("refuses text that is not JSON and JSON that is not a page file, saying why", () => {
    expect(parsePageFile("{nope")).toMatchObject({ problem: expect.stringMatching(/^not JSON/) });
    expect(parsePageFile('{"kind":"recipe"}')).toMatchObject({ problem: expect.stringMatching(/^not a page file/) });
    expect(parsePageFile('{"kind":"wirework-page","version":2,"page":"x","templates":{},"widgets":{}}')).toMatchObject({
      problem: expect.stringContaining("version"),
    });
    // The page's reactions are checked for shape: an event pages do not have is refused here already.
    expect(
      parsePageFile(
        '{"kind":"wirework-page","version":1,"page":"x","templates":{},"widgets":{},"on":{"opened":[{"call":"x"}]}}',
      ),
    ).toMatchObject({ problem: expect.stringContaining("opened") });
  });
});

describe("the file as a folder", () => {
  const demo = pageFile(input, "demo", route);
  const other = pageFile(input, "other");
  if (!demo || !other) throw new Error("no files");

  it("splits the page into what it is, what it looks like and does (the box nested), the roles where there are any, and the other widgets — and joins them back to the same file", () => {
    const folder = pageFolder(demo);
    expect(folder).toEqual({
      page: { kind: "wirework-page", version: 1, page: "demo", route },
      viewModel: { templates: demo.templates, on: viewModels.on.demo },
      // No role says anything about the page: the file is there, empty.
      roles: {},
      widgets: { "widgets.demo.counter": counterTemplates },
    });
    expect(pageFromFolder(folder, "demo")).toEqual({ file: demo });
    // What the page has not is left out of its part, not written as undefined.
    const bare = pageFolder(other);
    expect("route" in bare.page).toBe(false);
    expect(Object.keys(bare.viewModel)).toEqual(["templates"]);
    expect(pageFromFolder(bare)).toEqual({ file: other });
    // A page the roles say something about gets a roles part of its own.
    const admin = { view: "admin", templates: { admin: layout([cell({ id: "c" })]) } };
    const withRoles = { ...demo, roles: { admin } };
    expect(pageFolder(withRoles).roles).toEqual({ admin });
    expect(pageFromFolder(pageFolder(withRoles))).toEqual({ file: withRoles });
  });

  it("names the file that is wrong, and a page.json that names another page than its folder", () => {
    const folder = pageFolder(demo);
    expect(pageFromFolder({ ...folder, page: { kind: "recipe" } })).toMatchObject({
      problem: expect.stringMatching(/^page\.json: /),
    });
    expect(pageFromFolder({ ...folder, viewModel: { templates: 5 } })).toMatchObject({
      problem: expect.stringMatching(/^viewModel\.json: /),
    });
    expect(pageFromFolder({ ...folder, roles: { "Not A Role": {} } })).toMatchObject({
      problem: expect.stringMatching(/^roles\.json: /),
    });
    expect(pageFromFolder({ ...folder, widgets: [] })).toMatchObject({
      problem: expect.stringMatching(/^widgets\.json: /),
    });
    expect(pageFromFolder(folder, "inventory")).toEqual({
      problem: 'page.json: names the page "demo" in the folder "inventory"',
    });
  });
});

describe("mergePageFiles", () => {
  const demo = pageFile(input, "demo", route);
  const other = pageFile(input, "other");
  if (!demo || !other) throw new Error("no files");

  it("builds a tree from files that validates like the one they were cut from, and lists their routes", () => {
    const merged = mergePageFiles([demo, other]);
    expect(merged.problems).toEqual([]);
    expect(merged.routes).toEqual([{ page: "demo", ...route }]);
    expect(merged.viewModels).toEqual({
      pages: viewModels.pages,
      on: viewModels.on,
      widgets: viewModels.widgets,
    });
    const report = validateViewModels({ ...input, viewModels: merged.viewModels });
    // The dangling "widgets.nobody" is the fixture's own problem, in the file's tree exactly as in the original.
    expect(report.errors.map((problem) => problem.message)).toEqual(
      validateViewModels(input).errors.map((problem) => problem.message),
    );
  });

  it("lays files over an application's own tree, the file's page replacing what was there", () => {
    const into = {
      pages: { demo: { default: layout([]) }, kept: { default: layout([]) } },
      widgets: { demo: { counter: { default: { label: "old" } } }, kept: {} },
    };
    const merged = mergePageFiles([demo], into);
    expect(merged.viewModels.pages).toEqual({ demo: viewModels.pages.demo, kept: into.pages.kept });
    expect(merged.viewModels.widgets).toEqual({ demo: viewModels.widgets.demo, kept: {} });
    expect(merged.viewModels.on).toEqual(viewModels.on);
  });

  it("reports a page in two files and a widget template two pages hold differently — the later file winning", () => {
    const twisted = { ...other, widgets: { "widgets.demo.counter": { default: { label: "mine" } } } };
    const merged = mergePageFiles([demo, twisted]);
    expect(merged.problems).toEqual([
      'widget template "widgets.demo.counter" differs between pages "demo" and "other"',
    ]);
    expect(merged.viewModels.widgets).toMatchObject({ demo: { counter: { default: { label: "mine" } } } });
    expect(mergePageFiles([demo, demo]).problems).toEqual(['page "demo" is in two files']);
    expect(mergePageFiles([demo, other]).problems).toEqual([]);
  });
});
