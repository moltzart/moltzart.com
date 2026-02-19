import { fetchXDrafts } from "@/lib/db";
import { DraftsView } from "@/components/drafts-view";
import { Panel } from "@/components/admin/panel";
import { PenLine } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDraftsPage() {
  const drafts = await fetchXDrafts();
  const queuedCount = drafts.filter((d) => d.status === "queued").length;

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <PenLine size={14} className="text-teal-500" />
            <span className="text-sm font-medium text-zinc-200">X Drafts</span>
          </div>
          <span className="text-xs text-zinc-600 font-mono">{queuedCount} queued</span>
        </div>
      </Panel>
      <DraftsView drafts={drafts} />
    </div>
  );
}
