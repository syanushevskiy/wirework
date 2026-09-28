/**
 * useAfterMount — a widget announcing its appearance: once per mount (under
 * StrictMode too), in a task of its own, with the LATEST announce (a fresh
 * `emit` after a rebind), again when the page reloads in place, and not at
 * all when unmounted before its turn.
 */
import { StrictMode } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAfterMount } from "../useAfterMount";
import { PageReloadContext } from "../useAnnounce";

function Widget({ announce }: { announce: () => void }) {
  useAfterMount(announce);
  return null;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useAfterMount", () => {
  it("announces once per mount, after the commit, under StrictMode too", () => {
    const announce = vi.fn();
    render(
      <StrictMode>
        <Widget announce={announce} />
      </StrictMode>,
    );
    expect(announce).not.toHaveBeenCalled();

    act(() => vi.runAllTimers());
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it("runs the latest announce when a render replaced it before the turn came", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Widget announce={first} />);
    rerender(<Widget announce={second} />);

    act(() => vi.runAllTimers());
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("announces again when the page reloads in place — the widget stays mounted", () => {
    const announce = vi.fn();
    const page = (reload: number) => (
      <PageReloadContext value={reload}>
        <Widget announce={announce} />
      </PageReloadContext>
    );
    const { rerender } = render(page(1));
    act(() => vi.runAllTimers());
    rerender(page(1));
    act(() => vi.runAllTimers());
    expect(announce).toHaveBeenCalledTimes(1);

    rerender(page(2));
    act(() => vi.runAllTimers());
    expect(announce).toHaveBeenCalledTimes(2);
  });

  it("announces nothing for a widget unmounted before its turn", () => {
    const announce = vi.fn();
    const { unmount } = render(<Widget announce={announce} />);
    unmount();

    act(() => vi.runAllTimers());
    expect(announce).not.toHaveBeenCalled();
  });
});
