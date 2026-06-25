import type { FindProblemRow } from "@icpc-trainer/api";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Badge } from "./components/ui.js";

export type SearchableFindProblemRow = FindProblemRow & {
  readonly displayProblemName: string;
  readonly searchText: string;
};

export const findProblemsGridTemplateColumns =
  "3.25rem minmax(16rem, 45%) minmax(0, 28%) minmax(5rem, 10%) minmax(5rem, 10%)";

const problemLetterPattern = /^[A-Z][0-9]?\.\s+/;

const formatPercentage = (value: number): string => `${value}%`;

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

export const createFindProblemColumns = (): Array<ColumnDef<SearchableFindProblemRow>> => [
  {
    accessorKey: "displayProblemName",
    header: "Problem",
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
    header: "Tags",
    enableSorting: false,
    cell: ({ row }) => (
      row.original.tags.length === 0 ? (
        <span className="text-xs text-zinc-600">Untagged</span>
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
        label="Rating"
        direction={column.getIsSorted()}
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => <span className="tabular-nums">{row.original.rating}</span>
  },
  {
    accessorKey: "solvePercentage",
    header: ({ column }) => (
      <SortableHeader
        label="Solve %"
        direction={column.getIsSorted()}
        onClick={() => column.toggleSorting(column.getIsSorted() !== "desc")}
      />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{formatPercentage(row.original.solvePercentage)}</span>
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
    direction === "asc" ? "sorted ascending" : direction === "desc" ? "sorted descending" : "not sorted";

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
