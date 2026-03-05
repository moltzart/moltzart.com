import { notFound } from "next/navigation";
import {
  Archive,
  FileText,
  Hammer,
  Lightbulb,
  Rocket,
  Search,
  type LucideIcon,
} from "lucide-react";
import { fetchProductBySlug } from "@/lib/db";
import { Panel, PanelHeader } from "@/components/admin/panel";
import { MarkdownRenderer } from "@/components/admin/markdown-renderer";
import { ProductResearchView } from "@/components/product-research-view";
import { PageHeader } from "@/components/admin/page-header";
import type { ProductStatus } from "@/lib/products";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

function formatDate(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_META: Record<ProductStatus, { label: string; icon: LucideIcon }> = {
  idea: { label: "Idea", icon: Lightbulb },
  researching: { label: "Researching", icon: Search },
  building: { label: "Building", icon: Hammer },
  launched: { label: "Launched", icon: Rocket },
  archived: { label: "Archived", icon: Archive },
};

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const data = await fetchProductBySlug(slug);
  if (!data) notFound();

  const { product, research } = data;
  const statusMeta = STATUS_META[product.status];
  const foundationSections = [
    { id: "overview", title: "Opportunity overview", content: product.summary },
    { id: "problem", title: "Problem worth solving", content: product.problem },
    { id: "audience", title: "Primary audience", content: product.audience },
  ].filter((section): section is { id: string; title: string; content: string } => Boolean(section.content));

  return (
    <div className="space-y-4">
      <PageHeader
        title={product.title}
        subtitle={`${statusMeta.label} · Updated ${formatDate(product.updated_at)}`}
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: product.title },
        ]}
      />

      {foundationSections.length > 0 && (
        <Panel className="flex flex-col">
          <PanelHeader
            icon={FileText}
            title="Product foundation"
            count={foundationSections.length}
            countLabel={foundationSections.length === 1 ? "section" : "sections"}
          />

          <div className="divide-y divide-zinc-800/30">
            {foundationSections.map((section) => (
              <section key={section.id} className="px-4 py-4">
                <p className="type-body-sm font-medium text-zinc-200">{section.title}</p>
                <div className="mt-2">
                  <MarkdownRenderer content={section.content} className="doc-markdown-compact doc-markdown-subtle" />
                </div>
              </section>
            ))}
          </div>
        </Panel>
      )}

      <ProductResearchView research={research} />
    </div>
  );
}
