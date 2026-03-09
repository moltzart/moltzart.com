"use client";

import { useState } from "react";
import { ExternalLink, Newspaper, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/empty-state";
import { PillarTag } from "@/components/admin/tag-badge";
import { SortableDataTable, type Column } from "@/components/admin/sortable-data-table";

export interface FlatArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  link: string;
  category?: string;
  digestDate: string;
  dayLabel: string;
}

const columns: Column<FlatArticle>[] = [
  {
    key: "title",
    label: "Title",
    render: (a) =>
      a.link ? (
        <a
          href={a.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-zinc-50 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {a.title}
          <ExternalLink size={10} className="shrink-0 text-zinc-600" />
        </a>
      ) : (
        a.title
      ),
    sortValue: (a) => a.title,
  },
  {
    key: "category",
    label: "Category",
    render: (a) => (a.category ? <PillarTag pillar={a.category} /> : <span className="text-zinc-600">—</span>),
    sortValue: (a) => a.category || "",
  },
  {
    key: "source",
    label: "Source",
    render: (a) => a.source || <span className="text-zinc-600">—</span>,
    sortValue: (a) => a.source || "",
  },
  {
    key: "day",
    label: "Day",
    render: (a) => a.dayLabel,
    sortValue: (a) => a.digestDate,
  },
];

export function NewsletterArticlesTable({ articles: initialArticles }: { articles: FlatArticle[] }) {
  const [articles, setArticles] = useState(initialArticles);

  if (articles.length === 0) {
    return <EmptyState icon={Newspaper} message="No picks this week." />;
  }

  async function deleteArticle(id: string) {
    setArticles((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/admin/newsletter/${id}`, { method: "DELETE" });
  }

  return (
    <SortableDataTable
      columns={columns}
      rows={articles}
      rowKey={(a) => a.id}
      rowAction={(a) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => void deleteArticle(a.id)}
          className="text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete article"
        >
          <Trash2 size={14} />
        </Button>
      )}
    />
  );
}
