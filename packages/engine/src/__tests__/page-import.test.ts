/**
 * A page file IMPORTED: what another admin exported takes the page's place —
 * and a file that is not this page, writes outside the widgets, replaces
 * what the page did not hold, is of a newer format or breaks the page is
 * refused with the reason.
 */
import { describe, expect, it } from "vitest";
import type { PageFile, ViewModels } from "@wirework/schema";
import {
  createMigrations,
  defineMigration,
  exportPageFile,
  importPageFile,
  pageFile,
  pageFileModels,
  renameWidget,
} from "../index";
import { cell, counter, enginesWith, listEngine, registryWith } from "./fixtures";

const layout = (cells: unknown[]) => ({ engine: "list", cells });
const registry = registryWith(counter);
const layoutEngines = enginesWith(listEngine);
const templates = { default: { inputs: { value: "demo.n" }, on: { changed: [{ set: "demo.n" }] } } };

/** The exporting admin's tree: the page with two widgets, the second in the admin's own view only. */
const theirs: ViewModels = {
  pages: { demo: { default: layout([cell({ id: "a", model: "widgets.demo.a" })]) } },
  roles: {
    admin: {
      pages: {
        demo: {
          view: "admin",
          templates: {
            admin: layout([cell({ id: "a", model: "widgets.demo.a" }), cell({ id: "b", model: "widgets.demo.b" })]),
          },
        },
      },
    },
  },
  widgets: { demo: { a: templates, b: templates } },
};
/** The importing admin's: the same page as it started, and another page beside it. */
const mine: ViewModels = {
  pages: {
    demo: { default: layout([cell({ id: "old", model: "widgets.demo.old" })]) },
    other: { default: layout([cell({ id: "o", model: "widgets.other.o" })]) },
  },
  widgets: { demo: { old: templates }, other: { o: templates } },
};

const input = { viewModels: mine, registry, layoutEngines };
const exported = (viewModels: ViewModels = theirs): PageFile => {
  const file = pageFile({ viewModels, registry, layoutEngines }, "demo");
  if (file === undefined) throw new Error("no page");
  return file;
};
const text = (file: unknown): string => JSON.stringify(file);

describe("importPageFile", () => {
  it("puts the exported page in place of this one — its views, the role's own and the widgets — and leaves other pages alone", () => {
    const result = importPageFile(input, "demo", exportPageFile(exported()));
    if ("problem" in result) throw new Error(result.problem);
    expect(result.viewModels.pages["demo"]).toEqual(theirs.pages["demo"]);
    expect(result.viewModels.roles).toEqual(theirs.roles);
    expect(result.viewModels.widgets["demo"]).toMatchObject({ a: templates, b: templates });
    expect(result.viewModels.pages["other"]).toBe(mine.pages["other"]);
    expect(result.viewModels.widgets["other"]).toBe(mine.widgets["other"]);
    expect(result.warnings).toEqual([]);
  });

  it("names every model path a file writes", () => {
    expect(pageFileModels(exported())).toEqual(["widgets.demo.a", "widgets.demo.b"]);
  });

  it("refuses what is not a page file, and a file of another page", () => {
    expect(importPageFile(input, "demo", "{")).toMatchObject({ problem: expect.stringMatching(/^not JSON/) });
    expect(importPageFile(input, "demo", "{}")).toMatchObject({ problem: expect.stringMatching(/^not a page file/) });
    expect(importPageFile(input, "other", text(exported()))).toEqual({
      problem: 'the file is the page "demo", and this is the page "other"',
    });
  });

  it("refuses a file that writes outside the widgets, or over a template this page did not hold", () => {
    const outside = { ...exported(), widgets: { "roles.admin": { pages: {} } } };
    expect(importPageFile(input, "demo", text(outside))).toEqual({
      problem: 'the file writes outside the widgets: "roles.admin"',
    });
    const foreign = { ...exported(), widgets: { "widgets.other.o": { default: {} } } };
    expect(importPageFile(input, "demo", text(foreign))).toEqual({
      problem: 'the file replaces the widget template "widgets.other.o", which this page did not hold',
    });
    // A template the page DID hold is the page's to replace.
    const changed = { default: { ...templates.default, inputs: { value: "demo.m" } } };
    const own = { ...exported(mine), widgets: { "widgets.demo.old": changed } };
    expect(importPageFile(input, "demo", text(own))).toMatchObject({
      viewModels: { widgets: { demo: { old: changed } } },
    });
  });

  it("refuses a file that would leave the page with an error it did not have", () => {
    const broken = { ...exported(), widgets: { "widgets.demo.a": templates } };
    expect(importPageFile(input, "demo", text(broken))).toMatchObject({
      problem: expect.stringMatching(/^the page would not work — .*widgets\.demo\.b/),
    });
  });

  it("refuses a file saved by a newer version, and brings an older one forward", () => {
    const migrations = createMigrations();
    migrations.register(defineMigration({ owner: "app", to: 2, cell: renameWidget("old-counter", "counter") }));
    const newer = { ...exported(), versions: { app: 3 } };
    expect(importPageFile({ ...input, migrations }, "demo", text(newer))).toMatchObject({
      problem: expect.stringMatching(/^the file was saved by a newer version/),
    });
    // Format 1: the widget still by its old name.
    const old = JSON.parse(text(exported()).replaceAll('"widget":"counter"', '"widget":"old-counter"')) as PageFile;
    const result = importPageFile({ ...input, migrations }, "demo", text(old));
    if ("problem" in result) throw new Error(result.problem);
    expect(result.viewModels.versions).toEqual({ app: 2 });
    expect(JSON.stringify(result.viewModels.pages["demo"])).not.toContain("old-counter");
    // Without the steps, a file of another format is not guessed at.
    const stamped = { ...exported(), versions: { app: 2 } };
    expect(importPageFile(input, "demo", text(stamped))).toMatchObject({
      problem: expect.stringMatching(/newer version/),
    });
  });
});
