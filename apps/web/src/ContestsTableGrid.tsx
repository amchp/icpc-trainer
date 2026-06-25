import {
  flexRender,
  type Table
} from "@tanstack/react-table";

import {
  contestsTableGridTemplateColumns,
  type SearchableContestRow
} from "./contestsTableModel.js";
import { VirtualGridTable } from "./VirtualGridTable.js";

export function ContestsTableGrid({
  table
}: {
  readonly table: Table<SearchableContestRow>;
}): React.JSX.Element {
  const visibleRows = table.getRowModel().rows;
  const headerGroups = table.getHeaderGroups().map((headerGroup) =>
    headerGroup.headers.map((header) =>
      header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext())
    )
  );

  return (
    <VirtualGridTable
      rows={visibleRows}
      estimateSize={68}
      getRowKey={(row) => row.id}
      gridTemplateColumns={contestsTableGridTemplateColumns}
      headerGroups={headerGroups}
      minWidthClassName="min-w-[780px]"
      renderCells={(row) =>
        row.getVisibleCells().map((cell) =>
          flexRender(cell.column.columnDef.cell, cell.getContext())
        )}
    />
  );
}
