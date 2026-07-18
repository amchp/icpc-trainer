import { useTranslation } from "react-i18next";

import { Progress } from "./components/ui.js";
import { judgeLabel, judgeSyncProgressClassName } from "./judgeConfig.js";
import { useSync } from "./SyncContext.js";

type SyncSteps = ReturnType<typeof useSync>["steps"];
type SyncStepKey = keyof SyncSteps;

const activeStepKeys: readonly SyncStepKey[] = ["regularCatalog", "contests", "submissions"];

export function SyncPanel(): React.JSX.Element {
  const { t } = useTranslation("shell");
  const sync = useSync();
  const runningProviders = sync.providers.filter((provider) => provider.status === "running");

  const stepCopy = (key: SyncStepKey, count: number): { title: string; unit: string } => ({
    title: t(`syncProgress.${key}`),
    unit: t(`syncProgress.${key === "regularCatalog" ? "step" : key === "contests" ? "contest" : "user"}`, { count })
  });

  return (
    <div className="grid gap-3">
      {runningProviders.map((provider) => {
        const indicatorClassName = judgeSyncProgressClassName(provider.provider);
        const activeKey = activeStepKeys.find((key) => provider.steps[key].status === "running");
        const activeStep = activeKey === undefined ? null : provider.steps[activeKey];
        const left = activeStep === null ? provider.stepsLeft : Math.max(activeStep.total - activeStep.processed, 0);
        const copy = activeKey === undefined
          ? { title: "", unit: t("syncProgress.sync", { count: left }) }
          : stepCopy(activeKey, left);

        return (
          <div key={provider.provider} className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-zinc-100">{judgeLabel(provider.provider)}</p>
            </div>
            {activeStep !== null ? (
              <div>
                <div className="flex items-end justify-between gap-4">
                  <p className="truncate text-sm font-medium text-zinc-100">{copy.title}</p>
                  <p className="shrink-0 text-right text-xs font-medium text-zinc-400">{t("syncProgress.left", { count: left, unit: copy.unit })}</p>
                </div>
                <div className="mt-3"><Progress value={activeStep.progress} indicatorClassName={indicatorClassName} /></div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">{t("syncProgress.left", { count: left, unit: copy.unit })}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
