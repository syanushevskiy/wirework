/**
 * Reusable story tooling for implementations of the standard contracts —
 * an application's Storybook imports this to run the same conformance set
 * against its own widgets. Dev-only (needs storybook, store, bus, engine).
 */
export { WidgetStory, storyArgs, storyArgTypes } from "./harness";
export type { WidgetStoryProps } from "./harness";
export { buttonConformance, inputConformance, labelConformance } from "./conformance";
