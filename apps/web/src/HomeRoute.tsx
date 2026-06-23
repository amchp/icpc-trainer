import { AppHeader } from "./AppHeader.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";
import { SyncPanel } from "./SyncPanel.js";
import { useSync } from "./SyncContext.js";

export function HomeRoute(): React.JSX.Element {
  const { hasConnectedJudge, status } = useConnectedJudges();
  const sync = useSync();

  if (status !== "ready" || !hasConnectedJudge) {
    return <main className="min-h-screen bg-zinc-950" />;
  }

  return (
    <div className="min-h-screen text-zinc-100">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        {sync.status === "running" ? <SyncPanel /> : null}
      </main>
    </div>
  );
}
