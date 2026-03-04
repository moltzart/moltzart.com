"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CronExpressionParser } from "cron-parser";
import { StatusDot } from "@/components/admin/status-dot";
import type {
  DbCronJob,
  DbTask,
  DbXDraft,
  DbNewsletterArticle,
} from "@/lib/db";

interface CalendarData {
  crons: DbCronJob[];
  tasks: DbTask[];
  drafts: DbXDraft[];
  newsletter: DbNewsletterArticle[];
}

interface CalendarViewProps {
  initialData: CalendarData;
  initialYear: number;
  initialMonth: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function cronStatusVariant(status: string | null): "complete" | "urgent" | "neutral" {
  if (!status) return "neutral";
  if (status === "success" || status === "ok") return "complete";
  if (status === "error" || status === "fail" || status === "failed") return "urgent";
  return "neutral";
}

function taskStatusVariant(status: string): "complete" | "active" | "blocked" | "neutral" {
  if (status === "done") return "complete";
  if (status === "in_progress") return "active";
  if (status === "blocked") return "blocked";
  return "neutral";
}

function expandCronRuns(
  crons: DbCronJob[],
  year: number,
  month: number
): Map<string, { job: DbCronJob; future: boolean }[]> {
  const map = new Map<string, { job: DbCronJob; future: boolean }[]>();
  const now = new Date();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  for (const job of crons) {
    if (!job.enabled) continue;
    try {
      const interval = CronExpressionParser.parse(job.schedule_expr, {
        currentDate: monthStart,
        endDate: monthEnd,
        tz: job.schedule_tz,
      });
      while (true) {
        try {
          const next = interval.next();
          const key = toDateKey(next.toDate());
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push({ job, future: next.toDate() > now });
        } catch {
          break;
        }
      }
    } catch {
      // invalid cron expression, skip
    }
  }
  return map;
}

export function CalendarView({ initialData, initialYear, initialMonth }: CalendarViewProps) {
  const [data, setData] = useState<CalendarData>(initialData);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMonth = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/calendar?year=${y}&month=${m}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
    setYear(y);
    setMonth(m);
    setSelectedDay(null);
  }, []);

  const goToday = useCallback(() => {
    const now = new Date();
    loadMonth(now.getFullYear(), now.getMonth() + 1);
  }, [loadMonth]);

  const goPrev = useCallback(() => {
    const m = month === 1 ? 12 : month - 1;
    const y = month === 1 ? year - 1 : year;
    loadMonth(y, m);
  }, [year, month, loadMonth]);

  const goNext = useCallback(() => {
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    loadMonth(y, m);
  }, [year, month, loadMonth]);

  // Build day-indexed maps
  const cronRuns = useMemo(() => expandCronRuns(data.crons, year, month), [data.crons, year, month]);

  const tasksByDay = useMemo(() => {
    const m = new Map<string, DbTask[]>();
    for (const t of data.tasks) {
      const key = t.due_date || t.created_at.slice(0, 10);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(t);
    }
    return m;
  }, [data.tasks]);

  const draftsByDay = useMemo(() => {
    const m = new Map<string, DbXDraft[]>();
    for (const d of data.drafts) {
      const key = (d.posted_at || d.created_at).slice(0, 10);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(d);
    }
    return m;
  }, [data.drafts]);

  const newsletterByDay = useMemo(() => {
    const m = new Map<string, DbNewsletterArticle[]>();
    for (const a of data.newsletter) {
      if (!m.has(a.digest_date)) m.set(a.digest_date, []);
      m.get(a.digest_date)!.push(a);
    }
    return m;
  }, [data.newsletter]);

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const lastDate = new Date(year, month, 0).getDate();
  const startPad = firstDay.getDay(); // 0=Sun
  const totalCells = startPad + lastDate;
  const rows = Math.ceil(totalCells / 7);

  const todayKey = toDateKey(new Date());
  const monthLabel = firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-100">{monthLabel}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="rounded-md border border-zinc-800 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goPrev}
            className="rounded-md border border-zinc-800 p-1 text-zinc-400 hover:bg-zinc-800/50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goNext}
            className="rounded-md border border-zinc-800 p-1 text-zinc-400 hover:bg-zinc-800/50 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className={`rounded-lg border border-zinc-800/50 overflow-hidden ${loading ? "opacity-50" : ""}`}>
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-zinc-800/50">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-1.5 text-center text-xs font-medium text-zinc-500">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="grid grid-cols-7 border-b border-zinc-800/30 last:border-b-0">
            {Array.from({ length: 7 }, (_, col) => {
              const cellIndex = row * 7 + col;
              const dayNum = cellIndex - startPad + 1;
              const isInMonth = dayNum >= 1 && dayNum <= lastDate;

              if (!isInMonth) {
                return <div key={col} className="min-h-[72px] bg-zinc-950/50" />;
              }

              const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDay;

              const cronCount = cronRuns.get(dateKey)?.length || 0;
              const taskCount = tasksByDay.get(dateKey)?.length || 0;
              const draftCount = draftsByDay.get(dateKey)?.length || 0;
              const nlCount = newsletterByDay.get(dateKey)?.length || 0;
              const hasContent = cronCount + taskCount + draftCount + nlCount > 0;

              return (
                <button
                  key={col}
                  onClick={() => setSelectedDay(isSelected ? null : dateKey)}
                  className={`min-h-[72px] p-1.5 text-left transition-colors border-r border-zinc-800/20 last:border-r-0 ${
                    isSelected
                      ? "bg-zinc-800/60"
                      : hasContent
                        ? "hover:bg-zinc-800/40"
                        : "hover:bg-zinc-900/50"
                  }`}
                >
                  <div
                    className={`text-xs mb-1 ${
                      isToday
                        ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-zinc-950 font-bold"
                        : "text-zinc-400"
                    }`}
                  >
                    {dayNum}
                  </div>
                  {hasContent && (
                    <div className="flex flex-wrap gap-1">
                      {cronCount > 0 && <CountPill count={cronCount} color="bg-blue-500/80" />}
                      {taskCount > 0 && <CountPill count={taskCount} color="bg-emerald-500/80" />}
                      {draftCount > 0 && <CountPill count={draftCount} color="bg-purple-500/80" />}
                      {nlCount > 0 && <CountPill count={nlCount} color="bg-orange-500/80" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-500/80" /> Crons</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500/80" /> Tasks</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-purple-500/80" /> Drafts</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-orange-500/80" /> Newsletter</span>
      </div>

      {/* Day detail */}
      {selectedDay && (
        <DayDetail
          dateKey={selectedDay}
          cronEntries={cronRuns.get(selectedDay) || []}
          tasks={tasksByDay.get(selectedDay) || []}
          drafts={draftsByDay.get(selectedDay) || []}
          newsletter={newsletterByDay.get(selectedDay) || []}
        />
      )}
    </div>
  );
}

function CountPill({ count, color }: { count: number; color: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white ${color}`}>
      {count}
    </span>
  );
}

function DayDetail({
  dateKey,
  cronEntries,
  tasks,
  drafts,
  newsletter,
}: {
  dateKey: string;
  cronEntries: { job: DbCronJob; future: boolean }[];
  tasks: DbTask[];
  drafts: DbXDraft[];
  newsletter: DbNewsletterArticle[];
}) {
  const dateLabel = new Date(dateKey + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const isEmpty = cronEntries.length + tasks.length + drafts.length + newsletter.length === 0;

  return (
    <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4 space-y-4">
      <h2 className="text-sm font-medium text-zinc-200">{dateLabel}</h2>

      {isEmpty && <p className="text-sm text-zinc-500">No activity this day.</p>}

      {/* Crons */}
      {cronEntries.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-blue-400 mb-2">Cron Jobs ({cronEntries.length})</h3>
          <div className="space-y-1.5">
            {cronEntries.map(({ job, future }) => (
              <div
                key={job.id}
                className={`flex items-center gap-2 text-sm ${future ? "opacity-50" : ""}`}
              >
                <StatusDot variant={cronStatusVariant(job.last_status)} />
                <span className="text-zinc-200">{job.name}</span>
                {job.agent_id && (
                  <span className="text-xs text-zinc-500">{job.agent_id}</span>
                )}
                {job.last_duration_ms != null && !future && (
                  <span className="text-xs text-zinc-500">
                    {job.last_duration_ms < 1000
                      ? `${job.last_duration_ms}ms`
                      : `${(job.last_duration_ms / 1000).toFixed(1)}s`}
                  </span>
                )}
                {future && <span className="text-xs text-zinc-600">scheduled</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-emerald-400 mb-2">Tasks ({tasks.length})</h3>
          <div className="space-y-1.5">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <StatusDot variant={taskStatusVariant(t.status)} />
                <span className="text-zinc-200">{t.title}</span>
                <span className="text-xs text-zinc-500">{t.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-purple-400 mb-2">X Drafts ({drafts.length})</h3>
          <div className="space-y-1.5">
            {drafts.map((d) => (
              <div key={d.id} className="flex items-start gap-2 text-sm">
                <StatusDot
                  variant={d.status === "posted" ? "complete" : d.status === "approved" ? "scheduled" : "neutral"}
                  className="mt-1"
                />
                <span className="text-zinc-300 line-clamp-1">{d.text}</span>
                {d.tweet_url && (
                  <a
                    href={d.tweet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-teal-400 hover:underline"
                  >
                    view
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Newsletter */}
      {newsletter.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-orange-400 mb-2">Newsletter ({newsletter.length} articles)</h3>
          <div className="space-y-1.5">
            {newsletter.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span className="text-zinc-300">{a.title}</span>
                {a.category && (
                  <span className="text-xs text-zinc-500">{a.category}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
