"use client";

import { useState } from "react";
import { ExternalLink, MessageSquare, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/empty-state";
import { SortableDataTable, type Column } from "@/components/admin/sortable-data-table";

const STATUS_STYLES: Record<string, string> = {
  queued: "text-amber-400",
  posted: "text-teal-400",
  draft: "text-zinc-500",
  rejected: "text-red-400/70",
};

export interface FlatDraft {
  id: string;
  text: string;
  status: string;
  source_batch: string | null;
  tweet_url: string | null;
  created_at: string;
  dayLabel: string;
}

const columns: Column<FlatDraft>[] = [
  {
    key: "text",
    label: "Text",
    render: (d) => (
      <span className="line-clamp-1 max-w-[400px]" title={d.text}>
        {d.text}
      </span>
    ),
    sortValue: (d) => d.text,
  },
  {
    key: "status",
    label: "Status",
    render: (d) => (
      <Badge className={STATUS_STYLES[d.status] ?? "text-zinc-500"}>
        {d.status}
      </Badge>
    ),
    sortValue: (d) => d.status,
  },
  {
    key: "batch",
    label: "Batch",
    render: (d) =>
      d.source_batch ? (
        <span>{d.source_batch}</span>
      ) : (
        <span className="text-zinc-600">&mdash;</span>
      ),
    sortValue: (d) => d.source_batch || "",
  },
  {
    key: "day",
    label: "Day",
    render: (d) => d.dayLabel,
    sortValue: (d) => d.created_at,
  },
];

export function SocialTable({ drafts: initialDrafts }: { drafts: FlatDraft[] }) {
  const [drafts, setDrafts] = useState(initialDrafts);

  if (drafts.length === 0) {
    return <EmptyState icon={MessageSquare} message="No posts this week." />;
  }

  async function deleteDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/admin/draft/${id}`, { method: "DELETE" });
  }

  return (
    <SortableDataTable
      columns={columns}
      rows={drafts}
      rowKey={(d) => d.id}
      rowAction={(d) => (
        <div className="flex items-center gap-1">
          {d.tweet_url && (
            <a
              href={d.tweet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-teal-400 transition-colors p-1"
              onClick={(e) => e.stopPropagation()}
              title="View on X"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => void deleteDraft(d.id)}
            className="text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete draft"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )}
    />
  );
}
