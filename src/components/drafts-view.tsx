"use client";

import { useState } from "react";
import type { Draft, DraftDay, DraftStatus } from "@/lib/github";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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

export function DraftsView({
  days: initialDays,
  sha: initialSha,
}: {
  days: DraftDay[];
  sha: string;
}) {
  const [days, setDays] = useState(initialDays);
  const [acting, setActing] = useState<string | null>(null);

  const allDrafts = days.flatMap((d) => d.drafts);

  const handleAction = async (draftId: string, action: "approve" | "reject") => {
    setActing(draftId);
    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, action }),
      });
      if (res.ok) {
        setDays((prev) =>
          prev.map((day) => ({
            ...day,
            drafts: day.drafts.map((d) =>
              d.id === draftId
                ? { ...d, status: (action === "approve" ? "approved" : "rejected") as DraftStatus }
                : d
            ),
          }))
        );
      }
    } catch (e) {
      console.error("Draft action failed:", e);
    } finally {
      setActing(null);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Status</TableHead>
          <TableHead className="w-20">Type</TableHead>
          <TableHead>Draft</TableHead>
          <TableHead className="w-36 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {allDrafts.map((draft) => (
          <TableRow key={draft.id}>
            <TableCell>{statusBadge(draft.status)}</TableCell>
            <TableCell className="text-xs text-zinc-400">
              {draft.type === "reply" && draft.replyTo ? (
                <a
                  href={`https://x.com/${draft.replyTo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-zinc-200 hover:underline"
                >
                  @{draft.replyTo}
                </a>
              ) : (
                "Original"
              )}
            </TableCell>
            <TableCell>
              <p className="text-sm text-zinc-200 leading-relaxed">
                {draft.content}
              </p>
              <span className="text-xs text-zinc-600">{draft.content.length} chars</span>
              {draft.tweetId && (
                <a
                  href={`https://x.com/moltzart/status/${draft.tweetId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-600 hover:text-zinc-400 underline ml-2"
                >
                  View
                </a>
              )}
              {draft.feedback && (
                <p className="text-xs text-zinc-600 italic mt-1">{draft.feedback}</p>
              )}
            </TableCell>
            <TableCell className="text-right">
              {draft.status === "pending" && (
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-600/30 text-green-400 hover:bg-green-600/20 hover:text-green-300"
                    onClick={() => handleAction(draft.id, "approve")}
                    disabled={acting === draft.id}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-700 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-400"
                    onClick={() => handleAction(draft.id, "reject")}
                    disabled={acting === draft.id}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
