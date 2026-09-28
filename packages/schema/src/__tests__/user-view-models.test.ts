/**
 * The user overlay is STRICT at every level: a misspelt key is refused and
 * named, never dropped — and settings may not carry the page's wiring.
 */
import { describe, expect, it } from "vitest";
import { userViewModelsSchema } from "../index";

const issues = (input: unknown): string[] => {
  const result = userViewModelsSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
};

describe("userViewModelsSchema", () => {
  it("accepts a healthy overlay", () => {
    const overlay = {
      pages: {
        runs: {
          view: "my-own",
          templates: { "my-own": { engine: "grid", cells: [] } },
          cells: { table: { view: "compact", settings: { compact: { pageSize: 10 } } } },
        },
      },
    };
    expect(userViewModelsSchema.parse(overlay)).toEqual(overlay);
  });

  it("refuses a misspelt key at the root, on a page and on a cell, naming it", () => {
    expect(issues({ page: {} })).toEqual([": Unrecognized key(s) in object: 'page'"]);
    expect(issues({ pages: { runs: { veiw: "x" } } })).toEqual(["pages.runs: Unrecognized key(s) in object: 'veiw'"]);
    expect(issues({ pages: { runs: { cells: { table: { setting: {} } } } } })).toEqual([
      "pages.runs.cells.table: Unrecognized key(s) in object: 'setting'",
    ]);
  });

  it("refuses settings that carry inputs or reactions — a user's view never rewires a widget", () => {
    const overlay = { pages: { runs: { cells: { table: { settings: { compact: { inputs: { rows: "x" } } } } } } } };
    expect(issues(overlay)).toEqual([
      "pages.runs.cells.table.settings.compact: user settings may not contain inputs or on (bindings belong to the page)",
    ]);
  });

  it("refuses an empty view name", () => {
    expect(issues({ pages: { runs: { view: "" } } })).toHaveLength(1);
  });
});
