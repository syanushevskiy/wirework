import type { StorybookConfig } from "@storybook/react-vite";

/** Storybook for the antd builder: the panel, the editor and the port field against the standard antd widgets. */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  framework: { name: "@storybook/react-vite", options: {} },
  // The stories double as tests: `vitest.config.ts` runs every one in Chromium.
  addons: ["@storybook/addon-vitest"],
};

export default config;
