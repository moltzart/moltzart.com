"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Draft, DraftStatus } from "@/lib/github";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EmptyState } from "@/components/admin/empty-state";
import { Inbox } from "lucide-react";

function statusBadge(status: DraftStatus) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10">
          Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">
          Approved
        </Badge>
      );
    case "posted":
      return (
        <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
          Posted
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="border-zinc-600/30 text-zinc-500 bg-zinc-800/30">
          Rejected
        </Badge>
      );
  }
}

function DraftCard({
  draft,
  onAction,
  acting,
  error,
  focused,
  cardRef,
}: {
  draft: Draft;
  onAction: (id: string, action: "approve" | "reject") => void;
  acting: string | null;
  error: string | null;
  focused: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  const isPending = draft.status === "pending";
  const isApproved = draft.status === "approved";

  return (
    <div
      ref={cardRef}
      className={`rounded-lg border p-5 space-y-4 transition-colors ${
        isPending
          ? "border-zinc-700 bg-zinc-900/60"
          : isApproved
            ? "border-green-800/30 bg-green-950/10"
            : "border-zinc-800/50 bg-zinc-900/30"
      } ${focused ? "ring-1 ring-zinc-600" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {draft.type === "reply" && draft.replyTo ? (
            <>
              <span>Reply to</span>
              <a
                href={`https://x.com/${draft.replyTo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 hover:underline font-medium transition-all"
              >
                @{draft.replyTo}
              </a>
            </>
          ) : (
            <span className="font-medium text-zinc-400">Original post</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isPending && (
            <>
              <Button
                size="sm"
                onClick={() => onAction(draft.id, "approve")}
                disabled={acting === draft.id}
                className="bg-green-600 text-white hover:bg-green-500 transition-colors"
              >
                {acting === draft.id ? "Saving..." : "Approve"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(draft.id, "reject")}
                disabled={acting === draft.id}
                className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
              >
                Reject
              </Button>
            </>
          )}
          {statusBadge(draft.status)}
        </div>
      </div>

      {/* Reply context as blockquote */}
      {draft.type === "reply" && draft.replyContext && (
        <blockquote className="border-l-2 border-zinc-700 pl-3 text-sm text-zinc-500 italic">
          {draft.replyContext}
        </blockquote>
      )}

      <p className={`leading-relaxed text-zinc-100 ${isPending ? "text-base" : "text-[15px]"}`}>
        {draft.content}
      </p>

      <div className="flex items-center gap-3 text-xs text-zinc-600">
        <span>{draft.content.length} chars</span>
        {draft.tweetId && (
          <a
            href={`https://x.com/moltzart/status/${draft.tweetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-400 underline transition-colors"
          >
            View on X
          </a>
        )}
      </div>

      {error && draft.id === acting && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {draft.feedback && (
        <p className="text-xs text-zinc-600 italic border-t border-zinc-800/50 pt-3">
          {draft.feedback}
        </p>
      )}
    </div>
  );
}

function RejectedDraftRow({ draft }: { draft: Draft }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-zinc-800/50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-zinc-500">
            {draft.type === "reply" && draft.replyTo
              ? `Reply to @${draft.replyTo}`
              : "Original post"}
          </span>
        </div>
        <p className="text-sm text-zinc-500 line-clamp-2">{draft.content}</p>
        {draft.feedback && (
          <p className="text-xs text-zinc-600 italic mt-1">{draft.feedback}</p>
        )}
      </div>
    </div>
  );
}

// Kept for the [dayslug] route
export function DayDraftsView({ drafts: initialDrafts }: { drafts: Draft[] }) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionable = drafts.filter(
    (d) => d.status === "pending" || d.status === "approved" || d.status === "posted"
  );
  const rejected = drafts.filter((d) => d.status === "rejected");

  const sorted = [...actionable].sort((a, b) => {
    const order: Record<string, number> = { pending: 0, approved: 1, posted: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  const handleAction = async (draftId: string, action: "approve" | "reject") => {
    setActing(draftId);
    setError(null);
    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, action }),
      });
      if (res.ok) {
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draftId
              ? { ...d, status: (action === "approve" ? "approved" : "rejected") as DraftStatus }
              : d
          )
        );
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-6">
      {sorted.length === 0 && rejected.length === 0 && (
        <p className="text-sm text-zinc-500 py-8 text-center">No drafts for this day.</p>
      )}
      {sorted.length > 0 && (
        <div className="space-y-4">
          {sorted.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onAction={handleAction}
              acting={acting}
              error={error}
              focused={false}
              cardRef={() => {}}
            />
          ))}
        </div>
      )}
      {rejected.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-2">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className="transition-transform [[data-state=open]_&]:rotate-90"
            >
              <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {rejected.length} rejected
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 pl-1">
              {rejected.map((draft) => (
                <RejectedDraftRow key={draft.id} draft={draft} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

// New: All drafts view for the main /admin/drafts page
export function AllDraftsView({ drafts: initialDrafts }: { drafts: Draft[] }) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusIdx, setFocusIdx] = useState(-1);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const pending = useMemo(() => drafts.filter((d) => d.status === "pending"), [drafts]);
  const approved = useMemo(() => drafts.filter((d) => d.status === "approved"), [drafts]);
  const posted = useMemo(() => drafts.filter((d) => d.status === "posted"), [drafts]);
  const rejected = useMemo(() => drafts.filter((d) => d.status === "rejected"), [drafts]);

  // The navigable list: pending first, then approved, then posted
  const navigable = useMemo(() => [...pending, ...approved, ...posted], [pending, approved, posted]);

  const handleAction = useCallback(async (draftId: string, action: "approve" | "reject") => {
    setActing(draftId);
    setError(null);
    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, action }),
      });
      if (res.ok) {
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draftId
              ? { ...d, status: (action === "approve" ? "approved" : "rejected") as DraftStatus }
              : d
          )
        );
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setActing(null);
    }
  }, []);

  // Keyboard shortcuts: j/k navigate, a approve, r reject
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "j") {
        e.preventDefault();
        setFocusIdx((prev) => {
          const next = Math.min(prev + 1, navigable.length - 1);
          cardRefs.current.get(next)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          return next;
        });
      } else if (e.key === "k") {
        e.preventDefault();
        setFocusIdx((prev) => {
          const next = Math.max(prev - 1, 0);
          cardRefs.current.get(next)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          return next;
        });
      } else if (e.key === "a" && focusIdx >= 0 && focusIdx < navigable.length) {
        const draft = navigable[focusIdx];
        if (draft.status === "pending") {
          e.preventDefault();
          handleAction(draft.id, "approve");
        }
      } else if (e.key === "r" && focusIdx >= 0 && focusIdx < navigable.length) {
        const draft = navigable[focusIdx];
        if (draft.status === "pending") {
          e.preventDefault();
          handleAction(draft.id, "reject");
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusIdx, navigable, handleAction]);

  if (drafts.length === 0) {
    return <EmptyState icon={Inbox} message="No drafts yet." />;
  }

  return (
    <div className="space-y-8">
      {/* Keyboard hint */}
      {pending.length > 0 && (
        <p className="text-[10px] text-zinc-600 font-mono">
          j/k navigate &middot; a approve &middot; r reject
        </p>
      )}

      {/* Pending drafts (review queue) */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Pending review ({pending.length})
          </h2>
          <div className="space-y-4">
            {pending.map((draft) => {
              const navIdx = navigable.indexOf(draft);
              return (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onAction={handleAction}
                  acting={acting}
                  error={error}
                  focused={focusIdx === navIdx}
                  cardRef={(el) => {
                    if (el) cardRefs.current.set(navIdx, el);
                    else cardRefs.current.delete(navIdx);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Approved drafts */}
      {approved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Approved ({approved.length})
          </h2>
          <div className="space-y-4">
            {approved.map((draft) => {
              const navIdx = navigable.indexOf(draft);
              return (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onAction={handleAction}
                  acting={acting}
                  error={error}
                  focused={focusIdx === navIdx}
                  cardRef={(el) => {
                    if (el) cardRefs.current.set(navIdx, el);
                    else cardRefs.current.delete(navIdx);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Posted drafts */}
      {posted.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Posted ({posted.length})
          </h2>
          <div className="space-y-4">
            {posted.map((draft) => {
              const navIdx = navigable.indexOf(draft);
              return (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onAction={handleAction}
                  acting={acting}
                  error={error}
                  focused={focusIdx === navIdx}
                  cardRef={(el) => {
                    if (el) cardRefs.current.set(navIdx, el);
                    else cardRefs.current.delete(navIdx);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Rejected (collapsed) */}
      {rejected.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-2">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className="transition-transform [[data-state=open]_&]:rotate-90"
            >
              <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {rejected.length} rejected
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 pl-1">
              {rejected.map((draft) => (
                <RejectedDraftRow key={draft.id} draft={draft} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
