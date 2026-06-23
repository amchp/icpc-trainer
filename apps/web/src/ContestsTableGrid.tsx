import {
  flexRender,
  type Table
} from "@tanstack/react-table";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

import {
  contestsTableGridTemplateColumns,
  type SearchableContestRow
} from "./contestsTableModel.js";

export function ContestsTableGrid({
  table
}: {
  readonly table: Table<SearchableContestRow>;
}): React.JSX.Element {
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const visibleRows = table.getRowModel().rows;
  const scrollMargin = tableContainerRef.current?.offsetTop ?? 0;
  const rowVirtualizer = useWindowVirtualizer({
    count: visibleRows.length,
    estimateSize: () => 68,
    overscan: 12,
    scrollMargin,
    initialRect: {
      width: 1000,
      height: 640
    }
  });
  const shouldVirtualizeRows =
    typeof navigator !== "undefined" && !navigator.userAgent.toLowerCase().includes("jsdom");
  const virtualRows = shouldVirtualizeRows
    ? rowVirtualizer.getVirtualItems()
    : visibleRows.map((_, index) => ({
        index,
        start: index * 68
      }));
  const virtualizedHeight = shouldVirtualizeRows
    ? rowVirtualizer.getTotalSize()
    : visibleRows.length * 68;

  return (
    <div ref={tableContainerRef} className="overflow-x-auto border-t border-zinc-800">
      <div role="table" className="min-w-[780px] text-sm">
        <div role="rowgroup" className="sticky top-0 z-10 bg-zinc-950">
          {table.getHeaderGroups().map((headerGroup) => (
            <div
              key={headerGroup.id}
              role="row"
              className="grid border-b border-zinc-800"
              style={{ gridTemplateColumns: contestsTableGridTemplateColumns }}
            >
              <div
                role="columnheader"
                aria-label="Table position"
                className="px-3 py-3 text-left align-middle text-xs font-medium text-zinc-500"
              >
                #
              </div>
              {headerGroup.headers.map((header) => (
                <div
                  key={header.id}
                  role="columnheader"
                  className="px-3 py-3 text-left align-middle text-xs font-medium text-zinc-500"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div
          role="rowgroup"
          className="relative"
          style={{ height: `${virtualizedHeight}px` }}
        >
          {virtualRows.map((virtualRow) => {
            const row = visibleRows[virtualRow.index];
            if (!row) {
              return null;
            }

            return (
              <div
                key={row.id}
                ref={(node) => {
                  if (node && shouldVirtualizeRows) {
                    rowVirtualizer.measureElement(node);
                  }
                }}
                data-index={virtualRow.index}
                role="row"
                className="absolute left-0 top-0 grid w-full border-b border-zinc-800 transition-colors hover:bg-zinc-900/60"
                style={{
                  gridTemplateColumns: contestsTableGridTemplateColumns,
                  transform: `translateY(${virtualRow.start - scrollMargin}px)`
                }}
              >
                <div
                  role="cell"
                  aria-label={`Table position ${virtualRow.index + 1}`}
                  className="px-3 py-3 align-middle font-mono text-xs tabular-nums text-zinc-500"
                >
                  {virtualRow.index + 1}
                </div>
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    role="cell"
                    className="px-3 py-3 align-middle text-zinc-300"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
