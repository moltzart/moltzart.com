"use client";

import { useState } from "react";
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
  { icon: typeof AlertTriangle; color: string; badge: string }
> = {
  urgent: {
    icon: AlertTriangle,
    color: "text-red-400",
    badge: "bg-red-400/10 text-red-400 border-red-400/20",
  },
  active: {
    icon: Loader,
    color: "text-amber-400",
    badge: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  },
  blocked: {
    icon: Ban,
    color: "text-orange-400",
    badge: "bg-orange-400/10 text-orange-400 border-orange-400/20",
  },
  scheduled: {
    icon: Clock,
    color: "text-blue-400",
    badge: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  },
  backlog: {
    icon: Archive,
    color: "text-zinc-400",
    badge: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    badge: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  },
};

function StatusIcon({ status }: { status: Task["status"] }) {
  switch (status) {
    case "done":
      return <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />;
    case "partial":
      return <CircleDot size={14} className="text-amber-400 shrink-0 mt-0.5" />;
    case "open":
      return <Circle size={14} className="text-zinc-500 shrink-0 mt-0.5" />;
  }
}

function TaskItem({ task }: { task: Task }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <StatusIcon status={task.status} />
      <div className="min-w-0">
        <span
          className={`text-sm ${
            task.status === "done" ? "text-zinc-500 line-through" : "text-zinc-200"
          }`}
        >
          {task.text}
        </span>
        {task.detail && <p className="text-xs text-zinc-500 mt-0.5">{task.detail}</p>}
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
    <div className="border border-zinc-800/50 rounded-lg bg-zinc-900/30">
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

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="space-y-3">
        {data.sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
        <RecurringStrip tasks={data.recurring} />
      </div>
    </div>
  );
}
