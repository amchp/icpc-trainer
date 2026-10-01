import { useProgressiveQuery } from "./useProgressiveQuery.js";
import { ConnectJudgePrompt } from "./ConnectJudgePrompt.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { judgeFromProvider } from "@icpc-trainer/shared";
import type { OnChangeFn } from "@tanstack/react-table";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, Skeleton } from "./components/ui.js";
import { localizedErrorMessage } from "./i18n/localizedMessage.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";
import { queryKeys } from "./queryKeys.js";
import { SyncDataPrompt } from "./SyncDataPrompt.js";
import { trpc } from "./trpc.js";
import { useToaster } from "./Toaster.js";
import { UpsolvingProblemTable } from "./UpsolvingProblemTable.js";
import type { UpsolvingFilterState } from "./urlTableFilters.js";

export function UpsolvingPage({
  filters,
  onFiltersChange
}: {
  readonly filters?: UpsolvingFilterState;
  readonly onFiltersChange?: OnChangeFn<UpsolvingFilterState>;
} = {}): React.JSX.Element {
  const { t } = useTranslation(["upsolving", "findProblems"]);
  const queryClient = useQueryClient();
  const toaster = useToaster();
  const setProblemStatus = useMutation({
    mutationFn: (input: Parameters<typeof trpc.upsolving.setProblemStatus.mutate>[0]) =>
      trpc.upsolving.setProblemStatus.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.upsolvingOverview }),
    onError: (error) => toaster.error({
      title: t("upsolving:saveStatusError"),
      description: localizedErrorMessage(error)
    })
  });
  const { hasConnectedJudge, status } = useConnectedJudges();
  const query = useProgressiveQuery({
    queryKey: queryKeys.upsolvingOverview,
    queryFn: (input) => trpc.upsolving.overview.query(input)
  });
  const dataStatusQuery = useQuery({
    queryKey: queryKeys.accountDataStatus,
    queryFn: () => trpc.account.dataStatus.query()
  });

  const overview = query.data;
  const noSyncedData = dataStatusQuery.data?.hasSyncedContests === false;

  if (status === "ready" && !hasConnectedJudge) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("upsolving:title")}</h1>
        <ConnectJudgePrompt feature="upsolving" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("upsolving:title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {t("upsolving:subtitle")}
          </p>
        </div>
        {query.isFetching ? (
          <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="size-4 animate-spin text-blue-300" aria-hidden="true" />
            {t("findProblems:loading")}
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
            <p className="text-sm font-medium text-red-200">{t("upsolving:loadError")}</p>
            <p className="mt-1 text-sm text-zinc-500">{localizedErrorMessage(query.error)}</p>
          </div>
        </Card>
      ) : null}

      {noSyncedData ? (
        <SyncDataPrompt />
      ) : overview ? (
        <UpsolvingProblemTable
          loadingState={query}
          rows={overview.rows}
          filters={filters}
          onFiltersChange={onFiltersChange}
          saving={setProblemStatus.isPending}
          onStatusChange={(row, status) => setProblemStatus.mutate({
            judge: judgeFromProvider(row.judge),
            problemJudgeId: row.problemJudgeId,
            status
          })}
        />
      ) : null}
    </main>
  );
}
