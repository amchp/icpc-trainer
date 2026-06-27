import {
  flexRender,
  type Table
} from "@tanstack/react-table";

import {
  findProblemsGridTemplateColumns,
  type SearchableFindProblemRow
} from "./findProblemsTableModel.js";
import { VirtualGridTable } from "./VirtualGridTable.js";

export function FindProblemsTableGrid({
  table
}: {
  readonly table: Table<SearchableFindProblemRow>;
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
      estimateSize={74}
      getRowKey={(row) => row.id}
      gridTemplateColumns={findProblemsGridTemplateColumns}
      headerGroups={headerGroups}
      minWidthClassName="min-w-[940px]"
      renderCells={(row) =>
        row.getVisibleCells().map((cell) =>
          flexRender(cell.column.columnDef.cell, cell.getContext())
        )}
    />
  );
}
