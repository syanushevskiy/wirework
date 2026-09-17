import { defineConfig, devices } from "@playwright/test";
import { cucumberReporter, defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: "features/**/*.feature",
  steps: "steps/**/*.ts",
});

const ci = Boolean(process.env["CI"]);

export default defineConfig({
  testDir,
  // CI: a stray `.only` fails the run, and one retry separates a flake
  // (passes on retry, still reported) from a real failure.
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: [
    [ci ? "line" : "list"],
    // Reports a person can open — the scenario text with pass/fail per
    // step (cucumber) and traces on failure (playwright). Never auto-opened.
    cucumberReporter("html", { outputFile: "reports/cucumber/index.html" }),
    ["html", { outputFolder: "reports/playwright", open: "never" }],
  ],
  use: {
    // Own port: never collides with (or kills) a developer's `pnpm dev` on 5173.
    baseURL: "http://localhost:5174",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // A direct node process: Playwright can kill it reliably. A package-
    // manager wrapper leaves an orphaned vite behind, which then serves
    // STALE modules to the next run's first scenarios.
    command: "node node_modules/vite/bin/vite.js --port 5174 --strictPort",
    cwd: "../apps/playground",
    url: "http://localhost:5174",
    // Never reuse a server we did not start: a leftover one serves cached
    // (stale) modules, and the run would silently test old code.
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    timeout: 60_000,
  },
});
