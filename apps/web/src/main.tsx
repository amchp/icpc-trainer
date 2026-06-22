import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";
import { ConnectedJudgesProvider } from "./ConnectedJudgesContext.js";
import { router } from "./router.js";

const queryClient = new QueryClient();
const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConnectedJudgesProvider>
        <RouterProvider router={router} />
      </ConnectedJudgesProvider>
    </QueryClientProvider>
  </StrictMode>,
);
