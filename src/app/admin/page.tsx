import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import {
  fetchTasksDb,
  fetchNewsletterArticlesDb,
} from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/admin/status-dot";
import { Panel } from "@/components/admin/panel";
import { StatCard } from "@/components/dashboard/stat-card";
import { NewsletterHighlights } from "@/components/dashboard/newsletter-highlights";

export const dynamic = "force-dynamic";

type ActionItem = {
  type: "urgent";
  label: string;
  source: string;
  sourceHref: string;
  dotVariant: "urgent" | "active" | "complete";
};

export default async function AdminDashboard() {
  const [tasks, newsletterArticles] =
    await Promise.all([
      fetchTasksDb(),
      fetchNewsletterArticlesDb(),
    ]);

  // Newsletter: count latest digest articles
  const latestDigestDate = newsletterArticles.length > 0 ? newsletterArticles[0].digest_date.slice(0, 10) : null;
  const latestDigestCount = latestDigestDate
    ? newsletterArticles.filter((a) => a.digest_date.slice(0, 10) === latestDigestDate).length
    : 0;
  const latestDigestArticles = latestDigestDate
    ? newsletterArticles
        .filter((a) => a.digest_date.slice(0, 10) === latestDigestDate)
        .slice(0, 4)
        .map((a) => ({ id: a.id, title: a.title, description: a.description || "", source: a.source || "", link: a.link || "", category: a.category || undefined }))
    : [];

  // Task stats
  const taskStats = { urgent: 0, active: 0, blocked: 0, completed: 0, total: tasks.length };
  for (const t of tasks) {
    if (t.status === "done") taskStats.completed++;
    if (t.priority === "urgent" && t.status !== "done") taskStats.urgent++;
    if (t.status === "in_progress") taskStats.active++;
    if (t.blocked_by) taskStats.blocked++;
  }

  // Action queue — urgent tasks only
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

  const taskProgress = taskStats.total > 0
    ? Math.round((taskStats.completed / taskStats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Row 1: Metrics strip */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Tasks"
          value={taskStats.total}
          subtitle={`${taskStats.active} active · ${taskStats.blocked} blocked${taskStats.urgent > 0 ? ` · ${taskStats.urgent} urgent` : ""}`}
          href="/admin/tasks"
        >
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-400 rounded-full"
              style={{ width: `${taskProgress}%` }}
            />
          </div>
          <p className="type-body-sm text-zinc-600 mt-2">
            {taskStats.completed}/{taskStats.total} done
          </p>
        </StatCard>

        <StatCard
          title="Newsletter"
          value={latestDigestCount}
          subtitle={latestDigestDate ? `Latest: ${latestDigestDate}` : "No digests yet"}
          href="/admin/newsletter"
        />
      </div>

      {/* Row 2: Action Queue — only shown when there are urgent items */}
      {actions.length > 0 && <Panel className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/30">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-teal-500" />
            <span className="type-body-sm font-medium text-zinc-200">Action Queue</span>
            {actions.length > 0 && (
              <span className="type-body-sm text-zinc-600">{actions.length} items</span>
            )}
          </div>
          <Link
            href="/admin/tasks"
            className="type-body-sm text-zinc-500 hover:text-teal-400 transition-colors flex items-center gap-1"
          >
            All tasks <ArrowUpRight size={10} />
          </Link>
        </div>

        <div className="divide-y divide-zinc-800/20">
          {actions.map((item, i) => (
            <Link
              key={i}
              href={item.sourceHref}
              className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors"
            >
              <StatusDot variant={item.dotVariant} pulse={item.type === "urgent"} />
              <span className="type-body-sm text-zinc-200 flex-1 min-w-0 truncate">
                {item.label}
              </span>
              <Badge
                variant="outline"
                className="border-zinc-700/50 text-zinc-500 bg-zinc-800/20 type-badge shrink-0"
              >
                {item.source}
              </Badge>
            </Link>
          ))}
        </div>
      </Panel>}

      {/* Row 3: Intelligence Grid */}
      <div>
        <NewsletterHighlights articles={latestDigestArticles} date={latestDigestDate} />
      </div>
    </div>
  );
}
