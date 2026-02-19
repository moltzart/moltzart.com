"use client";

import { useState } from "react";
import type { DbXDraft } from "@/lib/db";
import { ExternalLink, PenLine, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { Panel } from "@/components/admin/panel";

const STATUS_SECTIONS = [
  { status: "queued", label: "Queued", description: "Approved, waiting to post" },
  { status: "posted", label: "Posted", description: "Live on X" },
  { status: "draft", label: "Drafts", description: "Not yet approved" },
  { status: "rejected", label: "Rejected", description: "Killed in review" },
] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

export function DraftsView({ drafts: initialDrafts }: { drafts: DbXDraft[] }) {
  const [drafts, setDrafts] = useState(initialDrafts);

  if (drafts.length === 0) {
    return <EmptyState icon={PenLine} message="No drafts yet." />;
  }

  async function deleteDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/admin/draft/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-4">
      {STATUS_SECTIONS.map(({ status, label, description }) => {
        const items = drafts.filter((d) => d.status === status);
        if (items.length === 0) return null;
        return (
          <Panel key={status}>
            <div className="px-4 py-3 border-b border-zinc-800/40 flex items-center gap-2">
              <PenLine size={14} className="text-teal-500" />
              <span className="text-sm font-medium text-zinc-200">{label}</span>
              <span className="text-xs text-zinc-600 font-mono">{items.length}</span>
              <span className="text-xs text-zinc-600">· {description}</span>
            </div>
            <div className="divide-y divide-zinc-800/20">
              {items.map((draft) => (
                <div
                  key={draft.id}
                  className="px-4 py-4 hover:bg-zinc-800/40 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap mb-2">
                        {draft.text}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-zinc-600 font-mono">
                          {formatDate(draft.created_at)}
                        </span>
                        {draft.source_batch && (
                          <span className="text-xs text-zinc-600 font-mono">
                            batch: {draft.source_batch}
                          </span>
                        )}
                        {draft.tweet_url && (
                          <a
                            href={draft.tweet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-teal-500 hover:text-teal-400 transition-colors"
                          >
                            <ExternalLink size={11} />
                            <span>view on X</span>
                          </a>
                        )}
                        {draft.posted_at && (
                          <span className="text-xs text-zinc-600 font-mono">
                            posted {formatDate(draft.posted_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteDraft(draft.id)}
                      className="text-zinc-700 hover:text-red-400 transition-colors p-0.5 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                      title="Delete draft"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
