"use client";

import { useState } from "react";
import { ExternalLink, Newspaper, Trash2, Send, Check, Loader2 } from "lucide-react";
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
  sentToOs?: boolean;
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

export function NewsletterArticlesTable({ articles: initialArticles, weekMonday }: { articles: FlatArticle[]; weekMonday?: string }) {
  const [articles, setArticles] = useState(initialArticles);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  if (articles.length === 0) {
    return <EmptyState icon={Newspaper} message="No picks this week." />;
  }

  async function deleteArticle(id: string) {
    setArticles((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/admin/newsletter/${id}`, { method: "DELETE" });
  }

  async function sendToOS(article: FlatArticle) {
    if (!weekMonday || !article.link) return;
    setSendingId(article.id);
    try {
      const res = await fetch("/api/newsletter/send-to-os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: article.id, url: article.link, title: article.title, source: article.source, weekMonday }),
      });
      if (!res.ok) throw new Error("Failed");
      setSentIds((prev) => new Set(prev).add(article.id));
    } catch {
      // Could add error toast here
    } finally {
      setSendingId(null);
    }
  }

  return (
    <SortableDataTable
      columns={columns}
      rows={articles}
      rowKey={(a) => a.id}
      rowAction={(a) => (
        <div className="flex items-center gap-3">
          {weekMonday && a.link && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="w-[6.5rem] justify-center text-zinc-400 hover:text-zinc-300"
              onClick={() => void sendToOS(a)}
              disabled={sendingId === a.id || sentIds.has(a.id) || a.sentToOs}
            >
              {sendingId === a.id ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (sentIds.has(a.id) || a.sentToOs) ? (
                <Check size={12} />
              ) : (
                <Send size={12} />
              )}
              {(sentIds.has(a.id) || a.sentToOs) ? "Sent" : "Send to OS"}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-zinc-400 hover:bg-destructive/10 hover:text-red-400"
            onClick={() => void deleteArticle(a.id)}
            title="Delete"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      )}
    />
  );
}
