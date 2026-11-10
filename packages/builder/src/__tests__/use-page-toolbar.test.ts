/** The toolbar's "add a role": what name is a role name, and what is refused with a reason. */
import { describe, expect, it } from "vitest";
import { roleNameProblem } from "../index";

describe("roleNameProblem", () => {
  const known = ["app-user", "admin"];

  it("accepts a kebab-case name the application does not grant yet", () => {
    expect(roleNameProblem("reviewer", known)).toBeUndefined();
    expect(roleNameProblem("ops/on-call", known)).toBeUndefined();
  });

  it("refuses an empty name, a name that is not kebab-case, and a role already there — each with its reason", () => {
    expect(roleNameProblem("", known)).toBe("type a role name");
    expect(roleNameProblem("App User", known)).toMatch(/kebab-case/);
    expect(roleNameProblem("Admin", known)).toMatch(/kebab-case/);
    expect(roleNameProblem("admin", known)).toBe('the role "admin" is already there');
  });
});
