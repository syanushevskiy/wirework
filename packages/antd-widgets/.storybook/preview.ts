import type { Preview } from "@storybook/react-vite";
import "@wirework/react/styles.css";
import "../src/styles.css";

const preview: Preview = {
  parameters: {
    layout: "padded",
    controls: { expanded: true },
  },
};

export default preview;
