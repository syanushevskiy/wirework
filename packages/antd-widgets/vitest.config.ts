import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { defineConfig } from "vitest/config";

/**
 * Two projects: the unit tests (node), and every story as a test in a real
 * Chromium — a story's `play` function is its assertion, a story without
 * one is a render smoke test. `pnpm test` runs both; CI installs the
 * browser first (`playwright install chromium`).
 */
export default defineConfig({
  test: {
    projects: [
      { test: { name: "unit", include: ["src/**/*.test.ts"] } },
      {
        plugins: [storybookTest({ configDir: ".storybook" })],
        // The workspace packages are symlinks: without this the browser gets two Reacts (hooks then find no dispatcher).
        resolve: { dedupe: ["react", "react-dom"] },
        // What the linked packages pull in, pre-bundled: discovering it mid-run reloads the page and fails the tests in flight.
        optimizeDeps: {
          include: [
            "antd",
            "react",
            "react-dom",
            "react-dom/client",
            "react/jsx-dev-runtime",
            "zod",
            "zustand/vanilla",
          ],
        },
        test: {
          name: "storybook",
          browser: { enabled: true, headless: true, provider: "playwright", instances: [{ browser: "chromium" }] },
        },
      },
    ],
  },
});
