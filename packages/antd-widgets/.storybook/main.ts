import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Storybook for the antd widgets: every widget gets stories driven by
 * its own declaration (settings become controls, events become actions).
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  framework: { name: "@storybook/react-vite", options: {} },
};

export default config;
