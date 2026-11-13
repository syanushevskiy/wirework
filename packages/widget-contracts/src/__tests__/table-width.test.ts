import { describe, expect, it } from "vitest";
import { COLUMN_WIDTH, columnWidth, isIdColumn, tableWidth } from "../table";

describe("the width a table needs", () => {
  it("is 110 px a column, so eight plain columns need 880", () => {
    const columns = ["a", "b", "c", "d", "e", "f", "g", "h"].map((property) => ({ property }));
    expect(tableWidth(columns, "id")).toBe(880);
  });

  it("gives an id column 88 px: the rows' key, or a property named like an identity", () => {
    expect(COLUMN_WIDTH).toEqual({ id: 88, default: 110 });
    for (const property of ["id", "ID", "run.id", "user_id", "ownerId"]) {
      expect(isIdColumn(property, "key")).toBe(true);
    }
    expect(isIdColumn("email", "email")).toBe(true);
    for (const property of ["name", "paid", "valid", "idle"]) {
      expect(isIdColumn(property, "id")).toBe(false);
    }
    expect(columnWidth({ property: "id" }, "id")).toBe(88);
  });

  it("takes a column's own width over either default", () => {
    expect(columnWidth({ property: "id", width: 60 }, "id")).toBe(60);
    expect(tableWidth([{ property: "id" }, { property: "name", width: 300 }, { property: "status" }], "id")).toBe(498);
  });
});
