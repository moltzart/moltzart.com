"use client";

import { useState, useEffect, useCallback } from "react";
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
  Lock,
  Repeat,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Panel } from "@/components/admin/panel";

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

interface ParsedTasks {
  sections: Section[];
  recurring: RecurringTask[];
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
            task.status === "done"
              ? "text-zinc-500 line-through"
              : "text-zinc-200"
          }`}
        >
          {task.text}
        </span>
        {task.detail && (
          <p className="text-xs text-zinc-500 mt-0.5">{task.detail}</p>
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
    <Panel>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/20 transition-colors rounded-lg"
      >
        <Icon size={16} className={config.color} />
        <span className="text-sm font-medium text-zinc-200 flex-1 text-left">
          {section.title}
        </span>
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded-full border ${config.badge}`}
        >
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
    </Panel>
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
        <span className="text-xs font-medium text-zinc-500 flex-1 text-left">
          Recurring
        </span>
        <span className="text-xs font-mono text-zinc-600">{tasks.length}</span>
        {open ? (
          <ChevronDown size={12} className="text-zinc-600" />
        ) : (
          <ChevronRight size={12} className="text-zinc-600" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-zinc-800/20">
          <div className="pt-2 space-y-1.5">
            {tasks.map((t, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-zinc-300 flex-1">{t.task}</span>
                <span className="text-zinc-500 font-mono">{t.schedule}</span>
                <span className="text-zinc-600">{t.method}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Tasks() {
  const [password, setPassword] = useState("");
  const [data, setData] = useState<ParsedTasks | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTasks = useCallback(async (pw: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.status === 401) {
        setError("Wrong password");
        setAuthed(false);
        sessionStorage.removeItem("tasks_pw");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError("Failed to load tasks");
        setLoading(false);
        return;
      }
      const parsed = await res.json();
      setData(parsed);
      setAuthed(true);
      setLastUpdated(new Date());
      sessionStorage.setItem("tasks_pw", pw);
    } catch {
      setError("Connection error");
    }
    setLoading(false);
    setChecking(false);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("tasks_pw");
    if (saved) {
      setPassword(saved);
      fetchTasks(saved);
    } else {
      setChecking(false);
    }
  }, [fetchTasks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) fetchTasks(password.trim());
  };

  if (checking) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <Lock size={18} className="text-zinc-500" />
            <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? "Loading..." : "View Tasks"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-zinc-600 text-xs font-mono">
                {lastUpdated.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <button
              onClick={() => fetchTasks(password)}
              disabled={loading}
              className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                size={14}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>

        {data && (
          <div className="space-y-3">
            {data.sections.map((section) => (
              <SectionCard key={section.id} section={section} />
            ))}
            <RecurringStrip tasks={data.recurring} />
          </div>
        )}
      </div>
    </div>
  );
}
