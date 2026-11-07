/**
 * PageViews — the list says what is shown and of which kind, the buttons
 * follow the hook's locks, the panel takes a name or a JSON and says in
 * words why a submit was refused, and every change reaches `commit`.
 */
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  usePageViews,
  type Commit,
  type EditableTrees,
  type EditLock,
  type EditTarget,
  type TreesChange,
} from "@wirework/builder";
import { PageViews } from "../page-views";
import { layoutEngines, treesWithViews } from "./fixtures";

interface HarnessProps {
  editLock?: EditLock | undefined;
  target?: EditTarget;
  roles?: readonly string[] | undefined;
  shown?: string | undefined;
  onCommit: (change: TreesChange) => void;
}

/** The component on a live hook: commits land in local state, so the list follows them like a store would. */
function Harness({ editLock, target = "user", roles, shown = "mine", onCommit }: HarnessProps) {
  const [trees, setTrees] = useState<EditableTrees>(treesWithViews);
  const commit: Commit = (change) => {
    onCommit(change);
    setTrees((current) => ({ ...current, ...change }));
  };
  const views = usePageViews({
    commit,
    editLock,
    layoutEngines: layoutEngines(),
    page: "demo",
    trees,
    target,
    roles,
    shown,
    cancelEditing: () => undefined,
  });
  return <PageViews views={views} />;
}

function renderViews(props: Omit<HarnessProps, "onCommit"> = {}) {
  const onCommit = vi.fn();
  render(<Harness {...props} onCommit={onCommit} />);
  return { onCommit };
}

describe("PageViews", () => {
  it("shows the chosen view with its kind, and offers every action for the user's own view", () => {
    renderViews();
    expect(screen.getByTestId("page-view-select").getAttribute("data-kind")).toBe("user");
    expect(screen.getByTestId("page-view-kind").textContent).toBe("mine");
    for (const id of ["view-save-as", "view-rename", "view-delete", "view-share", "view-import"]) {
      expect(screen.getByTestId<HTMLButtonElement>(id).disabled).toBe(false);
    }
  });

  it("locks Rename and Delete on a prebuilt view, and the whole list while the overlay is off", () => {
    renderViews({ shown: "compact", target: "base" });
    expect(screen.getByTestId("page-view-kind").textContent).toBe("prebuilt");
    expect(screen.getByTestId<HTMLButtonElement>("view-rename").disabled).toBe(true);
    expect(screen.getByTestId<HTMLButtonElement>("view-delete").disabled).toBe(true);
    expect(screen.getByTestId("page-view-select").className).toContain("disabled");
    expect(screen.getByTitle(/Turn the user overlay on/)).toBeTruthy();
  });

  it("editing for a role, the list is open and the user's own view is not the role's to rename (doc/roles-design.md)", () => {
    renderViews({ shown: "compact", target: { role: "admin" }, roles: ["admin"] });
    expect(screen.getByTestId("page-view-kind").textContent).toBe("prebuilt");
    expect(screen.getByTestId("page-view-select").className).not.toContain("disabled");
    expect(screen.getByTestId<HTMLButtonElement>("view-rename").disabled).toBe(true);
    expect(screen.getByTestId<HTMLButtonElement>("view-save-as").disabled).toBe(false);
  });

  it("locks what changes a page without the permission, and says why", () => {
    renderViews({ editLock: "permission" });
    expect(screen.getByTestId<HTMLButtonElement>("view-save-as").disabled).toBe(true);
    expect(screen.getByTestId<HTMLButtonElement>("view-import").disabled).toBe(true);
    expect(screen.getByTestId<HTMLButtonElement>("view-share").disabled).toBe(false);
    expect(screen.getByTitle("Your permissions do not include editing pages")).toBeTruthy();
  });

  it("saves the shown view under a typed name, and refuses a taken one in words", () => {
    const { onCommit } = renderViews();
    fireEvent.click(screen.getByTestId("view-save-as"));
    expect(screen.getByTestId("page-view-panel").getAttribute("data-panel")).toBe("save-as");
    fireEvent.change(screen.getByTestId("view-name"), { target: { value: "compact" } });
    fireEvent.click(screen.getByTestId("view-apply"));
    expect(screen.getByTestId("view-problem").textContent).toContain('There is already a view named "compact"');
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId("view-name"), { target: { value: "tight" } });
    fireEvent.click(screen.getByTestId("view-apply"));
    expect(screen.queryByTestId("page-view-panel")).toBeNull();
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0]?.[0]).toMatchObject({ userViewModels: { pages: { demo: { view: "tight" } } } });
  });

  it("shares the shown view as JSON a reader can copy, and imports such a JSON as a new view", () => {
    const { onCommit } = renderViews();
    fireEvent.click(screen.getByTestId("view-share"));
    const text = screen.getByTestId<HTMLTextAreaElement>("view-json").value;
    expect(JSON.parse(text)).toMatchObject({ kind: "wirework-page-view", page: "demo", name: "mine" });
    fireEvent.click(screen.getByTestId("view-apply"));

    fireEvent.click(screen.getByTestId("view-import"));
    fireEvent.change(screen.getByTestId("view-json"), { target: { value: text } });
    fireEvent.change(screen.getByTestId("view-name"), { target: { value: "pasted" } });
    fireEvent.click(screen.getByTestId("view-apply"));
    expect(onCommit.mock.calls[0]?.[0]).toMatchObject({
      userViewModels: { pages: { demo: { view: "pasted", templates: { mine: {}, pasted: {} } } } },
    });
  });

  it("says in words why an import is refused", () => {
    renderViews();
    fireEvent.click(screen.getByTestId("view-import"));
    fireEvent.change(screen.getByTestId("view-json"), { target: { value: "{" } });
    fireEvent.click(screen.getByTestId("view-apply"));
    expect(screen.getByTestId("view-problem").textContent).toContain("This is not a Wirework page view");
    fireEvent.click(screen.getByTestId("view-cancel"));
    expect(screen.queryByTestId("page-view-panel")).toBeNull();
  });
});
