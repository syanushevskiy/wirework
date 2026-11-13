/** The cell selection's arithmetic: the rectangle of a range, its edges, what a cell copies, the clipboard text and the CSV. */
import { describe, expect, it } from "vitest";
import type { TableColumn } from "@wirework/widget-contracts";
import {
  copyValue,
  csvText,
  edgesOf,
  exportFile,
  inRect,
  rangeText,
  rectOf,
  rectText,
  withinColumns,
} from "../cell-range";

const columns: TableColumn[] = [
  { title: "#", property: "id" },
  { title: "Name", property: "name", cell: { kind: "link", to: "/runs/{id}" } },
  { title: "Status", property: "status.state", cell: { kind: "tag", tones: { Failed: "danger" } } },
  { title: "Note", property: "note" },
];

const first = { id: "1", name: "Nightly", status: { state: "Success" }, note: "fine" };
const second = { id: "2", name: "Smoke", status: { state: "Failed" }, note: 'said "no"\tand left\nearly' };
const third = { id: "3", name: "Regression", status: { state: "Success" }, note: null };
const rows = [first, second, third];

const whole = (href: string) => `https://app.example${href}`;

describe("a range", () => {
  it("is the same rectangle whichever corner it was dragged from", () => {
    const rect = { top: 1, left: 0, bottom: 2, right: 3 };
    expect(rectOf({ anchor: { row: 1, column: 0 }, focus: { row: 2, column: 3 } })).toEqual(rect);
    expect(rectOf({ anchor: { row: 2, column: 3 }, focus: { row: 1, column: 0 } })).toEqual(rect);
    expect(rectOf({ anchor: { row: 2, column: 0 }, focus: { row: 1, column: 3 } })).toEqual(rect);
    expect(rectText(rect)).toBe("2-1/3-4");
    expect(inRect(rect, { row: 2, column: 3 })).toBe(true);
    expect(inRect(rect, { row: 0, column: 0 })).toBe(false);
  });

  it("says which sides of the rectangle a cell lies on — where the outline is drawn", () => {
    const rect = { top: 0, left: 0, bottom: 2, right: 2 };
    expect(edgesOf(rect, { row: 0, column: 0 })).toBe("top left");
    expect(edgesOf(rect, { row: 1, column: 1 })).toBe("");
    expect(edgesOf(rect, { row: 2, column: 2 })).toBe("right bottom");
    expect(edgesOf({ top: 1, left: 1, bottom: 1, right: 1 }, { row: 1, column: 1 })).toBe("top right bottom left");
  });

  it("follows the columns shown: cut where they end, gone when none of its columns is left", () => {
    const rect = { top: 0, left: 1, bottom: 0, right: 3 };
    expect(withinColumns(rect, 4)).toEqual(rect);
    expect(withinColumns(rect, 2)).toEqual({ ...rect, right: 1 });
    expect(withinColumns(rect, 1)).toBeUndefined();
  });
});

describe("what a cell copies", () => {
  it("is its text — a tag's too —, and for a link the address it leads to", () => {
    const [id, name, status, note] = columns as [TableColumn, TableColumn, TableColumn, TableColumn];
    expect(copyValue(id, first)).toBe("1");
    expect(copyValue(status, second)).toBe("Failed");
    expect(copyValue(name, first)).toBe("/runs/1");
    expect(copyValue(name, first, whole)).toBe("https://app.example/runs/1");
    expect(copyValue(note, third)).toBe("");
    // A link that leads nowhere (its slot has no value) shows its text, and copies it.
    expect(copyValue(name, { name: "Orphan" }, whole)).toBe("Orphan");
  });
});

describe("the clipboard text", () => {
  it("is a line per row, tabs between the cells, the titles first when asked", () => {
    expect(rangeText(rows, 0, columns, { top: 0, left: 1, bottom: 1, right: 2 }, false, whole)).toEqual({
      text: "https://app.example/runs/1\tSuccess\nhttps://app.example/runs/2\tFailed",
      rows: 2,
      columns: 2,
    });
    expect(rangeText(rows, 0, columns, { top: 2, left: 0, bottom: 2, right: 2 }, true).text).toBe(
      "#\tName\tStatus\n3\t/runs/3\tSuccess",
    );
  });

  it("keeps a cell on its line: a tab or a line break inside a value becomes a space", () => {
    expect(rangeText(rows, 0, columns, { top: 1, left: 3, bottom: 1, right: 3 }, false).text).toBe(
      'said "no" and left early',
    );
  });

  it("holds only the rows held — a slice of the list begins `offset` rows in", () => {
    // The list's rows 100–102 are held; the selection runs over 99–101.
    const copied = rangeText(rows, 100, columns, { top: 99, left: 0, bottom: 101, right: 0 }, false);
    expect(copied).toEqual({ text: "1\n2", rows: 2, columns: 1 });
    expect(rangeText(rows, 100, columns, { top: 0, left: 0, bottom: 50, right: 0 }, false).rows).toBe(0);
  });
});

describe("the CSV file", () => {
  it("has the titles, then every row, a field quoted when it holds a comma, a quote or a line break", () => {
    expect(csvText(rows, columns, whole).split("\r\n")).toEqual([
      "#,Name,Status,Note",
      "1,https://app.example/runs/1,Success,fine",
      '2,https://app.example/runs/2,Failed,"said ""no""\tand left\nearly"',
      "3,https://app.example/runs/3,Success,",
    ]);
    expect(csvText([{ id: "9", name: "a, b" }], [{ title: "Name", property: "name" }])).toBe('Name\r\n"a, b"');
  });

  it("is named by the setting, or after the rows' store path", () => {
    expect(exportFile("", "runs.data")).toBe("runs-data.csv");
    expect(exportFile(" nightly runs ", "runs.data")).toBe("nightly runs.csv");
  });
});
