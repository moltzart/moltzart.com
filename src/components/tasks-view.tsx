"use client";

import { useState, useMemo } from "react";
import type { ParsedTasks } from "@/lib/github";
import {
  AlertTriangle,
  Clock,
  Archive,
  Loader,
  Ban,
  CheckCircle2,
  Circle,
  CircleDot,
  RefreshCw,
  Repeat,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";

interface Task {
  text: string;
  status: "done" | "partial" | "open";
  detail?: string;
}

interface Section {
  id: string;
  title: string;
  tasks: Task[];
}

interface RecurringTask {
  task: string;
  schedule: string;
  method: string;
}

const sectionConfig: Record<
  string,
  { icon: typeof AlertTriangle; color: string; badge: string; border: string }
> = {
  urgent: {
    icon: AlertTriangle,
    color: "text-red-400",
    badge: "bg-red-400/10 text-red-400 border-red-400/20",
    border: "border-l-2 border-l-red-400",
  },
  active: {
    icon: Loader,
    color: "text-amber-400",
    badge: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    border: "border-l-2 border-l-amber-400",
  },
  blocked: {
    icon: Ban,
    color: "text-orange-400",
    badge: "bg-orange-400/10 text-orange-400 border-orange-400/20",
    border: "border-l-2 border-l-orange-400",
  },
  scheduled: {
    icon: Clock,
    color: "text-blue-400",
    badge: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    border: "border-l-2 border-l-blue-400",
  },
  backlog: {
    icon: Archive,
    color: "text-zinc-400",
    badge: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
    border: "border-l-2 border-l-zinc-600",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    badge: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    border: "border-l-2 border-l-emerald-400",
  },
};

function StatusIcon({ status }: { status: Task["status"] }) {
  switch (status) {
    case "done":
      return <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />;
    case "partial":
      return <CircleDot size={14} className="text-amber-400 shrink-0" />;
    case "open":
      return <Circle size={14} className="text-zinc-500 shrink-0" />;
  }
}

function TaskItem({ task }: { task: Task }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = !!task.detail;

  return (
    <div className="flex gap-2.5 py-1.5">
      <div className="flex items-center h-6 shrink-0"><StatusIcon status={task.status} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span
            className={`text-sm flex-1 ${
              task.status === "done" ? "text-zinc-500 line-through" : "text-zinc-200"
            }`}
          >
            {task.text}
          </span>
          {hasDetail && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 mt-0.5"
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          )}
        </div>
        {hasDetail && expanded && (
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{task.detail}</p>
        )}
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: Section }) {
  const config = sectionConfig[section.id] || sectionConfig.backlog;
  const Icon = config.icon;
  const [collapsed, setCollapsed] = useState(section.id === "completed");
  const Chevron = collapsed ? ChevronRight : ChevronDown;

  return (
    <div className={`border border-zinc-800/50 rounded-lg bg-zinc-900/30 ${config.border}`}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/20 transition-colors rounded-lg"
      >
        <Icon size={16} className={config.color} />
        <span className="text-sm font-medium text-zinc-200 flex-1 text-left">
          {section.title}
        </span>
        <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${config.badge}`}>
          {section.tasks.length}
        </span>
        <Chevron size={14} className="text-zinc-600" />
      </button>
      {!collapsed && section.tasks.length > 0 && (
        <div className="px-4 pb-3 border-t border-zinc-800/30">
          <div className="pt-2">
            {section.tasks.map((task, i) => (
              <TaskItem key={i} task={task} />
            ))}
          </div>
        </div>
      )}
      {!collapsed && section.tasks.length === 0 && (
        <div className="px-4 pb-3 border-t border-zinc-800/30">
          <p className="text-xs text-zinc-600 pt-2 italic">Nothing here</p>
        </div>
      )}
    </div>
  );
}

function RecurringStrip({ tasks }: { tasks: RecurringTask[] }) {
  const [open, setOpen] = useState(false);
  if (tasks.length === 0) return null;

  return (
    <div className="border border-zinc-800/30 rounded-lg bg-zinc-900/20">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/20 transition-colors rounded-lg"
      >
        <Repeat size={14} className="text-zinc-500" />
        <span className="text-xs font-medium text-zinc-500 flex-1 text-left">Recurring</span>
        <span className="text-xs font-mono text-zinc-600">{tasks.length}</span>
        {open ? (
          <ChevronDown size={12} className="text-zinc-600" />
        ) : (
          <ChevronRight size={12} className="text-zinc-600" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-zinc-800/20">
          <table className="w-full mt-3">
            <thead>
              <tr className="text-xs text-zinc-500">
                <th className="text-left font-medium pb-2">Task Name</th>
                <th className="text-left font-medium pb-2">Runs</th>
                <th className="text-left font-medium pb-2">Execution</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, i) => (
                <tr key={i} className="text-xs">
                  <td className="text-left text-zinc-300 py-2 pr-4">{t.task}</td>
                  <td className="text-left text-zinc-500 py-2 pr-4 whitespace-nowrap">{t.schedule}</td>
                  <td className="text-left text-zinc-600 py-2">{t.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function TasksView({ initialData }: { initialData: ParsedTasks }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  // Compute stats
  const stats = useMemo(() => {
    let open = 0;
    let blocked = 0;
    let completed = 0;
    for (const section of data.sections) {
      if (section.id === "blocked") {
        blocked += section.tasks.length;
      }
      for (const task of section.tasks) {
        if (task.status === "done") completed++;
        else open++;
      }
    }
    return { open, blocked, completed };
  }, [data]);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Tasks"
        subtitle={
          <span className="flex items-center gap-3 text-xs">
            <span>
              <span className="font-mono font-medium text-zinc-300">{stats.open}</span>{" "}
              <span className="text-zinc-500">open</span>
            </span>
            <span>
              <span className="font-mono font-medium text-orange-400">{stats.blocked}</span>{" "}
              <span className="text-zinc-500">blocked</span>
            </span>
            <span>
              <span className="font-mono font-medium text-emerald-400">{stats.completed}</span>{" "}
              <span className="text-zinc-500">completed</span>
            </span>
          </span>
        }
        actions={
          <button
            onClick={refresh}
            disabled={loading}
            className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        }
      />
      <div className="space-y-3">
        {data.sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
        <RecurringStrip tasks={data.recurring} />
      </div>
    </div>
  );
}
