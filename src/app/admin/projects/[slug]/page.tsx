import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, FileSearch, FolderKanban, Lightbulb } from "lucide-react";
import { fetchProjectBySlug } from "@/lib/db";
import { Panel } from "@/components/admin/panel";
import { EmptyState } from "@/components/admin/empty-state";
import { MarkdownRenderer } from "@/components/admin/markdown-renderer";
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

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const data = await fetchProjectBySlug(slug);
  if (!data) notFound();

  const { project, linkedProduct, productResearch, artifacts } = data;
  const hasProjectOverview = Boolean(project.summary?.trim());

  return (
    <div className="space-y-4">
      <Link
        href="/admin/projects"
        className="inline-flex items-center gap-1 type-body-sm text-zinc-500 hover:text-teal-400 transition-colors"
      >
        <ArrowLeft size={12} />
        <span>Back to projects</span>
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="type-badge text-zinc-500">{project.kind}</span>
          <span className="type-badge text-zinc-500">{project.status}</span>
          <span className="type-badge text-zinc-600">Updated {formatDate(project.updated_at)}</span>
          {linkedProduct && <span className="type-badge text-zinc-600">Product-linked</span>}
        </div>
        <h1 className="type-h2 text-zinc-100">{project.title}</h1>
      </header>

      {hasProjectOverview && (
        <Panel className="px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <FolderKanban size={14} className="text-teal-500" />
            <span className="type-body-sm font-medium text-zinc-200">Project overview</span>
          </div>
          <MarkdownRenderer content={project.summary || ""} className="doc-markdown-compact doc-markdown-subtle" />
        </Panel>
      )}

      <Panel className="flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/30">
          <div className="flex items-center gap-2">
            <FileSearch size={14} className="text-teal-500" />
            <span className="type-body-sm font-medium text-zinc-200">Research artifacts</span>
          </div>
          <span className="type-body-sm text-zinc-600">{artifacts.length} artifacts</span>
        </div>

        {artifacts.length === 0 ? (
          <div className="px-4 py-8">
            <EmptyState icon={FileSearch} message="No research artifacts attached to this project." />
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/20">
            {artifacts.map((artifact) => (
              <Link
                key={artifact.id}
                href={`/admin/research/${artifact.id}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="type-body-sm font-medium text-zinc-200 group-hover:text-zinc-100 truncate">
                      {artifact.title}
                    </p>
                    <span className="type-badge text-zinc-500">{artifact.domain}</span>
                  </div>
                  {artifact.summary && (
                    <p className="type-body-sm text-zinc-500 mt-1 line-clamp-1">{artifact.summary}</p>
                  )}
                </div>
                <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors mt-1 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {linkedProduct && (
        <Panel className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/30">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-teal-500" />
              <span className="type-body-sm font-medium text-zinc-200">Product details</span>
            </div>
            <Link
              href={`/admin/products/${linkedProduct.slug}`}
              className="type-body-sm text-zinc-500 hover:text-teal-400 transition-colors"
            >
              Open product
            </Link>
          </div>

          <div className="divide-y divide-zinc-800/20">
            {linkedProduct.summary && (
              <section className="px-4 py-4">
                <p className="type-body-sm font-medium text-zinc-200">Opportunity overview</p>
                <div className="mt-2">
                  <MarkdownRenderer content={linkedProduct.summary} className="doc-markdown-compact doc-markdown-subtle" />
                </div>
              </section>
            )}
            {linkedProduct.problem && (
              <section className="px-4 py-4">
                <p className="type-body-sm font-medium text-zinc-200">Problem worth solving</p>
                <div className="mt-2">
                  <MarkdownRenderer content={linkedProduct.problem} className="doc-markdown-compact doc-markdown-subtle" />
                </div>
              </section>
            )}
            {linkedProduct.audience && (
              <section className="px-4 py-4">
                <p className="type-body-sm font-medium text-zinc-200">Primary audience</p>
                <div className="mt-2">
                  <MarkdownRenderer content={linkedProduct.audience} className="doc-markdown-compact doc-markdown-subtle" />
                </div>
              </section>
            )}
          </div>
        </Panel>
      )}

      {productResearch.length > 0 && <ProductResearchView research={productResearch} />}
    </div>
  );
}
