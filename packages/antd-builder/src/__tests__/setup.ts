/**
 * Every suite of this package renders antd components in jsdom: unmount
 * after each test (without vitest globals, Testing Library cannot do it by
 * itself), and give antd the `matchMedia` its responsive layouts ask for —
 * jsdom has none, and every query answers "no match" — and the
 * `ResizeObserver` its text areas measure themselves with, which observes
 * nothing.
 */
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Unmount, then let the frame antd's dropdowns schedule (`useDelayState`
 * in @rc-component/util: a `requestAnimationFrame`, ~16 ms in jsdom) fire
 * while the window still exists. Without the wait the last test of a file
 * leaves a frame pending; it runs after jsdom is torn down and React's
 * state update throws "window is not defined" as an unhandled error, under
 * load — a flake the whole suite then fails on.
 */
afterEach(async () => {
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 40));
});

const idle = (): undefined => undefined;
class IdleResizeObserver {
  observe = idle;
  unobserve = idle;
  disconnect = idle;
}
Object.defineProperty(window, "ResizeObserver", { writable: true, value: IdleResizeObserver });

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});
