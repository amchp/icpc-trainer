import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../src/styles.css";
import "../src/i18n/i18n.js";
import { ResourcesPage } from "../src/ResourcesPage.js";

createRoot(document.querySelector("#root")!).render(
  <StrictMode>
    <div className="min-h-screen text-zinc-100">
      <ResourcesPage />
    </div>
  </StrictMode>
);
