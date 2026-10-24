/**
 * Page views as pure functions: the list derives a view's kind from where
 * it lives, a name is checked against both kinds, and a view file round-trips
 * through the registered engine.
 */
import { describe, expect, it } from "vitest";
import {
  exportPageView,
  freeTemplateName,
  pageViewFile,
  pageViews,
  parsePageViewFile,
  templateNameProblem,
} from "../page-views";
import type { EditableTrees } from "../use-commit";
import { enginesWith, listEngine, treesWithCounter } from "./fixtures";

const engines = enginesWith(listEngine);
const compact = { engine: "list", cells: [] };

const treesWithViews = (): EditableTrees => {
  const trees = treesWithCounter();
  trees.viewModels.pages["demo"] = { ...trees.viewModels.pages["demo"], compact };
  trees.userViewModels = { pages: { demo: { view: "mine", templates: { mine: compact, compact } } } };
  return trees;
};

describe("pageViews", () => {
  it("lists prebuilt views first, then the user's own; a user view with a prebuilt name shadows it", () => {
    expect(pageViews(treesWithViews(), "demo")).toEqual([
      { name: "default", kind: "base" },
      { name: "mine", kind: "user" },
      { name: "compact", kind: "user" },
    ]);
    expect(pageViews(treesWithCounter(), "nope")).toEqual([]);
  });
});

describe("freeTemplateName / templateNameProblem", () => {
  it("keeps the wanted name when free and numbers it from 2 when taken", () => {
    expect(freeTemplateName("my-own", ["default"])).toBe("my-own");
    expect(freeTemplateName("my-own", ["my-own"])).toBe("my-own-2");
    expect(freeTemplateName("my-own", ["my-own", "my-own-2"])).toBe("my-own-3");
  });

  it("refuses an empty, a dotted and a taken name, and accepts the rest", () => {
    expect(templateNameProblem("  ", [])).toEqual({ kind: "empty-name" });
    expect(templateNameProblem("v1.0", [])).toEqual({ kind: "dotted-name" });
    expect(templateNameProblem("default", ["default"])).toEqual({ kind: "name-taken", name: "default" });
    expect(templateNameProblem("My compact view", ["default"])).toBeUndefined();
  });
});

describe("the view file", () => {
  it("round-trips through export and parse, keeping the template the engine validated", () => {
    const text = exportPageView(pageViewFile("demo", "compact", compact));
    expect(text).toContain('"kind": "wirework-page-view"');
    expect(parsePageViewFile(text, engines)).toEqual({ file: pageViewFile("demo", "compact", compact) });
  });

  it("refuses text that is not a view file, naming what is missing", () => {
    expect(parsePageViewFile("{nope", engines)).toMatchObject({ problem: { kind: "not-a-view" } });
    expect(parsePageViewFile('{"kind":"recipe"}', engines)).toMatchObject({
      problem: { kind: "not-a-view", detail: 'expected a "wirework-page-view" file' },
    });
    expect(parsePageViewFile('{"kind":"wirework-page-view","version":2}', engines)).toMatchObject({
      problem: { kind: "not-a-view", detail: "expected version 1" },
    });
    expect(parsePageViewFile('{"kind":"wirework-page-view","version":1,"name":"x"}', engines)).toMatchObject({
      problem: { kind: "not-a-view", detail: "no page" },
    });
  });

  it("refuses a template the registered engine does not accept", () => {
    const unknown = exportPageView(pageViewFile("demo", "x", { engine: "nope" }));
    expect(parsePageViewFile(unknown, engines)).toMatchObject({ problem: { kind: "invalid-template" } });
    const broken = exportPageView(pageViewFile("demo", "x", { engine: "list", cells: "nope" }));
    expect(parsePageViewFile(broken, engines)).toMatchObject({ problem: { kind: "invalid-template" } });
  });
});
