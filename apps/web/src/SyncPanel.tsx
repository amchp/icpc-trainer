import { Card, Progress, Separator } from "./components/ui.js";
import { useSync } from "./SyncContext.js";

const eventLabel = (event: ReturnType<typeof useSync>["latestEvent"], status: ReturnType<typeof useSync>["status"]): string => {
  if (event?.type === "submissions.syncing" || event?.type === "submissions.userSyncing") {
    return "Syncing submissions";
  }

  if (event?.type === "contests.contestSyncing") {
    return `Syncing contest ${event.contestJudgeId}`;
  }

  if (event?.type === "contests.syncing") {
    return "Syncing contests";
  }

  if (event?.type === "completed") {
    return event.summary.errors > 0 ? "Completed with errors" : "Completed";
  }

  if (event?.type === "error") {
    return event.message;
  }

  return status === "running" ? "Syncing" : "Ready to sync";
};

const stepStatusLabel = (status: ReturnType<typeof useSync>["steps"]["submissions"]["status"]): string => {
  if (status === "running") {
    return "Running";
  }
  if (status === "completed") {
    return "Done";
  }
  if (status === "error") {
    return "Needs attention";
  }
  return "Pending";
};

function SyncStepRow({
  number,
  title,
  unit,
  step
}: {
  readonly number: string;
  readonly title: string;
  readonly unit: string;
  readonly step: ReturnType<typeof useSync>["steps"]["submissions"];
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-zinc-500">{number}</p>
          <p className="text-sm font-medium text-zinc-100">{title}</p>
          <p className="mt-1 truncate text-xs text-zinc-500">
            {step.current ? `Current: ${step.current}` : stepStatusLabel(step.status)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-medium text-zinc-200">
            {step.processed} / {step.total}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{unit}</p>
        </div>
      </div>
      <div className="mt-3">
        <Progress value={step.progress} />
      </div>
    </div>
  );
}

export function SyncPanel(): React.JSX.Element {
  const sync = useSync();

  return (
    <Card className="max-w-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-100">Judge sync</h1>
          <p className="mt-1 text-sm text-zinc-400">{eventLabel(sync.latestEvent, sync.status)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-zinc-100">
            {sync.status === "running" ? "Running" : stepStatusLabel(sync.steps.contests.status)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{sync.progress}%</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <SyncStepRow number="1/2" title="User submissions" unit="users" step={sync.steps.submissions} />
        <SyncStepRow number="2/2" title="Contest sync" unit="contests" step={sync.steps.contests} />
      </div>

      {sync.summary ? (
        <>
          <Separator className="my-5" />
          <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-zinc-500">Submissions</p>
              <p className="mt-1">{sync.summary.submissionsInserted} inserted</p>
              <p>{sync.summary.submissionsUpdated} updated</p>
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-500">Contests</p>
              <p className="mt-1">{sync.summary.contestsSynced} synced</p>
              <p>{sync.summary.usersProcessed} users processed</p>
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-500">Result</p>
              <p className="mt-1">{sync.summary.errors} errors</p>
              <p>{sync.summary.submissionsSkipped} skipped</p>
            </div>
          </div>
        </>
      ) : null}
    </Card>
  );
}
