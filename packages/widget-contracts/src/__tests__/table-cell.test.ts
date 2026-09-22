/**
 * Table cells: the predefined kinds a column may select, and the pure
 * helpers every implementation shares — a tone by exact match, an address
 * from a pattern whose slots select row properties.
 */
import { describe, expect, it } from "vitest";
import { appPathSchema, cellHref, cellText, cellTone, tableCellSchema, tableColumnSchema } from "../index";

describe("tableCellSchema", () => {
  it("accepts the predefined kinds", () => {
    expect(tableCellSchema.parse({ kind: "text" })).toEqual({ kind: "text" });
    expect(tableCellSchema.parse({ kind: "tag" })).toEqual({ kind: "tag", tones: {} });
    expect(tableCellSchema.parse({ kind: "tag", tones: { Failed: "danger" } })).toEqual({
      kind: "tag",
      tones: { Failed: "danger" },
    });
    expect(tableCellSchema.parse({ kind: "link", to: "/demo/runs/{id}" })).toEqual({ kind: "link", to: "/demo/runs/{id}" });
    expect(tableCellSchema.parse({ kind: "custom", name: "run-status", params: { a: 1 } })).toEqual({
      kind: "custom",
      name: "run-status",
      params: { a: 1 },
    });
  });

  it("refuses an unknown kind, an extra key, a tone that is not one, and a renderer name that is not kebab-case", () => {
    expect(tableCellSchema.safeParse({ kind: "badge" }).success).toBe(false);
    expect(tableCellSchema.safeParse({ kind: "text", format: "x" }).success).toBe(false);
    expect(tableCellSchema.safeParse({ kind: "tag", tones: { Failed: "red" } }).success).toBe(false);
    expect(tableCellSchema.safeParse({ kind: "custom", name: "RunStatus" }).success).toBe(false);
  });

  it("is optional on a column and still refuses unknown column keys", () => {
    expect(tableColumnSchema.parse({ title: "#", property: "id" })).toEqual({ title: "#", property: "id" });
    expect(tableColumnSchema.safeParse({ title: "#", property: "id", render: "link" }).success).toBe(false);
  });
});

describe("appPathSchema", () => {
  it("accepts an address of the application and refuses other origins", () => {
    expect(appPathSchema.safeParse("/demo/runs/1").success).toBe(true);
    expect(appPathSchema.safeParse("/").success).toBe(true);
    expect(appPathSchema.safeParse("demo/runs").success).toBe(false);
    expect(appPathSchema.safeParse("//evil.example").success).toBe(false);
    expect(appPathSchema.safeParse("/\\evil.example").success).toBe(false);
    expect(appPathSchema.safeParse("https://evil.example").success).toBe(false);
    expect(appPathSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });
});

describe("cellText", () => {
  it("shows nothing for no value, JSON for objects, the value otherwise", () => {
    expect(cellText(undefined)).toBe("");
    expect(cellText(null)).toBe("");
    expect(cellText(3)).toBe("3");
    expect(cellText(false)).toBe("false");
    expect(cellText({ a: 1 })).toBe('{"a":1}');
  });
});

describe("cellTone", () => {
  const tones = { Success: "success", Failed: "danger" } as const;

  it("matches the value's text exactly", () => {
    expect(cellTone(tones, "Success")).toBe("success");
    expect(cellTone(tones, "Failed")).toBe("danger");
  });

  it("gives the default tone for a miss — no case folding, no partial match", () => {
    expect(cellTone(tones, "success")).toBe("default");
    expect(cellTone(tones, "Failed!")).toBe("default");
    expect(cellTone(tones, undefined)).toBe("default");
    expect(cellTone({}, "Success")).toBe("default");
  });
});

describe("cellHref", () => {
  it("fills every slot from the row, URL-encoded", () => {
    expect(cellHref("/demo/runs/{id}", { id: "123456" })).toBe("/demo/runs/123456");
    expect(cellHref("/a/{x}/b/{y}", { x: "1 2", y: "é/ü" })).toBe("/a/1%202/b/%C3%A9%2F%C3%BC");
    expect(cellHref("/runs/{ status.state }", { status: { state: "Failed" } })).toBe("/runs/Failed");
    expect(cellHref("/plain", { id: "1" })).toBe("/plain");
  });

  it("gives no address when a slot has no value (plain text instead of a broken link)", () => {
    expect(cellHref("/demo/runs/{id}", {})).toBeUndefined();
    expect(cellHref("/demo/runs/{id}", { id: null })).toBeUndefined();
    expect(cellHref("/demo/runs/{id}", { id: "" })).toBeUndefined();
    expect(cellHref("/demo/runs/{id}", { id: 0 })).toBe("/demo/runs/0");
  });
});
