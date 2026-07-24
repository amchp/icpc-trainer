import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, Skeleton } from "./components/ui.js";
import { localizedErrorMessage } from "./i18n/localizedMessage.js";
import { ContestsTable } from "./ContestsTable.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";
import { queryKeys } from "./queryKeys.js";
import { SyncDataPrompt } from "./SyncDataPrompt.js";
import { ContestRouteTabs } from "./SectionRouteTabs.js";
import { trpc } from "./trpc.js";

export function ContestsPage(): React.JSX.Element {
  const { t } = useTranslation(["contests", "findProblems"]);
  const { hasConnectedJudge, status } = useConnectedJudges();
  const query = useQuery({
    queryKey: queryKeys.upsolvingOverview,
    queryFn: () => trpc.upsolving.overview.query(),
    enabled: status === "ready" && hasConnectedJudge
  });
  const dataStatusQuery = useQuery({
    queryKey: queryKeys.accountDataStatus,
    queryFn: () => trpc.account.dataStatus.query(),
    enabled: status === "ready" && hasConnectedJudge
  });
  const noSyncedData = dataStatusQuery.data?.hasSyncedContests === false;

  if (status !== "ready" || !hasConnectedJudge) {
    return <main className="min-h-screen bg-zinc-950" />;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <ContestRouteTabs />
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("contests:title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("contests:subtitle")}</p>
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
            <p className="text-sm font-medium text-red-200">{t("contests:loadError")}</p>
            <p className="mt-1 text-sm text-zinc-500">{localizedErrorMessage(query.error)}</p>
          </div>
        </Card>
      ) : null}

      {noSyncedData ? (
        <SyncDataPrompt />
      ) : query.data ? (
        <ContestsTable contests={query.data.contests} />
      ) : null}
    </main>
  );
}
