// abstract: React bootstrap entry that mounts the top-level app component.
// out_of_scope: Domain workflows, parser behavior, and evaluation orchestration.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
