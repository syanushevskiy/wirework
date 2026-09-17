/** The input contract's rule set as this package implements it. */
import { describe, expect, it } from "vitest";
import { validate } from "../validation";

describe("premade rules", () => {
  it.each([
    ["none", "anything", true],
    ["required", "", false],
    ["required", "   ", false],
    ["required", "x", true],
    ["email", "a@b.co", true],
    ["email", "a@b", false],
    ["integer", "-12", true],
    ["integer", "1.5", false],
    ["url", "https://example.com/path", true],
    ["url", "http://localhost:8080", true],
    ["url", "localhost:8080", false],
    ["url", "mailto:someone@example.com", false],
    ["url", "not a url", false],
  ] as const)("%s accepts %j: %s", (rule, value, valid) => {
    expect(validate(value, rule).valid).toBe(valid);
  });

  it("an empty value passes every rule except required", () => {
    for (const rule of ["none", "email", "integer", "url"] as const) {
      expect(validate("", rule)).toEqual({ valid: true });
    }
  });
});

describe("custom pattern", () => {
  it("applies after the premade rule, with its own message", () => {
    expect(validate("abc", "none", "^\\d+$", "digits only")).toEqual({ valid: false, message: "digits only" });
    expect(validate("", "required", "^\\d+$")).toEqual({ valid: false, message: "required" });
    expect(validate("123", "none", "^\\d+$")).toEqual({ valid: true });
  });

  it("reports an invalid pattern instead of throwing", () => {
    expect(validate("x", "none", "(")).toEqual({ valid: false, message: "invalid pattern: (" });
  });
});
