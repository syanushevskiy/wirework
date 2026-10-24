/**
 * usePageViews — the list of a page's views and what a user does with them:
 * choosing one (no permission needed, overlay on), Save as / Import where
 * the edit target says, Rename and Delete of their own only, Share as a
 * file; every refusal a code on the panel, every write through `commit`.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EditLock } from "../locks";
import type { Commit, EditableTrees } from "../use-commit";
import type { EditTarget } from "../use-page-editing";
import { usePageViews } from "../use-page-views";
import { enginesWith, listEngine, treesWithCounter } from "./fixtures";

interface Props {
  editLock: EditLock | undefined;
  target: EditTarget;
  withUserOverlay: boolean;
  shown: string | undefined;
  trees: EditableTrees;
}

const compact = { engine: "list", cells: [] };

/** The page "demo": the counter's default, a prebuilt "compact", and the user's "mine", shown. */
const treesWithViews = (): EditableTrees => {
  const trees = treesWithCounter();
  trees.viewModels.pages["demo"] = { ...trees.viewModels.pages["demo"], compact };
  trees.userViewModels = { pages: { demo: { view: "mine", templates: { mine: compact } } } };
  return trees;
};

function setup(overrides: Partial<Props> = {}) {
  const commit = vi.fn<Commit>();
  const cancelEditing = vi.fn();
  const initialProps: Props = {
    editLock: undefined,
    target: "user",
    withUserOverlay: true,
    shown: "mine",
    trees: treesWithViews(),
    ...overrides,
  };
  const hook = renderHook(
    (props: Props) =>
      usePageViews({ commit, layoutEngines: enginesWith(listEngine), page: "demo", cancelEditing, ...props }),
    { initialProps },
  );
  return { commit, cancelEditing, initialProps, ...hook };
}

const committedUser = (commit: ReturnType<typeof vi.fn<Commit>>) => {
  const change = commit.mock.calls[0]?.[0];
  return change && "userViewModels" in change ? change.userViewModels.pages?.["demo"] : undefined;
};

describe("usePageViews — the list", () => {
  it("lists prebuilt views and the user's own, and knows which is shown", () => {
    const { result } = setup();
    expect(result.current.views).toEqual([
      { name: "default", kind: "base" },
      { name: "compact", kind: "base" },
      { name: "mine", kind: "user" },
    ]);
    expect(result.current.shown).toEqual({ name: "mine", kind: "user" });
    expect(result.current.viewsLock).toBeUndefined();
    expect(result.current.canRename).toBe(true);
    expect(result.current.canShare).toBe(true);
  });

  it("locks the choice while the overlay is off, and when the page has no views", () => {
    expect(setup({ withUserOverlay: false }).result.current.viewsLock).toBe("overlay-off");
    const trees = treesWithCounter();
    trees.viewModels.pages = {};
    expect(setup({ trees, shown: undefined }).result.current.viewsLock).toBe("no-page");
  });

  it("chooses a view without any permission, ending an open session", () => {
    const { result, commit, cancelEditing } = setup({ editLock: "permission", shown: "compact" });
    expect(result.current.canManage).toBe(false);
    act(() => result.current.select("compact"));
    expect(cancelEditing).toHaveBeenCalledTimes(1);
    expect(committedUser(commit)).toMatchObject({ view: "compact" });
  });

  it("chooses nothing while the overlay is off", () => {
    const { result, commit } = setup({ withUserOverlay: false });
    act(() => result.current.select("compact"));
    expect(commit).not.toHaveBeenCalled();
  });
});

describe("usePageViews — Save as", () => {
  it("copies the shown view under the typed name as the user's own, and shows it", () => {
    const { result, commit } = setup({ shown: "compact" });
    act(() => result.current.openSaveAs());
    expect(result.current.panel).toEqual({ kind: "save-as", name: "compact-copy", text: "" });
    act(() => result.current.setName("tight"));
    act(() => result.current.submit());
    expect(result.current.panel).toBeUndefined();
    expect(committedUser(commit)).toEqual({ view: "tight", templates: { mine: compact, tight: compact } });
  });

  it("makes a PREBUILT view when the target is the shared page", () => {
    const { result, commit } = setup({ target: "base", withUserOverlay: false, shown: "default" });
    act(() => result.current.openSaveAs());
    act(() => result.current.setName("team-wide"));
    act(() => result.current.submit());
    const change = commit.mock.calls[0]?.[0];
    expect(change && "viewModels" in change ? Object.keys(change.viewModels.pages["demo"] ?? {}) : []).toEqual([
      "default",
      "compact",
      "team-wide",
    ]);
  });

  it("refuses a name a view of either kind has, an empty one and a dotted one — and keeps the panel open", () => {
    const { result, commit } = setup();
    act(() => result.current.openSaveAs());
    act(() => result.current.setName("compact"));
    act(() => result.current.submit());
    expect(result.current.panel?.problem).toEqual({ kind: "name-taken", name: "compact" });
    act(() => result.current.setName(" "));
    expect(result.current.panel?.problem).toBeUndefined();
    act(() => result.current.submit());
    expect(result.current.panel?.problem).toEqual({ kind: "empty-name" });
    act(() => result.current.setName("v1.0"));
    act(() => result.current.submit());
    expect(result.current.panel?.problem).toEqual({ kind: "dotted-name" });
    expect(commit).not.toHaveBeenCalled();
  });

  it("does not open without the permission", () => {
    const { result } = setup({ editLock: "loading" });
    act(() => result.current.openSaveAs());
    expect(result.current.panel).toBeUndefined();
  });
});

describe("usePageViews — Rename and Delete", () => {
  it("renames the user's shown view", () => {
    const { result, commit } = setup();
    act(() => result.current.openRename());
    expect(result.current.panel).toMatchObject({ kind: "rename", name: "mine" });
    act(() => result.current.setName("kept"));
    act(() => result.current.submit());
    expect(committedUser(commit)).toEqual({ view: "kept", templates: { kept: compact } });
  });

  it("never renames or deletes a prebuilt view", () => {
    const { result, commit } = setup({ shown: "compact" });
    expect(result.current.canRename).toBe(false);
    expect(result.current.canRemove).toBe(false);
    act(() => result.current.openRename());
    expect(result.current.panel).toBeUndefined();
    act(() => result.current.remove());
    expect(commit).not.toHaveBeenCalled();
  });

  it("deletes the user's shown view, so the page goes back to its default", () => {
    const { result, commit, cancelEditing } = setup();
    act(() => result.current.remove());
    expect(cancelEditing).toHaveBeenCalledTimes(1);
    expect(committedUser(commit)).toEqual({ templates: {} });
  });
});

describe("usePageViews — Share and Import", () => {
  it("shares the shown view as a file, whatever its kind", () => {
    const { result } = setup({ shown: "compact" });
    act(() => result.current.openShare());
    expect(result.current.panel?.kind).toBe("share");
    expect(JSON.parse(result.current.panel?.text ?? "")).toEqual({
      kind: "wirework-page-view",
      version: 1,
      page: "demo",
      name: "compact",
      template: compact,
    });
    act(() => result.current.submit());
    expect(result.current.panel).toBeUndefined();
  });

  it("imports a file as a new view under the file's name, or the typed one", () => {
    const { result, commit } = setup({ shown: "compact" });
    act(() => result.current.openShare());
    const text = result.current.panel?.text ?? "";
    act(() => result.current.openImport());
    act(() => result.current.setText(text));
    act(() => result.current.submit());
    expect(result.current.panel?.problem).toEqual({ kind: "name-taken", name: "compact" });
    act(() => result.current.setName("pasted"));
    act(() => result.current.submit());
    expect(result.current.panel).toBeUndefined();
    expect(committedUser(commit)).toEqual({ view: "pasted", templates: { mine: compact, pasted: compact } });
  });

  it("refuses a file that is not a view, one for another page, and one its engine rejects", () => {
    const { result, commit } = setup();
    act(() => result.current.openImport());
    act(() => result.current.setText("not json"));
    act(() => result.current.submit());
    expect(result.current.panel?.problem).toMatchObject({ kind: "not-a-view" });
    act(() =>
      result.current.setText(
        JSON.stringify({ kind: "wirework-page-view", version: 1, page: "other", name: "x", template: compact }),
      ),
    );
    act(() => result.current.submit());
    expect(result.current.panel?.problem).toEqual({ kind: "other-page", page: "other" });
    act(() =>
      result.current.setText(
        JSON.stringify({
          kind: "wirework-page-view",
          version: 1,
          page: "demo",
          name: "x",
          template: { engine: "nope" },
        }),
      ),
    );
    act(() => result.current.submit());
    expect(result.current.panel?.problem).toMatchObject({ kind: "invalid-template" });
    expect(commit).not.toHaveBeenCalled();
  });
});
