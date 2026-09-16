import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App as AntApp } from "antd";
import "antd/dist/reset.css";
import "@wirework/react/styles.css";
import "@wirework/engine-flex-rows/styles.css";
import "@wirework/engine-react-grid-layout/styles.css";
import "@wirework/engine-gridstack/styles.css";
import "@wirework/engine-flexlayout/styles.css";
import "@wirework/antd-widgets/styles.css";
import "./index.css";
import { App } from "./App";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <StrictMode>
    {/* antd's App: theme-aware defaults (typography, colours) for everything below. */}
    <AntApp>
      <App />
    </AntApp>
  </StrictMode>,
);
