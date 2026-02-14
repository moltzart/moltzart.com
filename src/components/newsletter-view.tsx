"use client";

import type { NewsletterDigest } from "@/lib/github";
import { ExternalLink, Newspaper } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

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

export function NewsletterView({ digests }: { digests: NewsletterDigest[] }) {
  // Sort all digests chronologically (newest first) — already sorted from fetch
  const totalArticles = digests.reduce((sum, d) => sum + d.articles.length, 0);

  if (digests.length === 0) {
    return (
      <div className="max-w-4xl">
        <PageHeader title="Newsletter" />
        <EmptyState icon={Newspaper} message="No picks yet." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Newsletter"
        subtitle={`${totalArticles} articles across ${digests.length} days`}
      />

      <div className="space-y-8">
        {digests.map((digest) => (
          <div key={digest.date}>
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
              {digest.label}
            </h2>
            <div className="space-y-1">
              {digest.articles.map((article, idx) => (
                <a
                  key={idx}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-3 rounded-lg hover:bg-zinc-800/40 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <SourceBadge source={article.source} />
                        <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors truncate">
                          {article.title}
                        </p>
                      </div>
                      <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">
                        {article.description}
                      </p>
                    </div>
                    <ExternalLink
                      size={14}
                      className="text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0 mt-1"
                    />
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
