import { createBrowserHistory } from "@tanstack/react-router";

// AuthGate sits outside RouterProvider. Sharing history keeps its preview boundary
// and post-login destination current during client-side navigation as well.
export const appHistory = createBrowserHistory();
