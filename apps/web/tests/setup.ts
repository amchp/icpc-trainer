import "@testing-library/jest-dom/vitest";
import "../src/i18n/i18n.js";

// Node 25 exposes an experimental localStorage global even when no persistence
// file is configured. Vitest preserves that incomplete object while installing
// jsdom globals, so use jsdom's Storage implementation in that environment.
if (typeof window.localStorage.clear !== "function") {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: window.sessionStorage
  });
}
