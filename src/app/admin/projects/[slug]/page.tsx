import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { fetchProjectBySlug } from "@/lib/db";
import { MarkdownRenderer } from "@/components/admin/markdown-renderer";
import { ProductResearchView } from "@/components/product-research-view";
import { DomainTag, StatusTag, KindTag } from "@/components/admin/tag-badge";
import { PageHeader } from "@/components/admin/page-header";
import { formatShortDate } from "@/lib/date-format";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const data = await fetchProjectBySlug(slug);
  if (!data) notFound();

  const { project, linkedProduct, productResearch, artifacts } = data;
  const hasProjectOverview = Boolean(project.summary?.trim());

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title={project.title}
        breadcrumbs={[
          { label: "Projects", href: "/admin/projects" },
          { label: project.title },
        ]}
        meta={
          <>
            <StatusTag status={project.status} />
            <KindTag kind={project.kind} />
            <span className="type-body-sm text-zinc-600">
              Updated {formatShortDate(project.updated_at)}
            </span>
            {linkedProduct && (
              <Link
                href={`/admin/products/${linkedProduct.slug}`}
                className="type-body-sm text-zinc-500 transition-colors hover:text-teal-400"
              >
                Product: {linkedProduct.title}
              </Link>
            )}
          </>
        }
      />

      {/* Summary */}

      {hasProjectOverview && (
        <section>
          <MarkdownRenderer
            content={project.summary || ""}
            className="doc-markdown-compact doc-markdown-subtle"
          />
        </section>
      )}

      {/* Research artifacts */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="type-label text-zinc-500">Research artifacts</h2>
          <span className="type-badge text-zinc-600">{artifacts.length}</span>
        </div>

        {artifacts.length === 0 ? (
          <p className="type-body-sm italic text-zinc-600">
            No research artifacts attached to this project.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800/50 bg-zinc-900/30">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800/50 bg-zinc-900/80">
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Domain</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Date</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {artifacts.map((artifact) => (
                  <tr key={artifact.id} className="group cursor-pointer border-b border-zinc-800/30 transition-colors last:border-0 hover:bg-zinc-800/30">
                    <td className="px-4 py-2 text-xs text-zinc-200">
                      <Link
                        href={`/admin/research/${artifact.id}`}
                        className="transition-colors hover:text-zinc-50"
                      >
                        {artifact.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-left">
                      <DomainTag domain={artifact.domain} />
                    </td>
                    <td className="px-4 py-2 text-right text-xs font-mono text-zinc-500">
                      {formatShortDate(artifact.created_at)}
                    </td>
                    <td className="px-4 py-2">
                      <ArrowRight size={12} className="text-zinc-700 transition-colors group-hover:text-zinc-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Product details */}
      {linkedProduct && (linkedProduct.summary || linkedProduct.problem || linkedProduct.audience) && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="type-label text-zinc-500">Product details</h2>
            <Link
              href={`/admin/products/${linkedProduct.slug}`}
              className="type-body-sm text-zinc-500 transition-colors hover:text-teal-400"
            >
              Open product
              <ExternalLink size={10} className="ml-1 inline-block" />
            </Link>
          </div>

          <div className="space-y-6">
            {linkedProduct.summary && (
              <div>
                <h3 className="type-body-sm mb-2 font-medium text-zinc-200">Opportunity overview</h3>
                <MarkdownRenderer content={linkedProduct.summary} className="doc-markdown-compact doc-markdown-subtle" />
              </div>
            )}
            {linkedProduct.problem && (
              <div>
                <h3 className="type-body-sm mb-2 font-medium text-zinc-200">Problem worth solving</h3>
                <MarkdownRenderer content={linkedProduct.problem} className="doc-markdown-compact doc-markdown-subtle" />
              </div>
            )}
            {linkedProduct.audience && (
              <div>
                <h3 className="type-body-sm mb-2 font-medium text-zinc-200">Primary audience</h3>
                <MarkdownRenderer content={linkedProduct.audience} className="doc-markdown-compact doc-markdown-subtle" />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Idea workspace */}
      {productResearch.length > 0 && <ProductResearchView research={productResearch} />}
    </div>
  );
}
