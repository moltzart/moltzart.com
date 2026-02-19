"use client";

import { useState } from "react";
import type { NewsletterDigest } from "@/lib/db";
import { ChevronDown, ChevronRight, ExternalLink, Newspaper, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { Panel } from "@/components/admin/panel";

const sourceColors: Record<string, string> = {
  "The Verge": "bg-purple-500/20 text-purple-400",
  "Hacker News": "bg-orange-500/20 text-orange-400",
  "TechCrunch": "bg-green-500/20 text-green-400",
  "Ars Technica": "bg-blue-500/20 text-blue-400",
  "Wired": "bg-red-500/20 text-red-400",
  "MIT Technology Review": "bg-cyan-500/20 text-cyan-400",
  "Bloomberg": "bg-violet-500/20 text-violet-400",
  "Reuters": "bg-sky-500/20 text-sky-400",
  "NYT": "bg-zinc-400/20 text-zinc-300",
  "Platformer": "bg-pink-500/20 text-pink-400",
  "Stratechery": "bg-amber-500/20 text-amber-400",
};

function SourceBadge({ source }: { source: string }) {
  const colors = sourceColors[source] || "bg-zinc-700/30 text-zinc-400";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${colors}`}>
      {source}
    </span>
  );
}

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
    <div className="space-y-2">
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
                <span className="text-sm font-medium text-zinc-200">{digest.label}</span>
                <span className="text-xs text-zinc-600 font-mono">{digest.articles.length} articles</span>
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
                        <div className="flex items-center gap-2 mb-1">
                          <SourceBadge source={article.source} />
                          <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors truncate">
                            {article.title}
                          </p>
                        </div>
                        <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">
                          {article.description}
                        </p>
                      </Wrapper>
                      <div className="flex items-center gap-1 shrink-0 mt-1">
                        {article.link && (
                          <ExternalLink size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                        )}
                        <button
                          onClick={(e) => { e.preventDefault(); deleteArticle(digest.date, article.id); }}
                          className="text-zinc-700 hover:text-red-400 transition-colors p-0.5 opacity-0 group-hover:opacity-100"
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
