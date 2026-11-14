/**
 * Migrations (doc/ADR/0017-versioning-and-upgrades.md): documents stored
 * under an older data format are brought to today's at ONE door, and what
 * comes out passes the boot validation against today's widgets. The corpus
 * in `formats/` is frozen: every document there is read here.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  widgetBindingsSchema,
  type AnyLayoutEngine,
  type AnyWidgetDefinition,
  type UserViewModels,
  type ViewModels,
  type WidgetEvents,
  type WidgetIO,
} from "@wirework/schema";
import {
  createActions,
  createMigrations,
  defineMigration,
  mapValue,
  mergePageFiles,
  pageFile,
  pinDefault,
  remove,
  rename,
  renameAction,
  renameWidget,
  resolvePage,
  stampProblem,
  stamped,
  upgradeTrees,
  validateViewModels,
  type Migration,
} from "../index";
import { enginesWith, listEngine, registryWith } from "./fixtures";

/* ------------------- today's application: what the corpus must end up valid against ------------------- */

const io = { inputs: { value: { description: "a number", value: z.number(), default: 0 } } } satisfies WidgetIO;
const events = {
  changed: { description: "next value", payload: z.object({ value: z.number() }), required: true, primary: "value" },
} satisfies WidgetEvents;

/** Once the widget `counter` with a `label`; today `tally` with a `title` and a step that defaults to 5 (it was 1). */
const tally: AnyWidgetDefinition = {
  type: "tally",
  kind: "tally",
  io,
  events,
  viewModel: widgetBindingsSchema(io, events).extend({
    title: z.string().default("Count"),
    step: z.number().default(5),
  }),
  component: () => null,
};

/** The chain that brought the application here, in the order it happened. */
const CHAIN: Migration[] = [
  defineMigration({
    owner: "wirework",
    to: 2,
    engine: "list",
    template: ({ items, ...rest }) => (items === undefined ? rest : { ...rest, cells: items }),
  }),
  defineMigration({ owner: "wirework", to: 2, kind: "tally", settings: rename("label", "title") }),
  defineMigration({ owner: "wirework", to: 3, cell: renameWidget("counter", "tally") }),
  defineMigration({ owner: "wirework", to: 4, kind: "tally", settings: pinDefault("step", 1) }),
  defineMigration({ owner: "app", to: 2, action: renameAction("counter/reset", "tally/reset") }),
];

const migrationsWith = (steps: readonly Migration[] = CHAIN, oldest = {}) => {
  const migrations = createMigrations({ oldest });
  for (const step of steps) migrations.register(step);
  return migrations;
};

const registry = registryWith(tally);
const layoutEngines = enginesWith(listEngine as AnyLayoutEngine);
const actions = createActions();
actions.register({ name: "tally/reset", handler: () => undefined });

const frozen = <T>(format: number, name: string): T =>
  JSON.parse(readFileSync(new URL(`./formats/${format}/${name}.json`, import.meta.url), "utf8")) as T;

const door = (input: Parameters<typeof upgradeTrees>[0], migrations = migrationsWith()) =>
  upgradeTrees(input, { migrations, registry });

const check = (viewModels: ViewModels, userViewModels: UserViewModels | undefined, migrations = migrationsWith()) =>
  validateViewModels({ viewModels, userViewModels, registry, layoutEngines, actions, migrations });

describe("the frozen corpus", () => {
  it("is not valid as it stands: the shapes did change", () => {
    const report = check(frozen<ViewModels>(1, "view-models"), undefined, createMigrations());
    expect(report.ok).toBe(false);
  });

  it("format 1: the shared tree and a user's views come out valid, stamped, with nothing lost", () => {
    const upgraded = door({
      viewModels: frozen<ViewModels>(1, "view-models"),
      userViewModels: frozen<UserViewModels>(1, "user-view-models"),
    });
    expect(upgraded.problems).toEqual([]);
    expect(upgraded.unread).toEqual({});
    expect(upgraded.changed).toBe(true);
    const { viewModels, userViewModels } = upgraded;
    expect(check(viewModels as ViewModels, userViewModels).problems).toEqual([]);

    expect(viewModels?.versions).toEqual({ wirework: 4, app: 2 });
    // The engine's template, every cell's widget, the page's own reaction and a widget's.
    expect(viewModels?.pages["demo"]?.["default"]).toEqual({
      engine: "list",
      cells: [
        { id: "c1", widget: "tally", model: "widgets.counter", template: "default" },
        { id: "c2", widget: "tally", model: "widgets.counter", template: "quiet" },
      ],
    });
    expect(viewModels?.on?.["demo"]).toEqual({ load: [{ call: "tally/reset" }] });
    const templates = viewModels?.widgets["counter"] as Record<string, Record<string, unknown>>;
    // The setting renamed; the old default pinned where the template never said; one that did is left alone.
    expect(templates["default"]).toMatchObject({ title: "Clicks", step: 1 });
    expect(templates["default"]).not.toHaveProperty("label");
    expect(templates["default"]?.["on"]).toEqual({
      changed: [{ call: "tally/reset" }, { set: "demo.count", from: "value" }],
    });
    expect(templates["quiet"]).toMatchObject({ step: 2 });
    // A role's entry: its own layout, and its SPARSE settings — renamed, and no default pinned into them.
    const admin = viewModels?.roles?.["admin"]?.pages?.["demo"];
    expect(admin?.templates?.["compact"]).toMatchObject({ cells: [{ id: "c1", widget: "tally" }] });
    expect(admin?.cells?.["c1"]?.settings?.["default"]).toEqual({ title: "Admin clicks" });

    expect(userViewModels?.versions).toEqual({ wirework: 4, app: 2 });
    const mine = userViewModels?.pages?.["demo"];
    expect(mine?.view).toBe("mine");
    expect(mine?.templates?.["mine"]).toMatchObject({ cells: [{ id: "c1", widget: "tally" }] });
    expect(mine?.cells?.["c1"]?.settings?.["default"]).toEqual({ title: "My clicks" });

    // And the page the user sees is their own view of it.
    const plan = resolvePage({
      page: "demo",
      viewModels: viewModels as ViewModels,
      userViewModels,
      registry,
      layoutEngines,
      actions,
      migrations: migrationsWith(),
    });
    expect(plan).toMatchObject({ view: "mine", cells: [{ key: "c1", viewModel: { title: "My clicks", step: 1 } }] });
    expect(plan.overlayProblem).toBeUndefined();
  });

  it("format 2: a document from the middle takes the steps after its own, and the same road's end", () => {
    const shared = door({ viewModels: frozen<ViewModels>(1, "view-models") }).viewModels;
    const fromOne = door({ viewModels: shared, userViewModels: frozen<UserViewModels>(1, "user-view-models") });
    const fromTwo = door({ viewModels: shared, userViewModels: frozen<UserViewModels>(2, "user-view-models") });
    expect(fromTwo.problems).toEqual([]);
    expect(fromTwo.userViewModels).toEqual(fromOne.userViewModels);
  });

  it("a user's views are read without the shared tree too — their layouts, not their settings by kind", () => {
    const alone = door({ userViewModels: frozen<UserViewModels>(1, "user-view-models") }).userViewModels;
    expect(alone?.pages?.["demo"]?.templates?.["mine"]).toMatchObject({ cells: [{ widget: "tally" }] });
    // The overlay's own template names the widget, so its kind is known from the overlay itself.
    expect(alone?.pages?.["demo"]?.cells?.["c1"]?.settings?.["default"]).toEqual({ title: "My clicks" });
  });
});

describe("the door", () => {
  it("changes nothing in a document that is current, and says so", () => {
    const once = door({
      viewModels: frozen<ViewModels>(1, "view-models"),
      userViewModels: frozen<UserViewModels>(1, "user-view-models"),
    });
    const twice = door({ viewModels: once.viewModels, userViewModels: once.userViewModels });
    expect(twice.changed).toBe(false);
    expect(twice.viewModels).toBe(once.viewModels);
    expect(twice.userViewModels).toBe(once.userViewModels);
  });

  it("leaves a document without a stamp alone while nobody has a format above 1", () => {
    const viewModels = frozen<ViewModels>(1, "view-models");
    const upgraded = door({ viewModels }, createMigrations());
    expect(upgraded).toMatchObject({ changed: false, problems: [], unread: {} });
    expect(upgraded.viewModels).toBe(viewModels);
    expect(upgraded.viewModels).not.toHaveProperty("versions");
  });

  it("isolates a step that throws to the one template it threw on, and says where", () => {
    const failing = migrationsWith([
      defineMigration({
        owner: "wirework",
        to: 2,
        kind: "tally",
        settings: (settings) => {
          if (settings["step"] === 2) throw new Error("no such step");
          return rename("label", "title")(settings, { sparse: false });
        },
      }),
      // The widget's kind is known through the rename still to come.
      defineMigration({ owner: "wirework", to: 3, cell: renameWidget("counter", "tally") }),
    ]);
    const { viewModels, problems } = door({ viewModels: frozen<ViewModels>(1, "view-models") }, failing);
    expect(problems).toEqual(["viewModels widgets.counter.quiet: migration to wirework format 2 failed: no such step"]);
    const templates = viewModels?.widgets["counter"] as Record<string, Record<string, unknown>>;
    expect(templates["default"]).toMatchObject({ title: "Clicks" });
    expect(templates["quiet"]).toMatchObject({ step: 2 });
  });

  it("does not read a document saved by a newer version: it comes back as it was, with the reason", () => {
    const newer: UserViewModels = { versions: { wirework: 9 }, pages: { demo: { view: "compact" } } };
    const upgraded = door({ viewModels: frozen<ViewModels>(1, "view-models"), userViewModels: newer });
    expect(upgraded.userViewModels).toBe(newer);
    expect(upgraded.unread).toEqual({
      userViewModels:
        "saved by a newer version of the application (data format wirework 9; this version reads up to 4)",
    });
    // The shared tree beside it is read all the same.
    expect(upgraded.viewModels?.versions).toEqual({ wirework: 4, app: 2 });
  });

  it("does not read a document older than the oldest step kept", () => {
    const migrations = migrationsWith(
      CHAIN.filter((step) => step.owner !== "wirework" || step.to > 3),
      { wirework: 3 },
    );
    expect(migrations.current()).toEqual({ wirework: 4, app: 2 });
    const old = frozen<ViewModels>(1, "view-models");
    const upgraded = door({ viewModels: old }, migrations);
    expect(upgraded.viewModels).toBe(old);
    expect(upgraded.unread.viewModels).toBe(
      "saved by a version too old to read here (data format wirework 1; this version reads from 3 on — bring it forward with the release before)",
    );
  });

  it("does not touch what is not a tree at all — validation says what is wrong with it", () => {
    const upgraded = door({ viewModels: "nope" as unknown as ViewModels });
    expect(upgraded).toMatchObject({ viewModels: "nope", changed: false, problems: [] });
  });
});

describe("the stamp", () => {
  it("is refused above format 1 by code that knows no formats", () => {
    expect(stampProblem(undefined)).toBeUndefined();
    expect(stampProblem({ app: 1 })).toBeUndefined();
    expect(stampProblem({ app: 2 })).toBe(
      "saved by a newer version of the application (data format app 2; this version reads up to 1)",
    );
    expect(stampProblem({ app: 2 }, migrationsWith())).toBeUndefined();
    expect(stampProblem({ app: "two" })).toBe("its format stamp (versions) is not a number per owner");
  });

  it("is written with what a version writes, and not at all at format 1", () => {
    const tree: ViewModels = { pages: {}, widgets: {} };
    expect(stamped(tree)).toBe(tree);
    expect(stamped(tree, createMigrations())).toBe(tree);
    const written = stamped(tree, migrationsWith());
    expect(written.versions).toEqual({ wirework: 4, app: 2 });
    expect(stamped(written, migrationsWith())).toBe(written);
    // An owner this version has no steps for keeps the format the document says.
    expect(stamped({ ...tree, versions: { acme: 3 } }, migrationsWith()).versions).toEqual({
      acme: 3,
      wirework: 4,
      app: 2,
    });
  });

  it("makes the page ignore a user's views saved by a newer version, and say so", () => {
    const viewModels = door({ viewModels: frozen<ViewModels>(1, "view-models") }).viewModels as ViewModels;
    const userViewModels: UserViewModels = { versions: { wirework: 9 }, pages: { demo: { view: "nope" } } };
    const input = { page: "demo", viewModels, registry, layoutEngines, actions, migrations: migrationsWith() };
    const plan = resolvePage({ ...input, userViewModels });
    expect(plan.overlayProblem).toBe(
      "user view models ignored: saved by a newer version of the application (data format wirework 9; this version reads up to 4)",
    );
    expect(plan).toMatchObject({ view: "default" });
    expect(plan.problem).toBeUndefined();
    expect(check(viewModels, userViewModels).errors.map((problem) => problem.location)).toEqual(["userViewModels"]);
  });

  it("makes pages saved by a newer version a page problem and a boot error, not a guess", () => {
    const viewModels = { ...frozen<ViewModels>(1, "view-models"), versions: { wirework: 9 } };
    const plan = resolvePage({ page: "demo", viewModels, registry, layoutEngines, migrations: migrationsWith() });
    expect(plan.problem).toContain("The pages cannot be read: they were saved by a newer version");
    expect(check(viewModels, undefined).errors).toMatchObject([
      { location: "viewModels", message: expect.stringContaining("saved by a newer version") },
    ]);
  });

  it("travels with a page file, and files of different formats do not merge silently", () => {
    const viewModels = door({ viewModels: frozen<ViewModels>(1, "view-models") }).viewModels as ViewModels;
    const file = pageFile({ viewModels, registry, layoutEngines }, "demo");
    expect(file?.versions).toEqual({ wirework: 4, app: 2 });
    expect(file === undefined ? undefined : mergePageFiles([file]).viewModels.versions).toEqual({
      wirework: 4,
      app: 2,
    });
    const old = { ...(file as NonNullable<typeof file>), page: "other", versions: undefined };
    expect(mergePageFiles([file as NonNullable<typeof file>, old]).problems).toContain(
      "the pages are of different data formats: upgrade each before merging them",
    );
  });
});

describe("the verbs", () => {
  const whole = { sparse: false };
  const sparse = { sparse: true };

  it("rename: the value moves; the new name wins where both are there; nothing happens twice", () => {
    const step = rename("label", "title");
    expect(step({ label: "A", other: 1 }, whole)).toEqual({ title: "A", other: 1 });
    expect(step({ label: "old", title: "new" }, whole)).toEqual({ title: "new" });
    expect(step({}, sparse)).toEqual({});
    expect(step(step({ label: "A" }, whole), whole)).toEqual({ title: "A" });
  });

  it("remove and mapValue work on what is there and leave the rest", () => {
    expect(remove("gone")({ gone: 1, kept: 2 }, whole)).toEqual({ kept: 2 });
    expect(remove("gone")({}, sparse)).toEqual({});
    const widen = mapValue("size", (value) => (value === "s" ? "small" : value));
    expect(widen({ size: "s" }, whole)).toEqual({ size: "small" });
    expect(widen(widen({ size: "s" }, whole), whole)).toEqual({ size: "small" });
    expect(widen({}, sparse)).toEqual({});
  });

  it("pinDefault writes the old default into a whole template only, and only where it says nothing", () => {
    const pin = pinDefault("step", 1);
    expect(pin({}, whole)).toEqual({ step: 1 });
    expect(pin({ step: 3 }, whole)).toEqual({ step: 3 });
    expect(pin({}, sparse)).toEqual({});
  });
});

describe("the registry of steps", () => {
  it("says what this version writes: the newest step per owner", () => {
    expect(createMigrations().current()).toEqual({});
    expect(migrationsWith().current()).toEqual({ wirework: 4, app: 2 });
  });

  it("refuses a step that is not one", () => {
    const migrations = createMigrations({ oldest: { wirework: 3 } });
    const cell = renameWidget("a", "b");
    expect(() => migrations.register({ owner: "Not Kebab", to: 2, cell })).toThrow("not a kebab-case name");
    expect(() => migrations.register({ owner: "app", to: 1, cell })).toThrow("format 2 or later");
    expect(() => migrations.register({ owner: "wirework", to: 3, cell })).toThrow('reads "wirework" from format 3');
    expect(() => migrations.register({ owner: "app", to: 2 } as unknown as Migration)).toThrow("changes one thing");
    migrations.seal();
    expect(() => migrations.register({ owner: "app", to: 2, cell })).toThrow("sealed");
  });
});
