"use client";

import { type ReactNode, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sortValue: (row: T) => string | number;
}

interface SortableDataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowHref?: (row: T) => string;
  rowKey?: (row: T, idx: number) => string | number;
  /** Extra content rendered after the last column cell (e.g. action buttons). */
  rowAction?: (row: T) => ReactNode;
}

export function SortableDataTable<T>({ columns, rows, rowHref, rowKey, rowAction }: SortableDataTableProps<T>) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  function handleSort(col: number) {
    if (sortCol === col) {
      setSortAsc((prev) => !prev);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  }

  const sorted = useMemo(() => {
    if (sortCol === null) return rows;
    const col = columns[sortCol];
    return [...rows].sort((a, b) => {
      const av = col.sortValue(a);
      const bv = col.sortValue(b);
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: "base" });
      return sortAsc ? cmp : -cmp;
    });
  }, [rows, columns, sortCol, sortAsc]);

  return (
    <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-zinc-800/50 bg-zinc-800/40">
          <tr>
            {columns.map((col, i) => (
              <th
                key={col.key}
                className="text-left text-[11px] font-medium text-zinc-500 px-3 py-1.5 cursor-pointer select-none transition-colors hover:text-zinc-300"
                onClick={() => handleSort(i)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  <span className="w-[10px] shrink-0">
                    {sortCol === i ? (
                      sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                    ) : (
                      <ArrowUpDown size={10} className="opacity-0" />
                    )}
                  </span>
                </span>
              </th>
            ))}
            {rowAction && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, rowIdx) => {
            const key = rowKey ? rowKey(row, rowIdx) : rowIdx;
            const cells = columns.map((col, colIdx) => (
              <td key={col.key} className="px-3 py-1.5">
                {colIdx === 0 ? (
                  <span className="text-xs font-medium text-zinc-100 group-hover:text-zinc-50">
                    {col.render(row)}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400">
                    {col.render(row)}
                  </span>
                )}
              </td>
            ));

            if (rowHref) {
              return (
                <tr key={key} className="group border-b border-zinc-800/30 last:border-0 transition-colors hover:bg-zinc-800/40">
                  {cells.map((cell, colIdx) => (
                    <td key={columns[colIdx].key} className="px-3 py-1.5">
                      <Link href={rowHref(row)} className="block">
                        {colIdx === 0 ? (
                          <span className="text-xs font-medium text-zinc-100 group-hover:text-zinc-50">
                            {columns[colIdx].render(row)}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">
                            {columns[colIdx].render(row)}
                          </span>
                        )}
                      </Link>
                    </td>
                  ))}
                  {rowAction && (
                    <td className="px-3 py-1.5">{rowAction(row)}</td>
                  )}
                </tr>
              );
            }

            return (
              <tr key={key} className="group border-b border-zinc-800/30 last:border-0 transition-colors hover:bg-zinc-800/40">
                {cells}
                {rowAction && (
                  <td className="px-3 py-1.5">{rowAction(row)}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
