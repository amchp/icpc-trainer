import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";
import { ConnectedJudgesProvider } from "./ConnectedJudgesContext.js";
import { router } from "./router.js";
import { SyncProvider } from "./SyncContext.js";
import { ToasterProvider } from "./Toaster.js";

const queryClient = new QueryClient();
const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToasterProvider>
        <ConnectedJudgesProvider>
          <SyncProvider>
            <RouterProvider router={router} />
          </SyncProvider>
        </ConnectedJudgesProvider>
      </ToasterProvider>
    </QueryClientProvider>
  </StrictMode>,
);
