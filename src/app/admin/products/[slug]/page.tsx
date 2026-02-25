import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { fetchProductBySlug } from "@/lib/db";
import { Panel } from "@/components/admin/panel";
import { ProductResearchView } from "@/components/product-research-view";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

function formatDate(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const data = await fetchProductBySlug(slug);
  if (!data) notFound();

  const { product, research } = data;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-teal-400 transition-colors"
      >
        <ArrowLeft size={12} />
        <span>Back to products</span>
      </Link>

      <Panel>
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Lightbulb size={14} className="text-teal-500" />
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">{product.status}</span>
              </div>
              <h1 className="text-lg font-semibold text-zinc-100 mt-1">{product.title}</h1>
            </div>
            <span className="text-[10px] text-zinc-600 font-mono">
              Updated {formatDate(product.updated_at)}
            </span>
          </div>

          {product.summary && (
            <p className="text-sm text-zinc-300 leading-relaxed">
              {product.summary}
            </p>
          )}

          {(product.problem || product.audience) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {product.problem && (
                <div className="rounded-md border border-zinc-700/40 bg-zinc-900/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Problem</p>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{product.problem}</p>
                </div>
              )}
              {product.audience && (
                <div className="rounded-md border border-zinc-700/40 bg-zinc-900/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Audience</p>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{product.audience}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Panel>

      <ProductResearchView research={research} />
    </div>
  );
}
