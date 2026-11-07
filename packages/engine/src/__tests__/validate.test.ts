/** Boot validation: severity, and the same answers the renderer gives. */
import { describe, expect, it } from "vitest";
import { createActions, validateViewModels } from "../index";
import type { ValidationReport } from "../validate";
import { cell, counter, enginesWith, listEngine, page, plain, registryWith } from "./fixtures";

const templates = {
  counter: { default: { inputs: { value: "demo.n" }, on: { changed: [{ set: "demo.n", from: "value" }] } } },
};
const registry = () => registryWith(counter, plain);
const engines = () => enginesWith(listEngine);

const check = (
  viewModels: unknown,
  userViewModels?: unknown,
  actions = createActions(),
  knownRoles?: readonly string[],
): ValidationReport =>
  validateViewModels({
    registry: registry(),
    layoutEngines: engines(),
    viewModels: viewModels as never,
    userViewModels: userViewModels as never,
    actions,
    knownRoles,
  });

const messages = (report: ValidationReport, severity: "error" | "warning") =>
  report.problems.filter((problem) => problem.severity === severity).map((problem) => problem.message);

describe("validateViewModels", () => {
  it("passes a healthy tree", () => {
    const report = check(page([cell()], templates));
    expect(report).toMatchObject({ ok: true, problems: [], errors: [], warnings: [] });
  });

  it("checks the pages' own reactions: a healthy one passes, a wrong one is an ERROR at boot", () => {
    const actions = createActions();
    actions.register({ name: "overview/load", handler: () => undefined });
    const withOn = (on: unknown) => ({ ...page([cell()], templates), on });

    expect(check(withOn({ demo: { load: [{ call: "overview/load" }] } }), undefined, actions).ok).toBe(true);

    const unknownAction = check(withOn({ demo: { load: [{ call: "nobody" }] } }), undefined, actions);
    expect(unknownAction.errors.map((problem) => problem.location)).toEqual(["on.demo"]);
    expect(messages(unknownAction, "error")[0]).toMatch(/calls unknown action "nobody"/);

    const unknownPage = check(withOn({ ghost: { load: [{ call: "overview/load" }] } }), undefined, actions);
    expect(messages(unknownPage, "error")[0]).toMatch(/reactions for unknown page "ghost"/);

    // An event pages do not have fails the SHAPE of the tree: nothing else is walked.
    const unknownEvent = check(withOn({ demo: { opened: [{ call: "overview/load" }] } }), undefined, actions);
    expect(messages(unknownEvent, "error")[0]).toMatch(/invalid view models/);
  });

  it("regression: shape-checks the base tree instead of walking garbage", () => {
    const report = check({ pages: "abc", widgets: {} });
    expect(report.ok).toBe(false);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]?.message).toMatch(/invalid view models/);
  });

  it("reports unknown widgets, dangling models and rejected templates as errors", () => {
    expect(messages(check(page([cell({ widget: "ghost" })], templates)), "error")[0]).toMatch(/unknown widget "ghost"/);
    expect(messages(check(page([cell({ model: "widgets.nowhere" })], templates)), "error")[0]).toMatch(
      /dangling model path/,
    );
    expect(messages(check(page([cell()], { counter: { default: { inputs: { value: 1 } } } })), "error")[0]).toMatch(
      /rejected by the widget/,
    );
  });

  it("regression: an engaged fallback is a WARNING, so the report stays ok", () => {
    const report = check(page([cell({ template: "loud" })], templates));
    expect(report.ok).toBe(true);
    expect(messages(report, "warning")[0]).toMatch(/falling back to "default"/);
  });

  it("regression: a duplicate cell id is reported once, as an error", () => {
    const report = check(page([cell(), cell()], templates));
    expect(messages(report, "error")).toEqual([expect.stringMatching(/duplicate cell id "c1"/)]);
  });

  it("reports a broken overlay once and says it is ignored", () => {
    const report = check(page([cell()], templates), { pages: { demo: { cells: [] } } });
    expect(report.ok).toBe(false);
    expect(messages(report, "error")).toEqual([expect.stringMatching(/user view models ignored.*ignored entirely/s)]);
  });

  it("regression: dead user configuration is a WARNING, whatever kind it is", () => {
    const report = check(page([cell()], templates), {
      pages: { demo: { view: "nope", cells: { c1: { settings: { ghost: { label: "x" } } } } }, other: {} },
    });
    expect(messages(report, "warning")).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/page view "nope" does not exist/),
        expect.stringMatching(/settings reference unknown template "ghost"/),
        expect.stringMatching(/unknown page "other"/),
      ]),
    );
    expect(report.ok).toBe(true);
  });

  it("regression: a user view named like an Object method is not mistaken for a template", () => {
    const report = check(page([cell()], templates), { pages: { demo: { view: "toString" } } });
    expect(messages(report, "warning")).toEqual([expect.stringMatching(/"toString" does not exist/)]);
  });

  it("regression: validates EVERY template a cell could pick, not only the one shown", () => {
    const withBroken = page([cell()], {
      counter: { ...templates.counter, compact: { inputs: { value: "demo.n" }, on: { changed: [] }, step: "x" } },
    });
    const report = check(withBroken);
    expect(report.ok).toBe(false);
    expect(report.errors[0]?.location).toMatch(/template "compact"/);
  });

  it("regression: a user overlay may not rebind inputs or reactions", () => {
    const report = check(page([cell()], templates), {
      pages: { demo: { cells: { c1: { settings: { default: { on: { changed: [{ call: "anything" }] } } } } } } },
    });
    expect(messages(report, "error")[0]).toMatch(/may not contain inputs, on, when, appear, disappear/);
  });

  it("regression: a reaction reading a payload field that does not exist is reported", () => {
    const typo = page([cell()], {
      counter: { default: { inputs: { value: "demo.n" }, on: { changed: [{ set: "demo.n", from: "valu" }] } } },
    });
    expect(messages(check(typo), "error")[0]).toMatch(/payload fields that do not exist: changed from "valu"/);
  });

  it("validates the user's OWN page templates at their own location", () => {
    const report = check(page([cell()], templates), {
      pages: { demo: { templates: { mine: { engine: "nope", cells: [] } } } },
    });
    expect(report.problems[0]?.location).toBe("user pages.demo.templates.mine");
    expect(report.problems[0]?.message).toMatch(/unknown layout engine/);
  });

  describe("the role layer (doc/roles-design.md)", () => {
    const layout = (ids: string[]) => ({ engine: "list", cells: ids.map((id) => cell({ id })) });
    const withRoles = (roles: unknown) => ({ ...page([cell()], templates), roles });

    it("validates a role's own templates at their location and passes a healthy entry", () => {
      const healthy = check(
        withRoles({ admin: { pages: { demo: { view: "admin", templates: { admin: layout(["c1", "c2"]) } } } } }),
      );
      expect(healthy).toMatchObject({ ok: true, problems: [] });
      const broken = check(withRoles({ admin: { pages: { demo: { templates: { admin: { engine: "nope" } } } } } }));
      expect(broken.errors[0]?.location).toBe("roles.admin pages.demo.templates.admin");
      expect(broken.errors[0]?.message).toMatch(/unknown layout engine/);
    });

    it("reports a problem a role's settings cause at the role's location, and the shared page's problems once", () => {
      const report = check(
        withRoles({
          admin: { pages: { demo: { cells: { c1: { settings: { default: { label: 42 } } } } } } },
          ops: { pages: { demo: {} } },
        }),
      );
      expect(report.errors.map((problem) => problem.location)).toEqual([
        "roles.admin pages.demo.default cell[0] (#c1)",
      ]);
      expect(report.errors[0]?.message).toMatch(/rejected by the widget/);
      // A problem of the shared page itself is reported there, and not again per layer.
      const shared = check({ ...page([cell({ widget: "ghost" })], templates), roles: { admin: {}, ops: {} } });
      expect(shared.errors.map((problem) => problem.location)).toEqual(["pages.demo.default cell[0] (#c1)"]);
    });

    it("checks a role's view against the roles before it in the application's order", () => {
      const withView = withRoles({
        admin: { pages: { demo: { templates: { admin: layout(["c1"]) } } } },
        "wirework-admin": { pages: { demo: { view: "admin" } } },
      });
      expect(check(withView, undefined, createActions(), ["qa", "admin", "wirework-admin"]).warnings).toEqual([]);
      expect(messages(check(withView, undefined, createActions(), ["wirework-admin", "admin"]), "warning")).toEqual([
        expect.stringMatching(/page view "admin" does not exist/),
      ]);
    });

    it("reports a role's view and cell template nobody has; an entry that is not an overlay fails the tree's shape", () => {
      expect(messages(check(withRoles({ bad: { pages: [] } })), "error")).toEqual([
        expect.stringMatching(/invalid view models: roles.bad.pages/),
      ]);
      expect(messages(check(withRoles({ "Not Kebab": {} })), "error")).toEqual([
        expect.stringMatching(/invalid view models: roles.*kebab-case/),
      ]);
      const report = check(
        withRoles({
          admin: { pages: { demo: { view: "gone", cells: { c1: { view: "nope", settings: { ghost: {} } } } } } },
        }),
      );
      expect(messages(report, "warning")).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/page view "gone" does not exist/),
          expect.stringMatching(/template "nope" missing at "widgets.counter"/),
          expect.stringMatching(/settings reference unknown template "ghost"/),
        ]),
      );
      expect(report.problems.find((problem) => problem.message.includes('"gone"'))?.location).toBe(
        "roles.admin pages.demo",
      );
      expect(report.ok).toBe(true);
    });

    it("warns about a role nobody holds when the application's roles are known, and about an unknown page", () => {
      const report = check(
        { ...page([cell()], templates), roles: { ops: { pages: { other: {} } } } },
        undefined,
        createActions(),
        ["qa", "admin"],
      );
      expect(messages(report, "warning")).toEqual([
        expect.stringMatching(/role "ops" is held by nobody \(the application's roles: qa, admin\)/),
        expect.stringMatching(/references unknown page "other"/),
      ]);
      expect(check(withRoles({ qa: {} }), undefined, createActions(), ["qa"]).warnings).toEqual([]);
    });
  });

  it("agrees with the renderer about a reaction calling an unknown action", () => {
    const withCall = page([cell()], {
      counter: { default: { inputs: { value: "demo.n" }, on: { changed: [{ call: "nope" }] } } },
    });
    expect(messages(check(withCall), "error")[0]).toMatch(/unknown actions: nope/);
  });
});
