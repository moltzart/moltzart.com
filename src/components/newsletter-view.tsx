"use client";

import { useState } from "react";
import type { NewsletterDigest } from "@/lib/db";
import { ChevronDown, ChevronRight, ExternalLink, Newspaper, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { Panel } from "@/components/admin/panel";
import { PillarTag } from "@/components/admin/tag-badge";

export function NewsletterView({ digests: initialDigests }: { digests: NewsletterDigest[] }) {
  const [digests, setDigests] = useState(initialDigests);
  const [openDates, setOpenDates] = useState<Set<string>>(
    () => new Set(initialDigests.length > 0 ? [initialDigests[0].date] : [])
  );

  if (digests.length === 0) {
    return <EmptyState icon={Newspaper} message="No picks yet." />;
  }

  function toggleDay(date: string) {
    setOpenDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  async function deleteArticle(digestDate: string, articleId: string) {
    setDigests((prev) =>
      prev
        .map((d) =>
          d.date === digestDate
            ? { ...d, articles: d.articles.filter((a) => a.id !== articleId), articleCount: d.articles.length - 1 }
            : d
        )
        .filter((d) => d.articles.length > 0)
    );
    await fetch(`/api/admin/newsletter/${articleId}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-3">
      {digests.map((digest) => {
        const isOpen = openDates.has(digest.date);
        return (
          <Panel key={digest.date} className="flex flex-col">
            <button
              onClick={() => toggleDay(digest.date)}
              className="flex items-center justify-between px-4 py-3 w-full text-left hover:bg-zinc-800/20 transition-colors rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Newspaper size={14} className="text-teal-500" />
                <span className="type-body-sm font-medium text-zinc-200">{digest.label}</span>
                <span className="type-body-sm text-zinc-600">{digest.articles.length} articles</span>
              </div>
              {isOpen
                ? <ChevronDown size={14} className="text-zinc-600" />
                : <ChevronRight size={14} className="text-zinc-600" />
              }
            </button>

            {isOpen && (
              <div className="divide-y divide-zinc-800/20 border-t border-zinc-800/30">
                {digest.articles.map((article) => {
                  const Wrapper = article.link ? "a" : "div";
                  const linkProps = article.link
                    ? { href: article.link, target: "_blank" as const, rel: "noopener noreferrer" }
                    : {};
                  return (
                    <div key={article.id} className="flex items-start gap-2 px-4 py-3 hover:bg-zinc-800/40 transition-colors group">
                      <Wrapper {...linkProps} className="flex-1 min-w-0">
                        <div className="mb-1">
                          {article.category && <PillarTag pillar={article.category} />}
                          <p className="type-body-sm font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors truncate mt-1">
                            {article.title}
                          </p>
                        </div>
                        <p className="type-body-sm text-zinc-500 line-clamp-2">
                          {article.description}
                        </p>
                      </Wrapper>
                      <div className="flex items-center gap-1 shrink-0 mt-1">
                        {article.link && (
                          <ExternalLink size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                        )}
                        <button
                          onClick={(e) => { e.preventDefault(); deleteArticle(digest.date, article.id); }}
                          className="text-zinc-700 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                          title="Delete article"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
