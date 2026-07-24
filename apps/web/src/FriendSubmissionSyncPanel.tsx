import type { FriendSubmissionSyncStatus } from "@icpc-trainer/api";
import { RUN_STATUSES, type JudgeProvider, type LocalizedMessageReference } from "@icpc-trainer/shared";
import { useTranslation } from "react-i18next";

import { Progress } from "./components/ui.js";
import { judgeLabel, judgeSyncProgressClassName } from "./judgeConfig.js";
import { localizedMessageText } from "./i18n/localizedMessage.js";

export interface FriendSubmissionSyncState {
  readonly provider: JudgeProvider;
  readonly status: FriendSubmissionSyncStatus;
  readonly progress: number;
  readonly stepsLeft: number;
  readonly stepsTotal: number;
  readonly current: LocalizedMessageReference | null;
  readonly friendsProcessed: number;
  readonly warnings: readonly LocalizedMessageReference[];
}

export function FriendSubmissionSyncPanel({
  states
}: {
  readonly states: readonly FriendSubmissionSyncState[];
}): React.JSX.Element | null {
  const { t } = useTranslation("contestFinder");
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
                <p className="mt-1 text-sm font-medium text-zinc-200">{t("syncTitle")}</p>
                {state.current !== null ? (
                  <p className="mt-1 truncate text-sm text-zinc-400">{localizedMessageText(state.current)}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right text-xs font-medium text-zinc-400">
                {t("stepsLeft", { left: state.stepsLeft, total: state.stepsTotal })}
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
