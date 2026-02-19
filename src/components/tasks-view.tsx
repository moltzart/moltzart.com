"use client";

import { useState, useMemo } from "react";
import type { DbTask } from "@/lib/db";
import {
  AlertTriangle,
  ArrowUp,
  Circle,
  CircleDot,
  CheckCircle2,
  ListTodo,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Panel } from "@/components/admin/panel";

const priorityConfig: Record<
  string,
  { icon: typeof AlertTriangle; color: string; badge: string }
> = {
  urgent: {
    icon: AlertTriangle,
    color: "text-red-400",
    badge: "bg-red-400/10 text-red-400 border-red-400/20",
  },
  high: {
    icon: ArrowUp,
    color: "text-amber-400",
    badge: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  },
  normal: {
    icon: Circle,
    color: "text-zinc-400",
    badge: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
  },
  low: {
    icon: Circle,
    color: "text-zinc-600",
    badge: "bg-zinc-600/10 text-zinc-500 border-zinc-600/20",
  },
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "done":
      return <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />;
    case "in_progress":
      return <CircleDot size={14} className="text-amber-400 shrink-0" />;
    default:
      return <Circle size={14} className="text-zinc-500 shrink-0" />;
  }
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority] || priorityConfig.normal;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border ${config.badge}`}>
      {priority}
    </span>
  );
}

function TaskRow({ task }: { task: DbTask }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = !!task.detail;

  return (
    <div className="flex gap-2.5 py-2.5 px-3 rounded-lg hover:bg-zinc-800/20 transition-colors">
      <div className="flex items-center h-6 shrink-0">
        <StatusIcon status={task.status} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span
            className={`text-sm flex-1 ${
              task.status === "done" ? "text-zinc-500 line-through" : "text-zinc-200"
            }`}
          >
            {task.title}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {task.effort && (
              <span className="text-[10px] font-mono text-zinc-600">{task.effort}</span>
            )}
            {task.due_date && (
              <span className="text-[10px] font-mono text-zinc-500">{task.due_date}</span>
            )}
            <PriorityBadge priority={task.priority} />
            {hasDetail && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            )}
          </div>
        </div>
        {hasDetail && expanded && (
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{task.detail}</p>
        )}
        {task.blocked_by && (
          <p className="text-[10px] text-orange-400/80 mt-0.5">Blocked by: {task.blocked_by}</p>
        )}
      </div>
    </div>
  );
}

export function TasksView({ initialData }: { initialData: DbTask[] }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    let open = 0;
    let inProgress = 0;
    let done = 0;
    for (const task of data) {
      if (task.status === "done") done++;
      else if (task.status === "in_progress") inProgress++;
      else open++;
    }
    return { open, inProgress, done };
  }, [data]);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  };

  return (
    <div>
      <Panel className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/30">
          <div className="flex items-center gap-2">
            <ListTodo size={14} className="text-teal-500" />
            <span className="text-sm font-medium text-zinc-200">Tasks</span>
            <span className="flex items-center gap-2 text-xs">
              <span className="font-mono text-zinc-300">{stats.open}</span>
              <span className="text-zinc-600">open</span>
              <span className="font-mono text-amber-400">{stats.inProgress}</span>
              <span className="text-zinc-600">in progress</span>
              <span className="font-mono text-emerald-400">{stats.done}</span>
              <span className="text-zinc-600">done</span>
            </span>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {data.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center">No tasks yet.</p>
        ) : (
          <div className="divide-y divide-zinc-800/30">
            {data.map((task) => <TaskRow key={task.id} task={task} />)}
          </div>
        )}
      </Panel>
    </div>
  );
}
