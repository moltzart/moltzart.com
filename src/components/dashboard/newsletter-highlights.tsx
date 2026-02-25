import Link from "next/link";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { Panel } from "@/components/admin/panel";
import { PillarTag } from "@/components/admin/tag-badge";
import { getWeekMonday } from "@/lib/newsletter-weeks";
import type { NewsletterArticle } from "@/lib/db";

interface NewsletterHighlightsProps {
  articles: NewsletterArticle[];
  date: string | null;
}

export function NewsletterHighlights({ articles, date }: NewsletterHighlightsProps) {
  const weekHref = date ? `/admin/newsletter/${getWeekMonday(date)}` : "/admin/newsletter";
  return (
    <Panel className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/30">
        <div className="flex items-center gap-2">
          <Newspaper size={14} className="text-teal-500" />
          <span className="type-body-sm font-medium text-zinc-200">Newsletter Picks</span>
          {date && <span className="type-body-sm text-zinc-600">{date}</span>}
        </div>
        <Link
          href="/admin/newsletter"
          className="type-body-sm text-zinc-500 hover:text-teal-400 transition-colors flex items-center gap-1"
        >
          View all <ArrowUpRight size={10} />
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <EmptyState icon={Newspaper} message="No picks yet." />
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/40">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={weekHref}
              className="block px-4 py-4 hover:bg-zinc-800/40 transition-colors"
            >
              {article.category && <PillarTag pillar={article.category} />}
              <p className="type-body-sm text-zinc-200 truncate mt-1">{article.title}</p>
              {article.description && (
                <p className="type-body-sm text-zinc-500 truncate">{article.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}
