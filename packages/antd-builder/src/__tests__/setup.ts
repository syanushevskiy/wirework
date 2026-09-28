/**
 * Every suite of this package renders antd components in jsdom: unmount
 * after each test (without vitest globals, Testing Library cannot do it by
 * itself), and give antd the `matchMedia` its responsive layouts ask for —
 * jsdom has none, and every query answers "no match".
 */
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

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
