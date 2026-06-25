import { Navigate, Outlet } from "@tanstack/react-router";

import { AppHeader } from "./AppHeader.js";
import { Card, Skeleton } from "./components/ui.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";
import { SyncPanel } from "./SyncPanel.js";
import { useSync } from "./SyncContext.js";

export function ProtectedLayout(): React.JSX.Element {
  const sync = useSync();
  const { hasConnectedJudge, status } = useConnectedJudges();

  if (status === "ready" && !hasConnectedJudge) {
    return <Navigate to="/connect-judges" />;
  }

  return (
    <div className="min-h-screen text-zinc-100">
      <AppHeader />
      {sync.status === "running" ? (
        <section className="mx-auto w-full max-w-6xl px-5 pt-6 sm:px-8">
          <SyncPanel />
        </section>
      ) : null}
      {status === "loading" ? (
        <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
          <Card className="p-5">
            <Skeleton className="h-32" />
          </Card>
        </main>
      ) : (
        <Outlet />
      )}
    </div>
  );
}
