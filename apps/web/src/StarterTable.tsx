import { STARTER_STACK_STATUSES } from "@icpc-trainer/shared";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from "@tanstack/react-table";
import type React from "react";

import {
  Badge,
  Card,
  Table,
  TableBody,
  TableCell,
  TableCount,
  TableHead,
  TableHeader,
  TableRow
} from "./components/ui.js";

interface StackRow {
  readonly layer: string;
  readonly role: string;
  readonly status: STARTER_STACK_STATUSES;
}

const rows: readonly StackRow[] = [
  { layer: "Web", role: "React, Router, Query, Table, Tailwind", status: STARTER_STACK_STATUSES.Wired },
  { layer: "API", role: "tRPC over typed HTTP", status: STARTER_STACK_STATUSES.Wired },
  { layer: "Data", role: "Effect service, Drizzle, SQLite", status: STARTER_STACK_STATUSES.Local }
];

const columns: Array<ColumnDef<StackRow>> = [
  {
    accessorKey: "layer",
    header: "Layer"
  },
  {
    accessorKey: "role",
    header: "Role"
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => <Badge>{getValue<string>()}</Badge>
  }
];

export function StarterTable(): React.JSX.Element {
  const table = useReactTable({
    data: [...rows],
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-100">Starter wiring</h2>
          <p className="mt-1 text-sm text-zinc-500">Static rows proving TanStack Table setup.</p>
        </div>
        <TableCount count={table.getRowModel().rows.length} itemName="row" />
      </div>
      <Table className="border-t border-zinc-800">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
