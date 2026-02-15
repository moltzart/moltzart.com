import Link from "next/link";
import {
  ArrowRight,
  CircleCheck,
  FileText,
} from "lucide-react";
import {
  fetchTasksDb,
  fetchDraftsDb,
  fetchResearchDocs,
  fetchRadarDatesDb,
  fetchRadarItemsByDate,
  fetchOpenResearchRequests,
  type DbDraft,
} from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/admin/status-dot";
import { EmptyState } from "@/components/admin/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { RadarHighlights } from "@/components/dashboard/radar-highlights";

export const dynamic = "force-dynamic";

type ActionItem = {
  type: "urgent" | "pending-draft" | "research-request";
  label: string;
  source: string;
  sourceHref: string;
  dotVariant: "urgent" | "active" | "complete";
};

function readTime(wordCount: number): string {
  const mins = Math.max(1, Math.round(wordCount / 200));
  return `${mins} min`;
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const docDate = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
  today.setHours(0, 0, 0, 0);
  docDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - docDate.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function AdminDashboard() {
  const [tasks, draftsRows, radarDates, researchRequests, researchDocs] =
    await Promise.all([
      fetchTasksDb(),
      fetchDraftsDb(),
      fetchRadarDatesDb(),
      fetchOpenResearchRequests(),
      fetchResearchDocs(),
    ]);

  // Sequential: fetch latest radar day
  const latestDate = radarDates[0] || null;
  const latestRadar = latestDate
    ? { items: await fetchRadarItemsByDate(latestDate) }
    : null;

  // Task stats
  const taskStats = { urgent: 0, active: 0, blocked: 0, completed: 0, total: tasks.length };
  for (const t of tasks) {
    if (t.status === "done") taskStats.completed++;
    if (t.priority === "urgent" && t.status !== "done") taskStats.urgent++;
    if (t.status === "in_progress") taskStats.active++;
    if (t.blocked_by) taskStats.blocked++;
  }

  // Draft stats
  const draftStats = {
    pending: draftsRows.filter((d: DbDraft) => d.status === "pending").length,
    approved: draftsRows.filter((d: DbDraft) => d.status === "approved").length,
    posted: draftsRows.filter((d: DbDraft) => d.status === "posted").length,
  };

  // Action queue
  const actions: ActionItem[] = [];

  const urgentTasks = tasks.filter((t) => t.priority === "urgent" && t.status !== "done");
  for (const task of urgentTasks) {
    actions.push({
      type: "urgent",
      label: task.title,
      source: "Tasks",
      sourceHref: "/admin/tasks",
      dotVariant: "urgent",
    });
  }

  const pendingDrafts = draftsRows.filter((d: DbDraft) => d.status === "pending");
  for (const draft of pendingDrafts as DbDraft[]) {
    actions.push({
      type: "pending-draft",
      label: draft.content.slice(0, 120) + (draft.content.length > 120 ? "..." : ""),
      source: "Content Ideas",
      sourceHref: "/admin/drafts",
      dotVariant: "active",
    });
  }

  for (const req of researchRequests) {
    actions.push({
      type: "research-request",
      label: req.title,
      source: "Research Request",
      sourceHref: "/admin/research",
      dotVariant: "active",
    });
  }

  const taskProgress = taskStats.total > 0
    ? Math.round((taskStats.completed / taskStats.total) * 100)
    : 0;

  const radarItemCount = latestRadar?.items.length || 0;
  const recentResearch = researchDocs.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Row 1: Metrics strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Urgent"
          value={taskStats.urgent}
          subtitle={`${taskStats.active} active · ${taskStats.blocked} blocked`}
          href="/admin/tasks"
        >
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400/60 rounded-full"
              style={{ width: `${taskProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-600 mt-1 font-mono">
            {taskStats.completed}/{taskStats.total} done
          </p>
        </StatCard>

        <StatCard
          title="Radar"
          value={radarItemCount}
          subtitle={latestDate ? `Scanned ${latestDate}` : "No scans yet"}
          href="/admin/radar"
        >
        </StatCard>

        <StatCard
          title="Content Ideas"
          value={draftStats.pending}
          subtitle={`${draftStats.approved} approved · ${draftStats.posted} posted`}
          href="/admin/drafts"
        />

        <StatCard
          title="Research"
          value={researchDocs.length}
          subtitle={researchRequests.length > 0 ? `${researchRequests.length} open request${researchRequests.length !== 1 ? "s" : ""}` : "No open requests"}
          href="/admin/research"
        />
      </div>

      {/* Row 2: Action Queue (full width, only if items exist) */}
      {actions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Needs attention
          </h2>
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 divide-y divide-zinc-800/30">
            {actions.map((item, i) => (
              <Link
                key={i}
                href={item.sourceHref}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <StatusDot variant={item.dotVariant} pulse={item.type === "urgent"} />
                <span className="text-sm text-zinc-200 flex-1 min-w-0 truncate">
                  {item.label}
                </span>
                <Badge
                  variant="outline"
                  className="border-zinc-700/50 text-zinc-500 bg-zinc-800/20 text-[10px] shrink-0"
                >
                  {item.source}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {actions.length === 0 && (
        <EmptyState icon={CircleCheck} message="All clear — nothing needs attention" />
      )}

      {/* Row 3: Radar highlights */}
      <RadarHighlights
        date={latestDate || "—"}
        items={latestRadar?.items || []}
      />

      {/* Row 4: Recent Research (condensed) */}
      {recentResearch.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Recent Research
            </h2>
            <Link
              href="/admin/research"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {recentResearch.map((doc) => (
              <Link
                key={doc.slug}
                href={`/admin/research/${doc.slug}`}
                className="flex items-start gap-3 px-4 py-3 border border-zinc-800/50 rounded-lg bg-zinc-900/30 hover:bg-zinc-800/40 transition-colors group"
              >
                <FileText size={14} className="text-zinc-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-zinc-200 line-clamp-1">{doc.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {doc.word_count && (
                      <span className="text-[10px] font-mono text-zinc-600">
                        {readTime(doc.word_count)}
                      </span>
                    )}
                    {doc.created_at && (
                      <span className="text-[10px] text-zinc-600">
                        {formatRelativeDate(doc.created_at)}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight
                  size={12}
                  className="text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0 mt-1"
                />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

