import type { FindProblemRow } from "@icpc-trainer/api";
import { type ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Badge } from "./components/ui.js";
import { formatNumber, formatPercent } from "./i18n/format.js";
import { i18n } from "./i18n/i18n.js";
import type { AppLocale } from "@icpc-trainer/shared";

export type SearchableFindProblemRow = FindProblemRow & {
  readonly displayProblemName: string;
  readonly searchText: string;
};

export const findProblemsGridTemplateColumns =
  "3.25rem minmax(16rem, 40%) minmax(0, 26%) minmax(5rem, 9%) minmax(5rem, 9%) minmax(6rem, 10%)";

const problemLetterPattern = /^[A-Z][0-9]?\.\s+/;

const problemLetterFromJudgeId = (row: FindProblemRow): string | null => {
  const match = row.problemJudgeId.match(/([A-Z][0-9]?)$/);
  return match?.[1] ?? null;
};

const displayProblemName = (row: FindProblemRow): string => {
  if (problemLetterPattern.test(row.problemName)) {
    return row.problemName;
  }

  const letter = problemLetterFromJudgeId(row);
  return letter ? `${letter}. ${row.problemName}` : row.problemName;
};

const searchableText = (row: FindProblemRow): string =>
  displayProblemName(row).toLowerCase();

export const toSearchableFindProblemRow = (
  row: FindProblemRow
): SearchableFindProblemRow => ({
  ...row,
  displayProblemName: displayProblemName(row),
  searchText: searchableText(row)
});

export const createFindProblemColumns = (
  t: TFunction<"findProblems">,
  locale: AppLocale
): Array<ColumnDef<SearchableFindProblemRow>> => [
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
      </div>
    )
  },
  {
    accessorKey: "tags",
    header: t("columns.tags"),
    enableSorting: false,
    cell: ({ row }) => (
      row.original.tags.length === 0 ? (
        <span className="text-xs text-zinc-600">{t("columns.untagged")}</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {row.original.tags.map((tag) => (
            <Badge
              key={tag}
              className="border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[11px] text-zinc-300"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )
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
