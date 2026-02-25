"use client";

import Link from "next/link";
import { ChevronRight, Lightbulb } from "lucide-react";
import type { DbProductIdea } from "@/lib/db";
import type { ProductStatus } from "@/lib/products";
import { Panel } from "@/components/admin/panel";
import { EmptyState } from "@/components/admin/empty-state";

const STATUS_ORDER: ProductStatus[] = [
  "idea",
  "researching",
  "building",
  "launched",
  "archived",
];

const STATUS_META: Record<ProductStatus, { label: string; tone: string }> = {
  idea: { label: "Ideas", tone: "text-zinc-300" },
  researching: { label: "Researching", tone: "text-amber-300" },
  building: { label: "Building", tone: "text-blue-300" },
  launched: { label: "Launched", tone: "text-emerald-300" },
  archived: { label: "Archived", tone: "text-zinc-500" },
};

function formatDate(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ProductsView({ products }: { products: DbProductIdea[] }) {
  if (products.length === 0) {
    return <EmptyState icon={Lightbulb} message="No product ideas yet." />;
  }

  return (
    <div className="space-y-3">
      {STATUS_ORDER.map((status) => {
        const items = products.filter((p) => p.status === status);
        if (items.length === 0) return null;

        return (
          <Panel key={status} className="flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/30">
              <div className="flex items-center gap-2">
                <Lightbulb size={14} className="text-teal-500" />
                <span className={`text-sm font-medium ${STATUS_META[status].tone}`}>
                  {STATUS_META[status].label}
                </span>
              </div>
              <span className="text-xs text-zinc-600 font-mono">{items.length} ideas</span>
            </div>

            <div className="divide-y divide-zinc-800/20">
              {items.map((product) => (
                <Link
                  key={product.id}
                  href={`/admin/products/${product.slug}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 truncate">
                      {product.title}
                    </p>
                    {product.summary && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{product.summary}</p>
                    )}
                    <p className="text-[10px] text-zinc-600 font-mono mt-1">
                      Updated {formatDate(product.updated_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {product.research_count} research
                    </span>
                    <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
