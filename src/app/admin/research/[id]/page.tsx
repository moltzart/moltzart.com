import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileSearch } from "lucide-react";
import { fetchProjectById, fetchResearchArtifactById } from "@/lib/db";
import { Panel } from "@/components/admin/panel";
import { MarkdownRenderer } from "@/components/admin/markdown-renderer";
import { extractHeadings } from "@/lib/research-headings";
import { ResearchToc } from "@/components/admin/research-toc";

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
    <div className="space-y-4">
      <Link
        href="/admin/research"
        className="inline-flex items-center gap-1 type-body-sm text-zinc-500 hover:text-teal-400 transition-colors"
      >
        <ArrowLeft size={12} />
        <span>Back to research</span>
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="type-badge text-zinc-500">{artifact.domain}</span>
          {linkedProject && (
            <Link
              href={`/admin/projects/${linkedProject.project.slug}`}
              className="type-badge text-zinc-500 hover:text-teal-400 transition-colors"
            >
              Project: {linkedProject.project.title}
            </Link>
          )}
        </div>
        <h1 className="type-h2 text-zinc-100">{artifact.title}</h1>
        <p className="type-body-sm text-zinc-600">{formatDate(artifact.created_at)}</p>
      </header>

      <ResearchToc headings={headings} />

      <Panel className="px-4 py-4">
        <MarkdownRenderer content={artifact.body_md} generateIds />
      </Panel>

      {sourceLinks.length > 0 && (
        <Panel className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/30">
            <div className="flex items-center gap-2">
              <FileSearch size={14} className="text-teal-500" />
              <span className="type-body-sm font-medium text-zinc-200">Source links</span>
            </div>
            <span className="type-body-sm text-zinc-600">{sourceLinks.length} links</span>
          </div>
          <div className="divide-y divide-zinc-800/20">
            {sourceLinks.map((item) => (
              <a
                key={`${item.url}-${item.label}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors"
              >
                <span className="type-body-sm text-zinc-300 truncate">{item.label}</span>
                <ExternalLink size={12} className="text-teal-500 shrink-0" />
              </a>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
