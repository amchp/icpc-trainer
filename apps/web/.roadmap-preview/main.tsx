import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../src/styles.css";
import "../src/i18n/i18n.js";
import { BinarySearchPage } from "../src/BinarySearchPage.js";
import { BruteForcePage } from "../src/BruteForcePage.js";
import { DataStructuresPage } from "../src/DataStructuresPage.js";
import { ResourcesPage } from "../src/ResourcesPage.js";
import { TimeComplexityPage } from "../src/TimeComplexityPage.js";

/** ?page=<key> picks which guide to render; the roadmap is the default. */
const pages = {
  resources: ResourcesPage,
  timeComplexity: TimeComplexityPage,
  dataStructures: DataStructuresPage,
  bruteForce: BruteForcePage,
  binarySearch: BinarySearchPage
} as const;

const key = new URLSearchParams(window.location.search).get("page") ?? "resources";
const Page = pages[key as keyof typeof pages] ?? ResourcesPage;

createRoot(document.querySelector("#root")!).render(
  <StrictMode>
    <div className="min-h-screen text-zinc-100">
      <Page />
    </div>
  </StrictMode>
);
