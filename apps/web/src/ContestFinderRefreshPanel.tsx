import type { ContestFinderRefreshStatus } from "@icpc-trainer/api";
import { RUN_STATUSES, type JudgeProvider } from "@icpc-trainer/shared";

import { Progress } from "./components/ui.js";
import { judgeLabel, judgeSyncProgressClassName } from "./judgeConfig.js";

export interface ContestFinderRefreshState {
  readonly provider: JudgeProvider;
  readonly status: ContestFinderRefreshStatus;
  readonly progress: number;
  readonly stepsLeft: number;
  readonly stepsTotal: number;
  readonly current: string | null;
  readonly contestsUpserted: number;
  readonly friendsProcessed: number;
  readonly warnings: readonly string[];
}

export function ContestFinderRefreshPanel({
  states
}: {
  readonly states: readonly ContestFinderRefreshState[];
}): React.JSX.Element | null {
  const visibleStates = states.filter((state) => state.status === RUN_STATUSES.Running);

  if (visibleStates.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 grid gap-3">
      {visibleStates.map((state) => {
        const title = state.current?.toLowerCase().includes("catalog")
          ? "Contest catalog refresh"
          : state.current === "Preparing refresh"
            ? "Preparing refresh"
            : "Friend participation refresh";

        return (
          <div key={state.provider} className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-100">{judgeLabel(state.provider)}</p>
                <p className="mt-1 truncate text-sm text-zinc-400">{title}</p>
              </div>
              <div className="shrink-0 text-right text-xs font-medium text-zinc-400">
                {state.stepsLeft} of {state.stepsTotal} steps left
              </div>
            </div>

            <Progress
              value={state.progress}
              indicatorClassName={judgeSyncProgressClassName(state.provider)}
            />
          </div>
        );
      })}
    </div>
  );
}
