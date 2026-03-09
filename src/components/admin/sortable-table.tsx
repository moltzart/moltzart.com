"use client";

import { type ReactNode, Children, isValidElement, useState, useMemo } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

type PropsWithChildren = { children?: ReactNode };

/** Recursively extract plain text from a React node tree. */
function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) return extractText((node.props as PropsWithChildren).children);
  return "";
}

/** Pull an array of direct children from a React element. */
function childArray(node: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  Children.forEach(node, (child) => out.push(child));
  return out;
}

/** Parse React children from ReactMarkdown's table into structured header/row data. */
function parseTableChildren(children: ReactNode): { headers: ReactNode[]; rows: ReactNode[][] } {
  const headers: ReactNode[] = [];
  const rows: ReactNode[][] = [];

  for (const section of childArray(children)) {
    if (!isValidElement(section)) continue;
    for (const tr of childArray((section.props as PropsWithChildren).children)) {
      if (!isValidElement(tr)) continue;
      const cellContents = childArray((tr.props as PropsWithChildren).children)
        .filter(isValidElement)
        .map((cell) => (cell.props as PropsWithChildren).children as ReactNode);

      if (section.type === "thead") {
        headers.push(...cellContents);
      } else {
        rows.push(cellContents);
      }
    }
  }

  return { headers, rows };
}

export function SortableTable({ children }: { children: ReactNode }) {
  const { headers, rows } = parseTableChildren(children);
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

  const sortedRows = useMemo(() => {
    if (sortCol === null) return rows;
    return [...rows].sort((a, b) => {
      const aText = extractText(a[sortCol]).trim();
      const bText = extractText(b[sortCol]).trim();
      const aNum = parseFloat(aText);
      const bNum = parseFloat(bText);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortAsc ? aNum - bNum : bNum - aNum;
      }
      const cmp = aText.localeCompare(bText, undefined, { sensitivity: "base" });
      return sortAsc ? cmp : -cmp;
    });
  }, [rows, sortCol, sortAsc]);

  return (
    <div className="not-prose my-6 rounded-lg border border-zinc-800/50 bg-zinc-900/30 overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-zinc-800/50 bg-zinc-800/40">
          <tr className="border-b border-zinc-800/30">
            {headers.map((header, i) => (
              <th
                key={i}
                className="text-left text-[11px] font-medium text-zinc-500 px-3 py-1.5 cursor-pointer select-none transition-colors hover:text-zinc-300"
                onClick={() => handleSort(i)}
              >
                <span className="inline-flex items-center gap-1">
                  {header}
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
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((cells, rowIdx) => (
            <tr key={rowIdx} className="border-b border-zinc-800/30 last:border-0">
              {cells.map((cell, colIdx) => (
                <td key={colIdx} className="text-left text-xs text-zinc-400 px-3 py-1.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
