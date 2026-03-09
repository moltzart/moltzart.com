import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { DomainTag } from "@/components/admin/tag-badge";
import { fetchProjectById, fetchResearchArtifactById } from "@/lib/db";
import { MarkdownRenderer } from "@/components/admin/markdown-renderer";
import { extractHeadings } from "@/lib/research-headings";
import { ResearchToc } from "@/components/admin/research-toc";
import { PageHeader } from "@/components/admin/page-header";
import { formatShortDate } from "@/lib/date-format";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function getLinkItems(sourceLinks: unknown[] | null): Array<{ label: string; url: string }> {
  if (!sourceLinks) return [];

  const items: Array<{ label: string; url: string }> = [];
  for (const entry of sourceLinks) {
    if (typeof entry === "string") {
      items.push({ label: entry, url: entry });
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const url = typeof obj.url === "string" ? obj.url : null;
    if (!url) continue;
    const label = typeof obj.label === "string" && obj.label.trim().length > 0 ? obj.label : url;
    items.push({ label, url });
  }

  return items;
}

export default async function AdminResearchDetailPage({ params }: Props) {
  const { id } = await params;
  const artifact = await fetchResearchArtifactById(id);
  if (!artifact) notFound();
  const linkedProject = artifact.project_id ? await fetchProjectById(artifact.project_id) : null;

  const sourceLinks = getLinkItems(artifact.source_links);
  const headings = extractHeadings(artifact.body_md);

  return (
    <div className="space-y-8">
      <PageHeader
        title={artifact.title}
        breadcrumbs={[
          { label: "Projects", href: "/admin/projects" },
          ...(linkedProject
            ? [{ label: linkedProject.project.title, href: `/admin/projects/${linkedProject.project.slug}` }]
            : [{ label: "Triage", href: "/admin/projects" }]),
          { label: artifact.title },
        ]}
        meta={
          <>
            <DomainTag domain={artifact.domain} />
            <span className="type-body-sm text-zinc-600">{formatShortDate(artifact.created_at)}</span>
          </>
        }
      />

      {sourceLinks.length > 0 && (
        <div className="space-y-2">
          <h3 className="type-label text-zinc-500">Source links</h3>
          <div className="flex flex-wrap gap-2">
            {sourceLinks.map((item) => (
              <a
                key={`${item.url}-${item.label}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-3 py-1.5 text-zinc-300 transition-colors hover:border-zinc-700/60 hover:bg-zinc-900/60"
              >
                <span className="type-body-sm">{item.label}</span>
                <ExternalLink size={12} className="shrink-0 text-zinc-500" />
              </a>
            ))}
          </div>
        </div>
      )}

      {headings.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <MarkdownRenderer content={artifact.body_md} className="doc-markdown-full-width" generateIds skipFirstH1 sanitize />
          </div>
          <aside className="hidden lg:block">
            <ResearchToc headings={headings} />
          </aside>
        </div>
      ) : (
        <MarkdownRenderer content={artifact.body_md} className="doc-markdown-full-width" generateIds skipFirstH1 sanitize />
      )}
    </div>
  );
}
