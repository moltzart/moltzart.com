import { ChevronRight, ExternalLink, FileSearch } from "lucide-react";
import type { DbProductResearchItem } from "@/lib/db";
import { Panel, PanelHeader } from "@/components/admin/panel";
import { EmptyState } from "@/components/admin/empty-state";
import { MarkdownRenderer } from "@/components/admin/markdown-renderer";
import {
  isFullDocumentResearchTitle,
  isLongFormProductDocSectionTitle,
  normalizeResearchTitle,
} from "@/lib/products";

function formatDate(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isValidationEvidence(item: DbProductResearchItem): boolean {
  return (
    item.source_type === "market_data" ||
    item.source_type === "competitor" ||
    item.source_type === "user_feedback"
  );
}

export function ProductResearchView({ research }: { research: DbProductResearchItem[] }) {
  if (research.length === 0) {
    return <EmptyState icon={FileSearch} message="No research attached yet." />;
  }

  const fullDocByKey = new Set(
    research
      .filter((item) => isFullDocumentResearchTitle(item.title) && Boolean(item.notes?.trim()))
      .map((item) => normalizeResearchTitle(item.title))
  );

  const displayResearch = research.filter((item) => {
    if (isFullDocumentResearchTitle(item.title)) return true;
    const key = normalizeResearchTitle(item.title);
    return !fullDocByKey.has(key);
  });

  const planningDocs = displayResearch.filter((item) =>
    isLongFormProductDocSectionTitle(item.title)
  );
  const validationEvidence = displayResearch.filter(
    (item) => !isLongFormProductDocSectionTitle(item.title) && isValidationEvidence(item)
  );
  const buildConsiderations = displayResearch.filter(
    (item) =>
      !isLongFormProductDocSectionTitle(item.title) &&
      !isValidationEvidence(item)
  );

  const sections = [
    {
      id: "validation",
      title: "Validation evidence",
      description: "Signals that confirm the problem and demand are real.",
      items: validationEvidence,
    },
    {
      id: "planning",
      title: "Planning docs (PRD, SWOT, strategy)",
      description: "Core documents that shape scope, risks, and approach.",
      items: planningDocs,
    },
    {
      id: "build",
      title: "Build considerations",
      description: "Execution notes to carry into implementation.",
      items: buildConsiderations,
    },
  ].filter((section) => section.items.length > 0);

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        icon={FileSearch}
        title="Idea workspace"
        count={displayResearch.length}
      />

      <div className="divide-y divide-zinc-800/30">
        {sections.map((section, index) => (
          <details key={section.id} className="group" open={index === 0}>
            <summary className="list-none cursor-pointer px-4 py-3 hover:bg-zinc-800/20 transition-colors [&::-webkit-details-marker]:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ChevronRight
                      size={14}
                      className="text-zinc-500 transition-transform group-open:rotate-90 shrink-0 mt-0"
                    />
                    <p className="type-body-sm font-medium text-zinc-200 break-words">{section.title}</p>
                  </div>
                  <p className="type-body-sm text-zinc-500 mt-1">{section.description}</p>
                </div>
                <span className="type-badge text-zinc-500 mt-1">
                  {section.items.length} {section.items.length === 1 ? "doc" : "docs"}
                </span>
              </div>
            </summary>

            <div className="border-t border-zinc-800/30">
              <div className="divide-y divide-zinc-800/30">
                {section.items.map((item) => {
                  const isLongFormDoc = isLongFormProductDocSectionTitle(item.title);
                  const showSourceLink = Boolean(item.source_url) && !isLongFormDoc;

                  return (
                    <article key={item.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="type-body-sm font-medium text-zinc-200 break-words">{item.title}</p>
                          <span className="type-body-sm text-zinc-500 mt-1 inline-block">
                            Captured {formatDate(item.created_at)}
                          </span>
                        </div>
                        {showSourceLink && item.source_url && (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 type-body-sm text-teal-400 hover:text-teal-400 transition-colors shrink-0"
                          >
                            <ExternalLink size={12} />
                            <span>Reference link</span>
                          </a>
                        )}
                      </div>

                      <div className="mt-2">
                        {item.notes ? (
                          <MarkdownRenderer
                            content={item.notes}
                            className="doc-markdown-compact doc-markdown-subtle"
                          />
                        ) : (
                          <p className="type-body-sm text-zinc-500">No notes captured for this section yet.</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </details>
        ))}
      </div>
    </Panel>
  );
}
