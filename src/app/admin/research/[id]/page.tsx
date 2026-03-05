import { notFound } from "next/navigation";
import { ExternalLink, FileSearch } from "lucide-react";
import { DomainTag } from "@/components/admin/tag-badge";
import { fetchProjectById, fetchResearchArtifactById } from "@/lib/db";
import { Panel, PanelHeader } from "@/components/admin/panel";
import { MarkdownRenderer } from "@/components/admin/markdown-renderer";
import { extractHeadings } from "@/lib/research-headings";
import { ResearchToc } from "@/components/admin/research-toc";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_14rem] gap-8">
      <div className="min-w-0 lg:border-r lg:border-zinc-800 lg:pr-8">
        <PageHeader
          title={artifact.title}
          breadcrumbs={[
            { label: "Research", href: "/admin/research" },
            ...(linkedProject
              ? [{ label: linkedProject.project.title, href: `/admin/projects/${linkedProject.project.slug}` }]
              : []),
            { label: artifact.title },
          ]}
        />
        <div className="flex items-center gap-3 mt-1">
          <span className="text-sm text-zinc-500">{formatDate(artifact.created_at)}</span>
          <DomainTag domain={artifact.domain} />
        </div>

        <div className="mt-6">
          <MarkdownRenderer content={artifact.body_md} generateIds skipFirstH1 />
        </div>

        {sourceLinks.length > 0 && (
          <Panel className="flex flex-col mt-4">
            <PanelHeader
              icon={FileSearch}
              title="Source links"
              count={sourceLinks.length}
              countLabel="links"
            />
            <div className="divide-y divide-zinc-800/30">
              {sourceLinks.map((item) => (
                <a
                  key={`${item.url}-${item.label}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors"
                >
                  <span className="type-body-sm text-zinc-300 truncate">{item.label}</span>
                  <ExternalLink size={12} className="text-teal-400 shrink-0" />
                </a>
              ))}
            </div>
          </Panel>
        )}
      </div>

      {headings.length > 0 && (
        <aside className="hidden lg:block">
          <ResearchToc headings={headings} />
        </aside>
      )}
    </div>
  );
}
