import type { UpsolvingProblemRow, UpsolvingProblemStatus } from "@icpc-trainer/api";
import type { AppLocale } from "@icpc-trainer/shared";
import { type ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { JudgeDisplay, judgeSearchText } from "./JudgeDisplay.js";
import { formatNumber, formatPercent } from "./i18n/format.js";
import { cn } from "./lib.js";
import { i18n } from "./i18n/i18n.js";

export type UpsolvingStatusFilter = "all" | Exclude<UpsolvingProblemStatus, "new">;

export type SearchableUpsolvingProblemRow = UpsolvingProblemRow & {
  readonly displayProblemName: string;
  readonly searchText: string;
};

export const tableGridTemplateColumns =
  "3.25rem minmax(16rem, 44%) minmax(6rem, 10%) minmax(6rem, 11%) minmax(5rem, 9%) minmax(5rem, 9%) minmax(6rem, 10%)";

const statusTextClassNames: Record<UpsolvingProblemStatus, string> = {
  new: "text-blue-300",
  upsolved: "text-violet-300",
  attempted: "text-amber-300",
  solved: "text-emerald-300"
};

const problemLetterPattern = /^[A-Z][0-9]?\.\s+/;

const problemLetterFromJudgeId = (row: UpsolvingProblemRow): string | null => {
  const match = row.problemJudgeId.match(/([A-Z][0-9]?)$/);
  return match?.[1] ?? null;
};

const displayProblemName = (row: UpsolvingProblemRow): string => {
  if (problemLetterPattern.test(row.problemName)) {
    return row.problemName;
  }

  const letter = problemLetterFromJudgeId(row);
  return letter ? `${letter}. ${row.problemName}` : row.problemName;
};

const searchableText = (row: UpsolvingProblemRow): string =>
  [
    displayProblemName(row),
    row.problemJudgeId,
    row.contestName,
    judgeSearchText(row.judge)
  ].join(" ").toLowerCase();

export const toSearchableUpsolvingProblemRow = (
  row: UpsolvingProblemRow
): SearchableUpsolvingProblemRow => ({
  ...row,
  displayProblemName: displayProblemName(row),
  searchText: searchableText(row)
});

export const statusCountsFor = (
  rows: readonly SearchableUpsolvingProblemRow[]
): Record<UpsolvingStatusFilter, number> => {
  const counts: Record<UpsolvingStatusFilter, number> = {
    all: rows.length,
    upsolved: 0,
    attempted: 0,
    solved: 0
  };

  for (const row of rows) {
    if (row.status !== "new") {
      counts[row.status] += 1;
    }
  }

  return counts;
};

export const createUpsolvingProblemColumns = (
  t: TFunction<"upsolving">,
  locale: AppLocale
): Array<ColumnDef<SearchableUpsolvingProblemRow>> => [
  {
    accessorKey: "displayProblemName",
    header: t("columns.problem"),
    cell: ({ row }) => (
      <div className="min-w-0 whitespace-normal">
        <a
          className="whitespace-normal break-words font-medium text-blue-300 hover:text-blue-200 hover:underline"
          href={row.original.problemLink}
          target="_blank"
          rel="noreferrer"
        >
          {row.original.displayProblemName}
        </a>
        <p className="mt-1 whitespace-normal break-words text-xs text-zinc-500">
          {row.original.contestName}
        </p>
      </div>
    )
  },
  {
    accessorKey: "judge",
    header: t("columns.judge"),
    cell: ({ row }) => (
      <JudgeDisplay judge={row.original.judge} />
    )
  },
  {
    accessorKey: "status",
    header: t("columns.status"),
    cell: ({ row }) => (
      <span className={cn("text-xs font-medium", statusTextClassNames[row.original.status])}>
        {row.original.status === "attempted" ? t("status.attempted") : row.original.status === "solved" ? t("status.solved") : t("status.new")}
      </span>
    )
  },
  {
    accessorKey: "rating",
    header: ({ column }) => (
      <SortableHeader
        label={t("columns.rating")}
        direction={column.getIsSorted()}
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.rating, locale)}</span>
  },
  {
    accessorKey: "solvePercentage",
    header: ({ column }) => (
      <SortableHeader
        label={t("columns.solve")}
        direction={column.getIsSorted()}
        onClick={() => column.toggleSorting(column.getIsSorted() !== "desc")}
      />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{formatPercent(row.original.solvePercentage, locale)}</span>
    )
  },
  {
    accessorKey: "friendSolvedCount",
    header: ({ column }) => (
      <SortableHeader
        label={t("columns.friends")}
        direction={column.getIsSorted()}
        onClick={() => column.toggleSorting(column.getIsSorted() !== "desc")}
      />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.friendSolvedCount, locale)}</span>
    )
  }
];

function SortableHeader({
  label,
  direction,
  onClick
}: {
  readonly label: string;
  readonly direction: false | "asc" | "desc";
  readonly onClick: () => void;
}): React.JSX.Element {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;
  const directionLabel =
    direction === "asc" ? i18n.t("table.ascending") : direction === "desc" ? i18n.t("table.descending") : i18n.t("table.unsorted");

  return (
    <button
      type="button"
      aria-label={`${label}, ${directionLabel}`}
      className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-zinc-500 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      onClick={onClick}
    >
      {label}
      <Icon
        className={direction ? "size-3.5 text-blue-300" : "size-3.5"}
        aria-hidden="true"
      />
    </button>
  );
}
