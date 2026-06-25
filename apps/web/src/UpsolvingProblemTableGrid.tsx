import {
  flexRender,
  type Table
} from "@tanstack/react-table";

import {
  type SearchableUpsolvingProblemRow,
  tableGridTemplateColumns
} from "./upsolvingProblemTableModel.js";
import { VirtualGridTable } from "./VirtualGridTable.js";

export function UpsolvingProblemTableGrid({
  table
}: {
  readonly table: Table<SearchableUpsolvingProblemRow>;
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
      estimateSize={64}
      getRowKey={(row) => row.id}
      gridTemplateColumns={tableGridTemplateColumns}
      headerGroups={headerGroups}
      minWidthClassName="min-w-[680px]"
      renderCells={(row) =>
        row.getVisibleCells().map((cell) =>
          flexRender(cell.column.columnDef.cell, cell.getContext())
        )}
    />
  );
}
