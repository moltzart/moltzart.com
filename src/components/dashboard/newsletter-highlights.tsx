import Link from "next/link";
import { Newspaper } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { Panel, PanelHeader } from "@/components/admin/panel";
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
      <PanelHeader
        icon={Newspaper}
        title="Newsletter Picks"
        action={{ label: "View all", href: "/admin/newsletter" }}
      >
        {date && <span className="type-body-sm text-zinc-500">{date}</span>}
      </PanelHeader>

      {articles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <EmptyState icon={Newspaper} message="No picks yet." />
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/30">
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
