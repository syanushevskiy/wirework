import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Storybook for the antd widgets: every widget gets stories driven by
 * its own declaration (settings become controls, events become actions).
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  framework: { name: "@storybook/react-vite", options: {} },
  // The stories double as tests: `vitest.config.ts` runs every one in Chromium.
  addons: ["@storybook/addon-vitest"],
};

export default config;
