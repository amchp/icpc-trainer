import { useProgressiveQuery } from "./useProgressiveQuery.js";
import type { OnChangeFn } from "@tanstack/react-table";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button, Card, Skeleton } from "./components/ui.js";
import { localizedErrorMessage } from "./i18n/localizedMessage.js";
import { FindProblemsTable } from "./FindProblemsTable.js";
import { queryKeys } from "./queryKeys.js";
import { trpc } from "./trpc.js";
import type { FindProblemsFilterState } from "./urlTableFilters.js";

export function FindProblemsPage({
  filters,
  onFiltersChange
}: {
  readonly filters?: FindProblemsFilterState;
  readonly onFiltersChange?: OnChangeFn<FindProblemsFilterState>;
} = {}): React.JSX.Element {
  const { t } = useTranslation("findProblems");
  const query = useProgressiveQuery({
    queryKey: queryKeys.findProblemsOverview,
    queryFn: (input) => trpc.findProblems.overview.query(input)
  });
  const overview = query.data;
  const partial = query.isPartial;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("subtitle")}</p>
        </div>
        {query.isFetching ? (
          <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="size-4 animate-spin text-blue-300" aria-hidden="true" />
            {t("loading")}
          </span>
        ) : null}
      </section>

      {overview === undefined && !query.isError ? (
        <Card className="p-5">
          <Skeleton className="h-80" />
        </Card>
      ) : null}

      {query.isError ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 size-4 text-red-300" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-red-200">{t("loadError")}</p>
            <p className="mt-1 text-sm text-zinc-500">{localizedErrorMessage(query.error)}</p>
            <Button className="mt-3" variant="secondary" onClick={() => void query.refetch()}>{t("retry")}</Button>
          </div>
        </Card>
      ) : null}

      {overview && partial ? (
        <p role="status" className="mb-3 text-sm text-zinc-400">
          {t(query.isError ? "previewIncomplete" : "loadingRemaining")}
        </p>
      ) : null}

      {overview ? (
        <FindProblemsTable
          overview={overview}
          partial={partial}
          loadingMore={partial && query.isFetching}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ) : null}
    </main>
  );
}
