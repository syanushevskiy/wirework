import { describe, expect, it } from "vitest";
import {
  NO_COLUMN_STATE,
  columnStateKey,
  isColumnStateChanged,
  movedColumn,
  orderedColumns,
  shownColumns,
  toggledColumn,
  toggledColumns,
} from "../column-state";

const columns = [{ property: "id" }, { property: "name" }, { property: "team" }, { property: "status" }];
const names = (list: { property: string }[]) => list.map((column) => column.property);

describe("column state — what the column menu made of a table's columns", () => {
  it("changes nothing while empty", () => {
    expect(shownColumns(columns, NO_COLUMN_STATE)).toBe(columns);
    expect(isColumnStateChanged(NO_COLUMN_STATE)).toBe(false);
  });

  it("hides the columns it names and shows them again", () => {
    const hidden = toggledColumn(NO_COLUMN_STATE, "team", false);
    expect(names(shownColumns(columns, hidden))).toEqual(["id", "name", "status"]);
    expect(isColumnStateChanged(hidden)).toBe(true);
    expect(toggledColumn(hidden, "team", true)).toEqual(NO_COLUMN_STATE);
  });

  it("hides and shows every column at once, keeping the order", () => {
    const moved = movedColumn(columns, NO_COLUMN_STATE, "status", "id", "before");
    const none = toggledColumns(columns, moved, false);
    expect(shownColumns(columns, none)).toEqual([]);
    expect(none.order).toEqual(moved.order);
    expect(toggledColumns(columns, none, true)).toEqual(moved);
  });

  it("moves a column before or after another", () => {
    const first = movedColumn(columns, NO_COLUMN_STATE, "status", "id", "before");
    expect(first.order).toEqual(["status", "id", "name", "team"]);
    const then = movedColumn(columns, first, "id", "team", "after");
    expect(names(shownColumns(columns, then))).toEqual(["status", "name", "team", "id"]);
  });

  it("is unchanged again when a move brings the configured order back", () => {
    const moved = movedColumn(columns, NO_COLUMN_STATE, "name", "id", "before");
    expect(movedColumn(columns, moved, "name", "id", "after")).toEqual(NO_COLUMN_STATE);
  });

  it("leaves the state alone for a move onto itself or onto a column the table lacks", () => {
    expect(movedColumn(columns, NO_COLUMN_STATE, "name", "name", "after")).toBe(NO_COLUMN_STATE);
    expect(movedColumn(columns, NO_COLUMN_STATE, "name", "gone", "after")).toBe(NO_COLUMN_STATE);
  });

  it("puts a column the state does not name after the ones it does, and skips one the table lost", () => {
    const state = { order: ["status", "gone", "id"], hidden: ["gone"] };
    expect(names(orderedColumns(columns, state))).toEqual(["status", "id", "name", "team"]);
    expect(names(shownColumns(columns, state))).toEqual(["status", "id", "name", "team"]);
  });

  it("keeps the state under the configured key, or one made from the rows path", () => {
    expect(columnStateKey("my-key", "runs.data")).toBe("my-key");
    expect(columnStateKey("", "runs.data")).toBe("wirework:columns:runs.data");
  });
});
