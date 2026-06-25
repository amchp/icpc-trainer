import { Progress } from "./components/ui.js";
import { judgeLabel, judgeSyncProgressClassName } from "./judgeConfig.js";
import { useSync } from "./SyncContext.js";

type SyncSteps = ReturnType<typeof useSync>["steps"];
type SyncStepKey = keyof SyncSteps;

const activeStepConfigs: ReadonlyArray<{
  readonly key: SyncStepKey;
  readonly title: string;
  readonly unit: string;
}> = [
  {
    key: "regularCatalog",
    title: "Regular catalog sync",
    unit: "step"
  },
  {
    key: "contests",
    title: "Contest sync",
    unit: "contest"
  },
  {
    key: "submissions",
    title: "User submission sync",
    unit: "user"
  }
];

const leftLabel = (left: number, singular: string): string => {
  const unit = left === 1 ? singular : `${singular}s`;
  return `${left} ${unit} left`;
};

function SyncStepProgress({
  title,
  unit,
  step,
  indicatorClassName
}: {
  readonly title: string;
  readonly unit: string;
  readonly step: ReturnType<typeof useSync>["steps"]["submissions"];
  readonly indicatorClassName: string;
}): React.JSX.Element {
  const left = Math.max(step.total - step.processed, 0);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-100">{title}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-zinc-400">{leftLabel(left, unit)}</p>
        </div>
      </div>
      <div className="mt-3">
        <Progress value={step.progress} indicatorClassName={indicatorClassName} />
      </div>
    </div>
  );
}

export function SyncPanel(): React.JSX.Element {
  const sync = useSync();
  const runningProviders = sync.providers.filter((provider) => provider.status === "running");

  return (
    <div className="grid gap-3">
      {runningProviders.map((provider) => {
        const indicatorClassName = judgeSyncProgressClassName(provider.provider);
        const activeStepConfig = activeStepConfigs.find(
          (stepConfig) => provider.steps[stepConfig.key].status === "running"
        );
        const activeStep = activeStepConfig
          ? {
              ...activeStepConfig,
              step: provider.steps[activeStepConfig.key]
            }
          : null;

        return (
          <div key={provider.provider} className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-zinc-100">{judgeLabel(provider.provider)}</p>
              </div>
            </div>
            {activeStep ? (
              <SyncStepProgress
                title={activeStep.title}
                unit={activeStep.unit}
                step={activeStep.step}
                indicatorClassName={indicatorClassName}
              />
            ) : (
              <p className="text-sm text-zinc-400">{leftLabel(provider.stepsLeft, "sync")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
