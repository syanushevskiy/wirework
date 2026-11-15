/**
 * Moving between a page and the layouts inside its containers
 * (doc/ADR/0009-containers.md): every move saves the open session first,
 * "Edit content" opens the layout inside in edit mode, a placed container
 * opens at once, and widgets are added inside a container on the shared
 * page only.
 */
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EditTarget } from "../page-edits";
import { useLayoutNavigation, type LayoutNavigationInput } from "../use-layout-navigation";

function navigation(input: Partial<LayoutNavigationInput> = {}) {
  const order: string[] = [];
  const calls = {
    onAt: vi.fn((at: string | undefined) => void order.push(`at:${at ?? "page"}`)),
    save: vi.fn(() => void order.push("save")),
    startEditing: vi.fn(() => void order.push("edit")),
    onChanged: vi.fn(() => void order.push("changed")),
  };
  const { result } = renderHook(() =>
    useLayoutNavigation({ at: undefined, target: "base", addsToPage: false, ...calls, ...input }),
  );
  return { layout: result.current, order, ...calls };
}

describe("useLayoutNavigation", () => {
  it("saves the page before the layout shown changes — a breadcrumb's step", () => {
    const { layout, order } = navigation({ at: "card-1" });
    layout.goTo(undefined);
    expect(order).toEqual(["save", "at:page"]);
  });

  it("opens a container's layout in edit mode: saved, shown, then a session of its own", () => {
    const { layout, order } = navigation();
    layout.editLayout("card-1", "content");
    expect(order).toEqual(["save", "at:card-1", "edit"]);
  });

  it("chains one level further down from the layout shown, naming a layout that is not the one content", () => {
    const { layout, onAt } = navigation({ at: "card-1" });
    layout.editLayout("tabs-1", "tabs.0.content");
    expect(onAt).toHaveBeenCalledWith("card-1/tabs-1/tabs.0.content");
  });

  it("opens a container that was just placed on its first layout, after the host heard of the change", () => {
    const { layout, order, startEditing } = navigation();
    layout.onAdded({ id: "custom-1", widget: "box", layouts: ["content"] });
    expect(order).toEqual(["changed", "save", "at:custom-1"]);
    // In view mode: the next widget is added inside it, not dragged.
    expect(startEditing).not.toHaveBeenCalled();
  });

  it("stays where it is when what was placed holds no layout", () => {
    const { layout, order } = navigation({ at: "card-1" });
    layout.onAdded({ id: "custom-2", widget: "counter", layouts: [] });
    expect(order).toEqual(["changed"]);
  });

  it("offers Add on a builder page, and inside a container on the shared page only", () => {
    const where = (at: string | undefined, target: EditTarget, addsToPage = false) => {
      const { adding, addAt } = navigation({ at, target, addsToPage }).layout;
      return { adding, addAt };
    };
    expect(where(undefined, "base", true)).toEqual({ adding: true, addAt: undefined });
    expect(where(undefined, "base")).toEqual({ adding: false, addAt: undefined });
    expect(where("card-1", "base")).toEqual({ adding: true, addAt: "card-1" });
    // A user's own copy of a layout, and a role's, take no new widget there: the widget goes to the page.
    expect(where("card-1", "user")).toEqual({ adding: false, addAt: undefined });
    expect(where("card-1", { role: "admin" }, true)).toEqual({ adding: true, addAt: undefined });
  });
});
