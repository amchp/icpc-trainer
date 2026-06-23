import { Outlet } from "@tanstack/react-router";

import { AppHeader } from "./AppHeader.js";
import { SyncPanel } from "./SyncPanel.js";
import { useSync } from "./SyncContext.js";

export function ProtectedLayout(): React.JSX.Element {
  const sync = useSync();

  return (
    <div className="min-h-screen text-zinc-100">
      <AppHeader />
      {sync.status === "running" ? (
        <section className="mx-auto w-full max-w-6xl px-5 pt-6 sm:px-8">
          <SyncPanel />
        </section>
      ) : null}
      <Outlet />
    </div>
  );
}
