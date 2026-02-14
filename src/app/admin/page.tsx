import Link from "next/link";
import {
  ArrowUpRight,
  CircleCheck,
} from "lucide-react";
import { fetchTasks, fetchDrafts } from "@/lib/github";
import { PageHeader } from "@/components/admin/page-header";
import { StatusDot } from "@/components/admin/status-dot";
import { EmptyState } from "@/components/admin/empty-state";

export const dynamic = "force-dynamic";

type ActionItem = {
  type: "urgent" | "pending-draft" | "approved-draft";
  label: string;
  source: string;
  sourceHref: string;
  dotVariant: "urgent" | "active" | "complete";
  draftId?: string;
};

export default async function AdminDashboard() {
  const [tasksData, draftsData] = await Promise.all([
    fetchTasks(),
    fetchDrafts(),
  ]);

  // Task stats
  const taskStats = { urgent: 0, active: 0, blocked: 0, completed: 0, total: 0 };
  for (const section of tasksData.sections) {
    const open = section.tasks.filter((t) => t.status !== "done").length;
    const done = section.tasks.filter((t) => t.status === "done").length;
    if (section.id === "urgent") taskStats.urgent = open;
    if (section.id === "active") taskStats.active = open;
    if (section.id === "blocked") taskStats.blocked = section.tasks.length;
    taskStats.completed += done;
    taskStats.total += section.tasks.length;
  }

  // Draft stats
  const allDrafts = draftsData.days.flatMap((d) => d.drafts);
  const draftStats = {
    pending: allDrafts.filter((d) => d.status === "pending").length,
    approved: allDrafts.filter((d) => d.status === "approved").length,
    posted: allDrafts.filter((d) => d.status === "posted").length,
    rejected: allDrafts.filter((d) => d.status === "rejected").length,
  };

  // Build unified action queue
  const actions: ActionItem[] = [];

  // Urgent tasks
  const urgentTasks = tasksData.sections
    .find((s) => s.id === "urgent")
    ?.tasks.filter((t) => t.status !== "done") || [];
  for (const task of urgentTasks) {
    actions.push({
      type: "urgent",
      label: task.text,
      source: "Tasks",
      sourceHref: "/admin/tasks",
      dotVariant: "urgent",
    });
  }

  // Pending drafts
  const pendingDrafts = allDrafts.filter((d) => d.status === "pending");
  for (const draft of pendingDrafts) {
    actions.push({
      type: "pending-draft",
      label: draft.content.slice(0, 120) + (draft.content.length > 120 ? "..." : ""),
      source: "Drafts",
      sourceHref: "/admin/drafts",
      dotVariant: "active",
      draftId: draft.id,
    });
  }

  // Approved drafts ready to post
  const approvedDrafts = allDrafts.filter((d) => d.status === "approved");
  for (const draft of approvedDrafts) {
    actions.push({
      type: "approved-draft",
      label: draft.content.slice(0, 120) + (draft.content.length > 120 ? "..." : ""),
      source: "Ready to post",
      sourceHref: "/admin/drafts",
      dotVariant: "complete",
    });
  }

  const taskProgress = taskStats.total > 0
    ? Math.round((taskStats.completed / taskStats.total) * 100)
    : 0;

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader title="Dashboard" />

      {/* Zone 1: Action Queue */}
      {actions.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Action queue
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
                <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider shrink-0">
                  {item.source}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon={CircleCheck} message="All clear — nothing needs attention" />
      )}

      {/* Zone 2: Compact Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* X / @moltzart stats */}
        <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-zinc-200">X / @moltzart</span>
            <Link
              href="/admin/drafts"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              Drafts <ArrowUpRight size={10} />
            </Link>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-zinc-300">
              <span className="font-mono font-medium">{draftStats.posted}</span>{" "}
              <span className="text-zinc-500">posted</span>
            </span>
            <span className="text-zinc-300">
              <span className="font-mono font-medium">{draftStats.approved}</span>{" "}
              <span className="text-zinc-500">approved</span>
            </span>
            <span className="text-zinc-300">
              <span className="font-mono font-medium">{draftStats.pending}</span>{" "}
              <span className="text-zinc-500">pending</span>
            </span>
            <span className="text-zinc-300">
              <span className="font-mono font-medium">{draftStats.rejected}</span>{" "}
              <span className="text-zinc-500">rejected</span>
            </span>
          </div>
        </div>

        {/* Tasks stats */}
        <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-zinc-200">Tasks</span>
            <Link
              href="/admin/tasks"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              All tasks <ArrowUpRight size={10} />
            </Link>
          </div>
          <div className="flex items-center gap-4 text-xs mb-2">
            <span className="text-zinc-300">
              <span className="font-mono font-medium text-red-400">{taskStats.urgent}</span>{" "}
              <span className="text-zinc-500">urgent</span>
            </span>
            <span className="text-zinc-300">
              <span className="font-mono font-medium text-amber-400">{taskStats.active}</span>{" "}
              <span className="text-zinc-500">active</span>
            </span>
            <span className="text-zinc-300">
              <span className="font-mono font-medium text-orange-400">{taskStats.blocked}</span>{" "}
              <span className="text-zinc-500">blocked</span>
            </span>
            <span className="text-zinc-300">
              <span className="font-mono font-medium text-emerald-400">{taskStats.completed}</span>{" "}
              <span className="text-zinc-500">done</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400/60 rounded-full transition-all"
              style={{ width: `${taskProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-600 mt-1 font-mono">
            {taskStats.completed}/{taskStats.total} completed
          </p>
        </div>
      </div>
    </div>
  );
}
