import type { FriendSubmissionSyncStatus } from "@icpc-trainer/api";
import { RUN_STATUSES, type JudgeProvider } from "@icpc-trainer/shared";

import { Progress } from "./components/ui.js";
import { judgeLabel, judgeSyncProgressClassName } from "./judgeConfig.js";

export interface FriendSubmissionSyncState {
  readonly provider: JudgeProvider;
  readonly status: FriendSubmissionSyncStatus;
  readonly progress: number;
  readonly stepsLeft: number;
  readonly stepsTotal: number;
  readonly current: string | null;
  readonly friendsProcessed: number;
  readonly warnings: readonly string[];
}

export function FriendSubmissionSyncPanel({
  states
}: {
  readonly states: readonly FriendSubmissionSyncState[];
}): React.JSX.Element | null {
  const visibleStates = states.filter((state) => state.status === RUN_STATUSES.Running);

  if (visibleStates.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 grid gap-3">
      {visibleStates.map((state) => {
        return (
          <div key={state.provider} className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-100">{judgeLabel(state.provider)}</p>
                <p className="mt-1 text-sm font-medium text-zinc-200">Friend submission sync</p>
                {state.current !== null ? (
                  <p className="mt-1 truncate text-sm text-zinc-400">{state.current}</p>
                ) : null}
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
