import { APP_NAME } from "@icpc-trainer/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";

import { Button } from "./components/ui.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";
import { judgeLabel } from "./judgeConfig.js";
import { useSync } from "./SyncContext.js";
import { trpc } from "./trpc.js";
import { useToaster } from "./Toaster.js";

export function AppHeader(): React.JSX.Element {
  const { connectedJudges } = useConnectedJudges();
  const { startSync, status: syncStatus } = useSync();
  const toaster = useToaster();
  const dataStatusQuery = useQuery({
    queryKey: ["account", "dataStatus"],
    queryFn: () => trpc.account.dataStatus.query()
  });
  const connectedJudgeIds = new Set(connectedJudges.map((judge) => judge.id));
  const syncedContestJudges = dataStatusQuery.data?.syncedContestJudges ?? [];
  const syncTargetJudges = dataStatusQuery.data?.hasSyncedContests
    ? syncedContestJudges.filter((judge) => connectedJudgeIds.has(judge))
    : connectedJudges.map((judge) => judge.id);
  const missingSyncJudges = dataStatusQuery.data?.hasSyncedContests
    ? syncedContestJudges.filter((judge) => !connectedJudgeIds.has(judge))
    : [];

  return (
    <header className="relative z-40 border-b border-zinc-800 bg-zinc-950/80 px-5 backdrop-blur sm:px-8">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 text-zinc-100">
          <img src="/icpc_trainer.png" alt="" className="size-8 object-contain" />
          <span className="truncate text-sm font-semibold">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <Link
            to="/upsolving"
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
          >
            Upsolving
          </Link>

          <Link
            to="/contests"
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
          >
            Contests
          </Link>

          <Link
            to="/team"
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
          >
            Team
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={
              syncStatus === "running" ||
              dataStatusQuery.isLoading ||
              (syncTargetJudges.length === 0 && missingSyncJudges.length === 0)
            }
            onClick={() => {
              for (const judge of missingSyncJudges) {
                toaster.warning({
                  title: `${judgeLabel(judge)} authentication is not connected`,
                  description: `${judgeLabel(judge)} has synced contests locally. Reconnect it from Judges to sync new data.`
                });
              }
              startSync(syncTargetJudges);
            }}
          >
            <RefreshCw className={syncStatus === "running" ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
            Sync
          </Button>

          <Link
            to="/judges"
            className="inline-flex rounded-md px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
          >
            Judges
          </Link>
        </div>
      </div>
    </header>
  );
}
