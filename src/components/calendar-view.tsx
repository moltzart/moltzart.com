"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import type { DbCronJob, DbJobRun } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";

// --- Types ---

interface CalendarData {
  crons: DbCronJob[];
  jobRuns: DbJobRun[];
}

interface CalendarViewProps {
  initialData: CalendarData;
  initialStart: string;
}

type RunStatus = "success" | "error" | "missed" | "upcoming" | "running";

interface DayEvent {
  name: string;
  jobId: string;
  time: string;
  sortKey: string;
  status: RunStatus;
  summary?: string;
}

// --- Status indicator styles ---

const STATUS_INDICATOR: Record<RunStatus, { dot: string; border: string }> = {
  success: { dot: "bg-emerald-400", border: "border-emerald-400/20" },
  error: { dot: "bg-red-400", border: "border-red-400/20" },
  missed: { dot: "bg-amber-400", border: "border-amber-400/20" },
  running: { dot: "bg-blue-400 animate-pulse", border: "border-blue-400/20" },
  upcoming: { dot: "bg-zinc-600", border: "border-zinc-800/40" },
};

// --- Date helpers (Monday-start week) ---

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return fmtDate(d);
}

function getWeekDays(startDate: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
}

function formatWeekLabel(startDate: string): string {
  const start = new Date(startDate + "T12:00:00");
  const end = new Date(startDate + "T12:00:00");
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (start.getMonth() !== end.getMonth()) {
    return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}, ${start.getFullYear()}`;
  }
  return `${start.toLocaleDateString("en-US", { month: "short" })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
}

// --- Cron field parser (bypasses cron-parser DST bug) ---

function parseCronField(field: string, min: number, max: number): number[] {
  if (field === "*") return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2));
    const result: number[] = [];
    for (let i = min; i <= max; i += step) result.push(i);
    return result;
  }
  if (field.includes(",")) return field.split(",").map(Number);
  if (field.includes("-")) {
    const [lo, hi] = field.split("-").map(Number);
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }
  return [parseInt(field)];
}

function cronMatchesDay(dowField: string, jsDay: number): boolean {
  // JS: 0=Sun, cron: 0=Sun (or 7=Sun)
  const dows = parseCronField(dowField, 0, 6);
  return dows.includes(jsDay) || (jsDay === 0 && dows.includes(7));
}

function formatHM(h: number, m: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}:00 ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function sortKeyHM(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface CronRun {
  dateKey: string;
  hour: number;
  minute: number;
}

function expandCron(expr: string, weekDays: string[]): CronRun[] {
  const [minField, hourField, , , dowField] = expr.split(" ");
  const minutes = parseCronField(minField, 0, 59);
  const hours = parseCronField(hourField, 0, 23);
  const runs: CronRun[] = [];

  for (const dayStr of weekDays) {
    const d = new Date(dayStr + "T12:00:00");
    if (!cronMatchesDay(dowField, d.getDay())) continue;
    for (const h of hours) {
      for (const m of minutes) {
        runs.push({ dateKey: dayStr, hour: h, minute: m });
      }
    }
  }
  return runs;
}

// --- Cron expansion with run status ---

interface AlwaysRunningJob {
  name: string;
  frequency: string;
}

function categorizeCrons(
  crons: DbCronJob[],
  jobRuns: DbJobRun[],
  weekDays: string[]
): { alwaysRunning: AlwaysRunningJob[]; scheduled: Map<string, DayEvent[]> } {
  const alwaysRunning: AlwaysRunningJob[] = [];
  const scheduled = new Map<string, DayEvent[]>();
  const todayStr = fmtDate(new Date());
  const nowH = new Date().getHours();
  const nowM = new Date().getMinutes();

  // Index job runs by job_id + date for quick lookup
  const runIndex = new Map<string, DbJobRun[]>();
  for (const run of jobRuns) {
    const dateKey = run.started_at.slice(0, 10);
    const key = `${run.job_id}:${dateKey}`;
    if (!runIndex.has(key)) runIndex.set(key, []);
    runIndex.get(key)!.push(run);
  }

  for (const job of crons) {
    if (!job.enabled) continue;

    const weekRuns = expandCron(job.schedule_expr, weekDays);

    if (weekRuns.length > 100) {
      const perDay = Math.round(weekRuns.length / 7);
      const freq = perDay >= 24 ? `Every ${Math.round((24 * 60) / perDay)} min` : `${perDay}x daily`;
      alwaysRunning.push({ name: job.name, frequency: freq });
      continue;
    }

    for (const run of weekRuns) {
      if (!scheduled.has(run.dateKey)) scheduled.set(run.dateKey, []);

      const matchKey = `${job.id}:${run.dateKey}`;
      const matchingRuns = runIndex.get(matchKey) || [];
      let status: RunStatus;
      let summary: string | undefined;

      const isFuture = run.dateKey > todayStr ||
        (run.dateKey === todayStr && (run.hour > nowH || (run.hour === nowH && run.minute > nowM)));

      if (isFuture) {
        status = "upcoming";
      } else if (matchingRuns.length > 0) {
        const bestRun = matchingRuns[0];
        status = bestRun.status as RunStatus;
        if (status !== "success" && status !== "error" && status !== "running") {
          status = "success";
        }
        summary = bestRun.summary || undefined;
      } else {
        status = "missed";
      }

      scheduled.get(run.dateKey)!.push({
        name: job.name,
        jobId: job.id,
        time: formatHM(run.hour, run.minute),
        sortKey: sortKeyHM(run.hour, run.minute),
        status,
        summary,
      });
    }
  }

  for (const [, events] of scheduled) {
    events.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }

  return { alwaysRunning, scheduled };
}

// --- Component ---

export function CalendarView({ initialData, initialStart }: CalendarViewProps) {
  const [data, setData] = useState<CalendarData>(initialData);
  const [weekStart, setWeekStart] = useState(initialStart);
  const [loading, setLoading] = useState(false);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const todayKey = fmtDate(new Date());

  const loadWeek = useCallback(async (start: string) => {
    setWeekStart(start);
    setLoading(true);
    try {
      const end = addDays(start, 6);
      const res = await fetch(`/api/admin/calendar?start=${start}&end=${end}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const goPrev = useCallback(() => loadWeek(addDays(weekStart, -7)), [weekStart, loadWeek]);
  const goNext = useCallback(() => loadWeek(addDays(weekStart, 7)), [weekStart, loadWeek]);
  const refresh = useCallback(() => loadWeek(weekStart), [weekStart, loadWeek]);

  const { alwaysRunning, scheduled } = useMemo(
    () => categorizeCrons(data.crons, data.jobRuns, weekDays),
    [data.crons, data.jobRuns, weekDays]
  );
  const iconButtonClass =
    "inline-flex size-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800/40 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/60 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

  return (
    <div className="space-y-4">
      <PageHeader title="Calendar" subtitle={formatWeekLabel(weekStart)}>
        <button
          onClick={refresh}
          disabled={loading}
          className={iconButtonClass}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button
          onClick={goPrev}
          className={iconButtonClass}
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={goNext}
          className={iconButtonClass}
        >
          <ChevronRight className="size-4" />
        </button>
      </PageHeader>

      {/* Always On + Legend row */}
      <div className="flex items-center justify-between gap-4">
        {alwaysRunning.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="type-badge text-zinc-600 shrink-0">Always On</span>
            <div className="flex flex-wrap gap-2">
              {alwaysRunning.map((job) => (
                <span
                  key={job.name}
                  className="inline-flex items-center rounded-full border border-zinc-800 px-2 py-1 type-badge text-zinc-500 bg-zinc-900/50"
                >
                  {job.name} · {job.frequency}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-4 type-body-sm text-zinc-500">
          <span className="flex items-center gap-2"><span className="inline-block size-2 rounded-full bg-emerald-400" /> Ran</span>
          <span className="flex items-center gap-2"><span className="inline-block size-2 rounded-full bg-red-400" /> Error</span>
          <span className="flex items-center gap-2"><span className="inline-block size-2 rounded-full bg-amber-400" /> Missed</span>
          <span className="flex items-center gap-2"><span className="inline-block size-2 rounded-full bg-zinc-600" /> Upcoming</span>
        </div>
      </div>

      {/* Weekly columns */}
      <Panel className={`flex flex-col h-[calc(100svh-10rem)] overflow-hidden ${loading ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-zinc-800/30 h-full">
          {weekDays.map((dateKey, idx) => {
            const d = new Date(dateKey + "T12:00:00");
            const isToday = dateKey === todayKey;
            const isPast = dateKey < todayKey;
            const events = scheduled.get(dateKey) || [];

            return (
              <div key={dateKey} className={`bg-zinc-950/40 flex flex-col min-h-0 ${isPast ? "opacity-50" : ""}`}>
                {/* Day header */}
                <div className={`px-3 py-2 border-b border-zinc-800/40 flex items-center justify-between ${isToday ? "bg-zinc-900/50" : ""}`}>
                  <span className={`text-sm font-semibold ${isToday ? "text-teal-400" : "text-zinc-300"}`}>
                    {WEEKDAYS[idx]}
                  </span>
                  <span className={`text-sm ${isToday ? "text-teal-400/70" : "text-zinc-600"}`}>
                    {d.getDate()}
                  </span>
                </div>

                {/* Event cards */}
                <div className="flex-1 p-2 space-y-1 min-h-0 overflow-y-auto">
                  {events.map((ev, i) => (
                    <EventCard key={`${ev.jobId}-${ev.sortKey}-${i}`} event={ev} />
                  ))}
                  {events.length === 0 && (
                    <div className="type-badge text-zinc-700 text-center py-4">—</div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function EventCard({ event }: { event: DayEvent }) {
  const si = STATUS_INDICATOR[event.status];

  return (
    <div
      className={`rounded-lg bg-zinc-900/30 border p-2 ${si.border}`}
      title={event.summary || undefined}
    >
      <div className="flex items-center gap-2">
        <span className={`inline-block size-1.5 rounded-full shrink-0 ${si.dot}`} />
        <span className="type-body-sm font-medium truncate text-zinc-200">
          {event.name}
        </span>
      </div>
      <div className="type-badge text-zinc-500 mt-1 pl-3">
        {event.time}
      </div>
    </div>
  );
}
