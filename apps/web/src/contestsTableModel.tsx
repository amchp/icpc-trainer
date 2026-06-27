import type { UpsolvingContestRow } from "@icpc-trainer/api";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { JudgeDisplay, judgeSearchText } from "./JudgeDisplay.js";

export type SearchableContestRow = UpsolvingContestRow & {
  readonly searchText: string;
};

export const contestsTableGridTemplateColumns =
  "3.25rem minmax(0, 1fr) minmax(7rem, 8rem) minmax(7rem, 9rem)";

const searchableText = (contest: UpsolvingContestRow): string =>
  [
    contest.name,
    contest.judgeId,
    judgeSearchText(contest.judge)
  ].join(" ").toLowerCase();

export const toSearchableContestRow = (contest: UpsolvingContestRow): SearchableContestRow => ({
  ...contest,
  searchText: searchableText(contest)
});

export const createContestColumns = (): Array<ColumnDef<SearchableContestRow>> => [
  {
    accessorKey: "name",
    header: "Contest",
    cell: ({ row }) => (
      <div className="min-w-0 whitespace-normal">
        <a
          href={row.original.link}
          target="_blank"
          rel="noreferrer"
          className="whitespace-normal break-words font-medium text-blue-300 hover:text-blue-200 hover:underline"
        >
          {row.original.name}
        </a>
      </div>
    )
  },
  {
    accessorKey: "judge",
    header: "Judge",
    cell: ({ row }) => (
      <JudgeDisplay judge={row.original.judge} />
    )
  },
  {
    id: "missingCount",
    accessorFn: (row) => row.problemCount - row.solvedCount,
    header: ({ column }) => (
      <SortableHeader
        label="Solved"
        direction={column.getIsSorted()}
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.solvedCount} / {row.original.problemCount}
      </span>
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
