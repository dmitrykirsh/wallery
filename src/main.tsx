import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import WidgetOverlay from "./components/widgets/WidgetOverlay";
import { LangProvider } from "./lib/LangContext";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

// A desktop widget (clock, date, weather…) lives in its own separate,
// transparent Tauri window that loads this exact same bundle — the only
// way to tell them apart is the URL. Route straight to the bare widget
// face here, before any of the normal app's providers/chrome exist.
const widgetMatch = window.location.hash.match(/^#\/widget\/(.+)$/);

if (widgetMatch) {
  document.documentElement.classList.add("widget-mode");
  root.render(
    <React.StrictMode>
      <WidgetOverlay id={widgetMatch[1]} />
    </React.StrictMode>,
  );
} else {
  root.render(
    <React.StrictMode>
      <LangProvider>
        <App />
      </LangProvider>
    </React.StrictMode>,
  );
}
