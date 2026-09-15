import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@wirework/react/styles.css";
import "@wirework/engine-flex-rows/styles.css";
import "@wirework/engine-react-grid-layout/styles.css";
import "@wirework/engine-gridstack/styles.css";
import "@wirework/engine-flexlayout/styles.css";
import "@wirework/widgets-examples/styles.css";
import "./index.css";
import { App } from "./App";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
