"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Zap } from "lucide-react";
import { CronExpressionParser } from "cron-parser";
import type { DbCronJob, DbJobRun } from "@/lib/db";

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
  colorIdx: number;
  status: RunStatus;
  summary?: string;
}

// --- Color palette for event cards ---

const CARD_COLORS = [
  "text-emerald-400",
  "text-amber-400",
  "text-blue-400",
  "text-rose-400",
  "text-purple-400",
  "text-teal-400",
  "text-orange-400",
  "text-cyan-400",
  "text-pink-400",
  "text-lime-400",
];

const PILL_COLORS = [
  "text-emerald-400 border-emerald-400/30",
  "text-amber-400 border-amber-400/30",
  "text-blue-400 border-blue-400/30",
  "text-rose-400 border-rose-400/30",
  "text-purple-400 border-purple-400/30",
  "text-teal-400 border-teal-400/30",
  "text-orange-400 border-orange-400/30",
  "text-cyan-400 border-cyan-400/30",
  "text-pink-400 border-pink-400/30",
  "text-lime-400 border-lime-400/30",
];

// --- Status indicator styles ---

const STATUS_INDICATOR: Record<RunStatus, { dot: string; border: string; opacity: string }> = {
  success: { dot: "bg-emerald-400", border: "border-emerald-400/20", opacity: "" },
  error: { dot: "bg-red-400", border: "border-red-400/20", opacity: "" },
  missed: { dot: "bg-amber-400", border: "border-amber-400/20", opacity: "" },
  running: { dot: "bg-blue-400 animate-pulse", border: "border-blue-400/20", opacity: "" },
  upcoming: { dot: "bg-zinc-600", border: "border-zinc-800/40", opacity: "opacity-40" },
};

// --- Date helpers ---

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - d.getDay());
  return fmtDate(d);
}

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}:00 ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatTimeSortKey(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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

// --- Cron expansion with run status ---

interface AlwaysRunningJob {
  name: string;
  frequency: string;
  colorIdx: number;
}

function categorizeCrons(
  crons: DbCronJob[],
  jobRuns: DbJobRun[],
  weekDays: string[]
): { alwaysRunning: AlwaysRunningJob[]; scheduled: Map<string, DayEvent[]> } {
  const alwaysRunning: AlwaysRunningJob[] = [];
  const scheduled = new Map<string, DayEvent[]>();
  const now = new Date();
  const weekStart = new Date(weekDays[0] + "T00:00:00");
  weekStart.setDate(weekStart.getDate() - 1);
  const weekEnd = new Date(weekDays[6] + "T23:59:59");
  weekEnd.setDate(weekEnd.getDate() + 1);
  const validDays = new Set(weekDays);

  // Index job runs by job_id + date for quick lookup
  const runIndex = new Map<string, DbJobRun[]>();
  for (const run of jobRuns) {
    const dateKey = run.started_at.slice(0, 10);
    const key = `${run.job_id}:${dateKey}`;
    if (!runIndex.has(key)) runIndex.set(key, []);
    runIndex.get(key)!.push(run);
  }

  // Build stable color map
  const colorMap = new Map<string, number>();
  const sortedNames = [...new Set(crons.map((j) => j.name))].sort();
  sortedNames.forEach((name, i) => colorMap.set(name, i % CARD_COLORS.length));

  for (const job of crons) {
    if (!job.enabled) continue;
    const colorIdx = colorMap.get(job.name) ?? 0;

    let runs: Date[] = [];
    try {
      const interval = CronExpressionParser.parse(job.schedule_expr, {
        currentDate: weekStart,
        endDate: weekEnd,
        tz: job.schedule_tz,
      });
      while (true) {
        try {
          runs.push(interval.next().toDate());
        } catch {
          break;
        }
      }
    } catch {
      continue;
    }

    const weekRuns = runs.filter((r) => validDays.has(fmtDate(r)));
    if (weekRuns.length > 100) {
      const perDay = Math.round(weekRuns.length / 7);
      const freq = perDay >= 24 ? `Every ${Math.round((24 * 60) / perDay)} min` : `${perDay}x daily`;
      alwaysRunning.push({ name: job.name, frequency: freq, colorIdx });
      continue;
    }

    for (const runDate of weekRuns) {
      const dateKey = fmtDate(runDate);
      if (!scheduled.has(dateKey)) scheduled.set(dateKey, []);

      // Determine run status
      const matchKey = `${job.id}:${dateKey}`;
      const matchingRuns = runIndex.get(matchKey) || [];
      let status: RunStatus;
      let summary: string | undefined;

      if (runDate > now) {
        status = "upcoming";
      } else if (matchingRuns.length > 0) {
        // Find the best matching run (closest to expected time)
        const bestRun = matchingRuns.reduce((best, r) => {
          const diff = Math.abs(new Date(r.started_at).getTime() - runDate.getTime());
          const bestDiff = Math.abs(new Date(best.started_at).getTime() - runDate.getTime());
          return diff < bestDiff ? r : best;
        });
        status = bestRun.status as RunStatus;
        if (status !== "success" && status !== "error" && status !== "running") {
          status = "success"; // treat unknown statuses as success
        }
        summary = bestRun.summary || undefined;
      } else {
        status = "missed";
      }

      scheduled.get(dateKey)!.push({
        name: job.name,
        jobId: job.id,
        time: formatTime(runDate),
        sortKey: formatTimeSortKey(runDate),
        colorIdx,
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
  const goToday = useCallback(() => loadWeek(getWeekStart(fmtDate(new Date()))), [loadWeek]);
  const refresh = useCallback(() => loadWeek(weekStart), [weekStart, loadWeek]);

  const { alwaysRunning, scheduled } = useMemo(
    () => categorizeCrons(data.crons, data.jobRuns, weekDays),
    [data.crons, data.jobRuns, weekDays]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Calendar</h1>
          <p className="text-sm text-zinc-500">{formatWeekLabel(weekStart)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={goToday} className="rounded-md border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700/80 transition-colors">
            Week
          </button>
          <button onClick={goToday} className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800/50 transition-colors">
            Today
          </button>
          <button onClick={refresh} className="rounded-md border border-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-800/50 transition-colors">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={goPrev} className="rounded-md border border-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-800/50 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={goNext} className="rounded-md border border-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-800/50 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Ran</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-red-400" /> Error</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Missed</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-zinc-600" /> Upcoming</span>
      </div>

      {/* Always Running */}
      {alwaysRunning.length > 0 && (
        <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-zinc-200">Always Running</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {alwaysRunning.map((job) => (
              <span
                key={job.name}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${PILL_COLORS[job.colorIdx]} bg-zinc-800/50`}
              >
                {job.name} &middot; {job.frequency}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weekly columns */}
      <div className={`grid grid-cols-7 gap-px bg-zinc-800/30 rounded-lg border border-zinc-800/50 overflow-hidden ${loading ? "opacity-50 pointer-events-none" : ""}`}>
        {weekDays.map((dateKey) => {
          const d = new Date(dateKey + "T12:00:00");
          const isToday = dateKey === todayKey;
          const events = scheduled.get(dateKey) || [];

          return (
            <div key={dateKey} className="bg-zinc-950 flex flex-col min-h-0">
              {/* Day header */}
              <div className={`px-3 py-2.5 border-b border-zinc-800/50 ${isToday ? "bg-zinc-900/50" : ""}`}>
                <span className={`text-sm font-semibold ${isToday ? "text-teal-400" : "text-zinc-300"}`}>
                  {WEEKDAYS[d.getDay()]}
                </span>
              </div>

              {/* Event cards */}
              <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto max-h-[calc(100vh-18rem)]">
                {events.map((ev, i) => (
                  <EventCard key={`${ev.jobId}-${ev.sortKey}-${i}`} event={ev} />
                ))}
                {events.length === 0 && (
                  <div className="text-xs text-zinc-700 text-center py-4">—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: DayEvent }) {
  const colorClass = CARD_COLORS[event.colorIdx];
  const si = STATUS_INDICATOR[event.status];

  return (
    <div
      className={`rounded-md bg-zinc-900/80 border px-2.5 py-2 ${si.border} ${si.opacity}`}
      title={event.summary || undefined}
    >
      <div className="flex items-center gap-1.5">
        <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${si.dot}`} />
        <span className={`text-xs font-medium truncate ${colorClass}`}>
          {event.name}
        </span>
      </div>
      <div className="text-[10px] text-zinc-500 mt-0.5 pl-3">
        {event.time}
      </div>
    </div>
  );
}
