// ESLint for the whole workspace. Strict TypeScript rules, the React hooks
// rules, and nothing that Prettier owns (eslint-config-prettier turns those
// off). `no-console` is an error in library code (`packages/`): a library
// reports through its API, and every exception says why in a disable
// comment. Apps, tests, stories and scripts may log.
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/storybook-static/**",
      "e2e/.features-gen/**",
      "e2e/reports/**",
      "e2e/test-results/**",
      ".claude-tmp/**",
      "doc/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs["recommended-latest"].rules,
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["packages/**/src/**/*.{ts,tsx}"],
    ignores: ["**/__tests__/**", "**/*.test.*", "**/stories/**", "**/*.stories.*"],
    rules: { "no-console": "error" },
  },
  prettier,
);
