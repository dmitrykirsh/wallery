import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LangProvider } from "./lib/LangContext";
import { HoverBackgroundProvider } from "./lib/HoverBackgroundContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <LangProvider>
      <HoverBackgroundProvider>
        <App />
      </HoverBackgroundProvider>
    </LangProvider>
  </React.StrictMode>,
);
