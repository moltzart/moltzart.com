import Link from "next/link";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { Panel } from "@/components/admin/panel";
import { SourceTag } from "@/components/admin/tag-badge";
import type { NewsletterArticle } from "@/lib/db";

interface NewsletterHighlightsProps {
  articles: NewsletterArticle[];
  date: string | null;
}

export function NewsletterHighlights({ articles, date }: NewsletterHighlightsProps) {
  return (
    <Panel className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/30">
        <div className="flex items-center gap-2">
          <Newspaper size={14} className="text-teal-500" />
          <span className="text-sm font-medium text-zinc-200">Newsletter Picks</span>
          {date && <span className="text-xs text-zinc-600 font-mono">{date}</span>}
        </div>
        <Link
          href="/admin/newsletter"
          className="text-xs text-zinc-500 hover:text-teal-400 transition-colors flex items-center gap-1"
        >
          View all <ArrowUpRight size={10} />
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <EmptyState icon={Newspaper} message="No picks yet." />
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/20">
          {articles.map((article) => {
            const Wrapper = article.link ? "a" : "div";
            const linkProps = article.link
              ? { href: article.link, target: "_blank" as const, rel: "noopener noreferrer" }
              : {};
            return (
              <div key={article.id} className="px-4 py-2.5 hover:bg-zinc-800/40 transition-colors">
                <Wrapper {...linkProps} className="block">
                  <div className="flex items-start gap-3">
                    <p className="flex-1 min-w-0 text-sm text-zinc-200 truncate">{article.title}</p>
                    {article.source && <SourceTag source={article.source} />}
                  </div>
                  {article.description && (
                    <p className="text-xs text-zinc-500 truncate">{article.description}</p>
                  )}
                </Wrapper>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
