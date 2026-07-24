import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "./lib.js";

interface VirtualRow {
  readonly index: number;
  readonly start: number;
}

export function VirtualGridTable<TRow>({
  rows,
  estimateSize,
  getRowKey,
  gridTemplateColumns,
  headerGroups,
  minWidthClassName,
  renderCells,
  showRowNumbers = true
}: {
  readonly rows: readonly TRow[];
  readonly estimateSize: number;
  readonly getRowKey: (row: TRow, index: number) => string;
  readonly gridTemplateColumns: string;
  readonly headerGroups: readonly (readonly ReactNode[])[];
  readonly minWidthClassName: string;
  readonly renderCells: (row: TRow, index: number) => readonly ReactNode[];
  readonly showRowNumbers?: boolean;
}): React.JSX.Element {
  const { t } = useTranslation("common");
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollMargin = tableContainerRef.current?.offsetTop ?? 0;
  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => estimateSize,
    overscan: 12,
    scrollMargin,
    initialRect: {
      width: 1000,
      height: 640
    }
  });
  const shouldVirtualizeRows =
    typeof navigator !== "undefined" && !navigator.userAgent.toLowerCase().includes("jsdom");
  const virtualRows: readonly VirtualRow[] = shouldVirtualizeRows
    ? rowVirtualizer.getVirtualItems()
    : rows.map((_, index) => ({
        index,
        start: index * estimateSize
      }));
  const virtualizedHeight = shouldVirtualizeRows
    ? rowVirtualizer.getTotalSize()
    : rows.length * estimateSize;

  return (
    <div ref={tableContainerRef} className="overflow-x-auto border-t border-zinc-800">
      <div role="table" className={cn(minWidthClassName, "text-sm")}>
        <div role="rowgroup" className="sticky top-0 z-10 bg-zinc-950">
          {headerGroups.map((headers, headerGroupIndex) => (
            <div
              key={headerGroupIndex}
              role="row"
              className="grid border-b border-zinc-800"
              style={{ gridTemplateColumns }}
            >
              {showRowNumbers ? (
                <div
                  role="columnheader"
                  aria-label={t("table.position")}
                  className="px-3 py-3 text-left align-middle text-xs font-medium text-zinc-500"
                >
                  #
                </div>
              ) : null}
              {headers.map((header, headerIndex) => (
                <div
                  key={headerIndex}
                  role="columnheader"
                  className="px-3 py-3 text-left align-middle text-xs font-medium text-zinc-500"
                >
                  {header}
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
            const row = rows[virtualRow.index];
            if (row === undefined) {
              return null;
            }

            return (
              <div
                key={getRowKey(row, virtualRow.index)}
                ref={(node) => {
                  if (node && shouldVirtualizeRows) {
                    rowVirtualizer.measureElement(node);
                  }
                }}
                data-index={virtualRow.index}
                role="row"
                className="absolute left-0 top-0 grid w-full border-b border-zinc-800 transition-colors hover:bg-zinc-900/60"
                style={{
                  gridTemplateColumns,
                  transform: `translateY(${virtualRow.start - scrollMargin}px)`
                }}
              >
                {showRowNumbers ? (
                  <div
                    role="cell"
                    aria-label={t("table.positionNumber", { number: virtualRow.index + 1 })}
                    className="px-3 py-3 align-middle font-mono text-xs tabular-nums text-zinc-500"
                  >
                    {virtualRow.index + 1}
                  </div>
                ) : null}
                {renderCells(row, virtualRow.index).map((cell, cellIndex) => (
                  <div
                    key={cellIndex}
                    role="cell"
                    className="px-3 py-3 align-middle text-zinc-300"
                  >
                    {cell}
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
