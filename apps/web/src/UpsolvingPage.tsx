import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Card, Skeleton } from "./components/ui.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";
import { trpc } from "./trpc.js";
import { UpsolvingProblemTable } from "./UpsolvingProblemTable.js";

export function UpsolvingPage(): React.JSX.Element {
  const { hasConnectedJudge, status } = useConnectedJudges();
  const query = useQuery({
    queryKey: ["upsolving", "overview"],
    queryFn: () => trpc.upsolving.overview.query(),
    enabled: status === "ready" && hasConnectedJudge
  });

  const overview = query.data;

  if (status !== "ready" || !hasConnectedJudge) {
    return <main className="min-h-screen bg-zinc-950" />;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upsolving</h1>
        </div>
        {query.isFetching ? (
          <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="size-4 animate-spin text-blue-300" aria-hidden="true" />
            Loading
          </span>
        ) : null}
      </section>

      {query.isLoading ? (
        <Card className="p-5">
          <Skeleton className="h-80" />
        </Card>
      ) : null}

      {query.isError ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 size-4 text-red-300" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-red-200">Unable to load upsolving.</p>
            <p className="mt-1 text-sm text-zinc-500">{query.error.message}</p>
          </div>
        </Card>
      ) : null}

      {overview ? (
        <UpsolvingProblemTable rows={overview.rows} />
      ) : null}
    </main>
  );
}
