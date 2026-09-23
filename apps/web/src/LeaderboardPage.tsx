import type { LeaderboardRow, LeaderboardScope } from "@icpc-trainer/api";
import { JUDGES } from "@icpc-trainer/shared";
import { useProgressiveQuery } from "./useProgressiveQuery.js";
import { TableLoadState } from "./TableLoadState.js";
import type { OnChangeFn } from "@tanstack/react-table";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Card, FieldLabel, Input, Label, Select, Skeleton } from "./components/ui.js";
import { formatDateTime, formatNumber } from "./i18n/format.js";
import { useLocale } from "./i18n/LocaleProvider.js";
import { judgeDisplayLabels } from "./JudgeDisplay.js";
import { LeaderboardClassDialog } from "./LeaderboardClassDialog.js";
import { localDateRangeToIso, type LocalDateRange } from "./leaderboardDates.js";
import { localizedErrorMessage } from "./i18n/localizedMessage.js";
import { queryKeys } from "./queryKeys.js";
import { trpc } from "./trpc.js";
import { VirtualGridTable } from "./VirtualGridTable.js";
import type { LeaderboardFilterState } from "./urlTableFilters.js";

const scopes: readonly LeaderboardScope[] = ["all", "team", "friends", "class"];

export function LeaderboardPage({
  filters,
  onFiltersChange
}: {
  readonly filters?: LeaderboardFilterState;
  readonly onFiltersChange?: OnChangeFn<LeaderboardFilterState>;
} = {}): React.JSX.Element {
  const { t } = useTranslation("leaderboard");
  const { locale } = useLocale();
  const [localFilters, setLocalFilters] = useState<LeaderboardFilterState>({
    scope: "all",
    judge: "all",
    startDate: "",
    endDate: ""
  });
  const activeFilters = filters ?? localFilters;
  const setFilters = onFiltersChange ?? setLocalFilters;
  const { scope, judge, startDate, endDate } = activeFilters;
  const [appliedRange, setAppliedRange] = useState<LocalDateRange | undefined>();
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const dateResult = useMemo(
    () => localDateRangeToIso(startDate, endDate),
    [endDate, startDate]
  );

  useEffect(() => {
    if (dateResult.status === "valid") {
      setAppliedRange(dateResult.range);
    }
    if (dateResult.status === "empty") {
      setAppliedRange(undefined);
    }
  }, [dateResult]);

  const queryFilters = {
    scope,
    judge: judge === "all" ? undefined : judge,
    startAt: appliedRange?.startAt,
    endAtExclusive: appliedRange?.endAtExclusive
  };
  const query = useProgressiveQuery({
    queryKey: queryKeys.leaderboardList(queryFilters),
    queryFn: (input) => trpc.leaderboard.list.query({ ...queryFilters, ...input })
  });
  const firstPage = query.data;
  const rows = query.data?.rows ?? [];
  const totalRows = query.data?.totalRows ?? 0;

  const guidance = dateResult.status === "incomplete"
    ? t("dates.incomplete")
    : dateResult.status === "reversed"
      ? t("dates.reversed")
      : dateResult.status === "invalid"
        ? t("dates.invalid")
        : undefined;
  const emptyMessage = appliedRange !== undefined
    ? t("empty.period")
    : scope === "all"
      ? t("empty.all")
      : t("empty.scope");

  const renderCells = (row: LeaderboardRow): readonly React.ReactNode[] => [
    <span className="font-mono text-zinc-400">{formatNumber(row.rank, locale)}</span>,
    <span className="font-mono font-medium text-zinc-100">{row.username}</span>,
    judgeDisplayLabels[row.judge],
    <span className="font-mono font-semibold tabular-nums text-blue-300">
      {formatNumber(row.solvedCount, locale)}
    </span>
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("subtitle")}</p>
        </div>
        {firstPage?.canManageClass ? (
          <Button type="button" variant="secondary" onClick={() => setClassDialogOpen(true)}>
            {t("class.manage")}
          </Button>
        ) : null}
      </section>

      <Card className="mb-5 p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_12rem_1fr]">
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium uppercase text-zinc-500">{t("populationLabel")}</legend>
            <div className="flex flex-wrap gap-2">
              {scopes.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={scope === value ? "default" : "secondary"}
                  aria-pressed={scope === value}
                  onClick={() => setFilters((current) => ({
                    ...current,
                    scope: value
                  }))}
                >
                  {t(`scopes.${value}`)}
                </Button>
              ))}
            </div>
          </fieldset>
          <Label>
            <FieldLabel>{t("judgeLabel")}</FieldLabel>
            <Select
              value={judge}
              onChange={(event) => setFilters((current) => ({
                ...current,
                judge: event.target.value as JUDGES | "all"
              }))}
            >
              <option value="all">{t("judges.all")}</option>
              <option value={JUDGES.Codeforces}>{judgeDisplayLabels.codeforces}</option>
              <option value={JUDGES.Qoj}>{judgeDisplayLabels.qoj}</option>
            </Select>
          </Label>
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium uppercase text-zinc-500">{t("dates.label")}</legend>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Label>
                <span className="sr-only">{t("dates.from")}</span>
                <Input
                  type="date"
                  aria-label={t("dates.from")}
                  value={startDate}
                  onChange={(event) => setFilters((current) => ({
                    ...current,
                    startDate: event.target.value
                  }))}
                />
              </Label>
              <Label>
                <span className="sr-only">{t("dates.through")}</span>
                <Input
                  type="date"
                  aria-label={t("dates.through")}
                  value={endDate}
                  onChange={(event) => setFilters((current) => ({
                    ...current,
                    endDate: event.target.value
                  }))}
                />
              </Label>
              <Button
                type="button"
                variant="ghost"
                disabled={startDate === "" && endDate === ""}
                onClick={() => setFilters((current) => ({
                  ...current,
                  startDate: "",
                  endDate: ""
                }))}
              >
                {t("dates.clear")}
              </Button>
            </div>
            {guidance ? <p className="mt-2 text-xs text-amber-200" role="status">{guidance}</p> : null}
          </fieldset>
        </div>
      </Card>

      {query.isLoading ? (
        <Card className="p-5"><Skeleton className="h-80" /></Card>
      ) : null}

      {query.isError && rows.length === 0 ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 size-4 text-red-300" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-red-200">{t("loadError")}</p>
            <p className="mt-1 text-sm text-zinc-500">{localizedErrorMessage(query.error)}</p>
            <Button className="mt-3" type="button" variant="secondary" onClick={() => void query.refetch()}>
              {t("retry")}
            </Button>
          </div>
        </Card>
      ) : null}

      {!query.isError && !query.isPartial && rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-zinc-500">{emptyMessage}</Card>
      ) : null}

      {rows.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-1 px-4 py-3 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {t("resultCount", {
                count: totalRows,
                value: formatNumber(totalRows, locale)
              })}
              {firstPage?.generatedAt ? (
                <> · {t("updatedAt", { value: formatDateTime(firstPage.generatedAt, locale) })}</>
              ) : null}
            </span>
            {query.isFetching ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> {t("updating")}
              </span>
            ) : null}
          </div>
          <VirtualGridTable
            rows={rows}
            estimateSize={48}
            getRowKey={(row) => `${row.judge}:${row.userId}`}
            gridTemplateColumns="6rem minmax(12rem,1fr) 10rem 8rem"
            headerGroups={[[t("columns.rank"), t("columns.user"), t("columns.judge"), t("columns.solved")]]}
            minWidthClassName="min-w-[620px]"
            renderCells={renderCells}
            showRowNumbers={false}
          />

        </Card>
      ) : null}

      {!(query.isError && rows.length === 0) ? <TableLoadState query={query} /> : null}

      <LeaderboardClassDialog open={classDialogOpen} onClose={() => setClassDialogOpen(false)} />
    </main>
  );
}
