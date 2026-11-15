import { describe, expect, it } from "vitest";
import {
  NO_COLUMN_STATE,
  columnStateKey,
  droppedColumn,
  isColumnStateChanged,
  movedColumn,
  orderedColumns,
  pinnedColumn,
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

  it("never hides a required column — not one by one, not all at once, not from a state that says so", () => {
    const withRequired = [{ property: "id", required: true }, { property: "name" }, { property: "team" }];
    expect(toggledColumns(withRequired, NO_COLUMN_STATE, false).hidden).toEqual(["name", "team"]);
    expect(names(shownColumns(withRequired, { order: [], hidden: ["id", "team"] }))).toEqual(["id", "name"]);
  });

  it("stands pinned columns at their edges: left first, right last, each group in the state's order", () => {
    const pinned = pinnedColumn(pinnedColumn(NO_COLUMN_STATE, "status", "left"), "id", "right");
    expect(pinned).toEqual({ order: [], hidden: [], pinned: { status: "left", id: "right" } });
    expect(names(orderedColumns(columns, pinned))).toEqual(["status", "name", "team", "id"]);
    expect(isColumnStateChanged(pinned)).toBe(true);
    // A second column pinned left stands where the order puts it among them.
    const two = pinnedColumn(pinned, "team", "left");
    expect(names(shownColumns(columns, two))).toEqual(["team", "status", "name", "id"]);
    // Hidden wins over pinned.
    expect(names(shownColumns(columns, toggledColumn(two, "status", false)))).toEqual(["team", "name", "id"]);
  });

  it("says nothing of pins once the last one is let go", () => {
    const pinned = pinnedColumn(NO_COLUMN_STATE, "status", "left");
    expect(pinnedColumn(pinned, "status", undefined)).toEqual(NO_COLUMN_STATE);
    // Another edge replaces the first.
    expect(pinnedColumn(pinned, "status", "right").pinned).toEqual({ status: "right" });
  });

  it("pins a dragged column as the one it is dropped beside, and lets go one dragged out of the pinned", () => {
    const pinned = pinnedColumn(NO_COLUMN_STATE, "status", "left");
    const joined = droppedColumn(columns, pinned, "team", "status", "before");
    expect(joined.pinned).toEqual({ status: "left", team: "left" });
    expect(names(orderedColumns(columns, joined))).toEqual(["team", "status", "id", "name"]);
    const left = droppedColumn(columns, joined, "status", "name", "after");
    expect(left.pinned).toEqual({ team: "left" });
    expect(names(orderedColumns(columns, left))).toEqual(["team", "id", "name", "status"]);
    // A drop that moves nothing changes nothing.
    expect(droppedColumn(columns, pinned, "team", "team", "after")).toBe(pinned);
  });

  it("keeps the state under the configured key, or one made from the rows path", () => {
    expect(columnStateKey("my-key", "runs.data")).toBe("my-key");
    expect(columnStateKey("", "runs.data")).toBe("wirework:columns:runs.data");
  });
});
