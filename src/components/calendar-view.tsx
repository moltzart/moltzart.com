"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import type { DbCronJob, DbJobRun } from "@/lib/db";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import { Panel } from "@/components/admin/panel";
import { Badge } from "@/components/ui/badge";
import { getScheduledRunStatus, isHighFrequencyCron, parseCronField, cronMatchesDay, type CronRunStatus } from "@/lib/cron-health";
import type { OpenClawCronMeta } from "@/lib/openclaw-crons";

// --- Types ---

interface CalendarData {
  crons: DbCronJob[];
  jobRuns: DbJobRun[];
  meta: OpenClawCronMeta;
}

interface CalendarViewProps {
  initialData: CalendarData;
  initialStart: string;
}

interface DayEvent {
  name: string;
  jobId: string;
  agentId: string | null;
  time: string;
  sortKey: string;
  status: CronRunStatus;
  summary?: string;
}

// --- Status indicator styles ---

const STATUS_INDICATOR: Record<CronRunStatus, { dot: string; border: string }> = {
  success: { dot: "bg-emerald-400", border: "border-emerald-400/20" },
  error: { dot: "bg-red-400", border: "border-red-400/20" },
  missed: { dot: "bg-amber-400", border: "border-amber-400/20" },
  running: { dot: "bg-blue-400 animate-pulse", border: "border-blue-400/20" },
  upcoming: { dot: "bg-zinc-600", border: "border-zinc-800/40" },
  unknown: { dot: "bg-zinc-500", border: "border-zinc-700/50" },
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

function formatHM(h: number, m: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}:00${ampm}` : `${h12}:${String(m).padStart(2, "0")}${ampm}`;
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

const AGENT_META = {
  moltzart: {
    label: "Moltzart",
    short: "MO",
    badge: "border-zinc-700/60 bg-zinc-900/60 text-zinc-300",
  },
  scout: {
    label: "Scout",
    short: "SC",
    badge: "border-zinc-700/60 bg-zinc-900/60 text-zinc-300",
  },
  pica: {
    label: "Pica",
    short: "PI",
    badge: "border-zinc-700/60 bg-zinc-900/60 text-zinc-300",
  },
  hawk: {
    label: "Hawk",
    short: "HK",
    badge: "border-zinc-700/60 bg-zinc-900/60 text-zinc-300",
  },
  sigmund: {
    label: "Sigmund",
    short: "SG",
    badge: "border-zinc-700/60 bg-zinc-900/60 text-zinc-300",
  },
  system: {
    label: "Unassigned",
    short: "UN",
    badge: "border-zinc-700/60 bg-zinc-900/60 text-zinc-300",
  },
  unknown: {
    label: "Unknown",
    short: "??",
    badge: "border-zinc-700/60 bg-zinc-800/40 text-zinc-400",
  },
} as const;

function getAgentMeta(agentId: string | null | undefined) {
  if (!agentId) return AGENT_META.system;
  return AGENT_META[agentId as keyof typeof AGENT_META] ?? AGENT_META.unknown;
}

function categorizeCrons(
  crons: DbCronJob[],
  jobRuns: DbJobRun[],
  weekDays: string[]
): { scheduled: Map<string, DayEvent[]> } {
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
    if (!job.schedule_expr || job.schedule_expr.split(" ").length < 5) continue;

    const weekRuns = expandCron(job.schedule_expr, weekDays);

    if (isHighFrequencyCron(job.schedule_expr, weekDays)) continue;

    for (const run of weekRuns) {
      if (!scheduled.has(run.dateKey)) scheduled.set(run.dateKey, []);

      const matchKey = `${job.id}:${run.dateKey}`;
      const matchingRuns = runIndex.get(matchKey) || [];
      const { status, summary } = getScheduledRunStatus({
        job,
        matchingRuns,
        dateKey: run.dateKey,
        hour: run.hour,
        minute: run.minute,
        now: new Date(`${todayStr}T${String(nowH).padStart(2, "0")}:${String(nowM).padStart(2, "0")}:00`),
      });

      scheduled.get(run.dateKey)!.push({
        name: job.name,
        jobId: job.id,
        agentId: job.agent_id,
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

  return { scheduled };
}

// --- Component ---

export function CalendarView({ initialData, initialStart }: CalendarViewProps) {
  const [data, setData] = useState<CalendarData>(initialData);
  const [weekStart, setWeekStart] = useState(initialStart);
  const [loading, setLoading] = useState(false);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const contentRefs = useRef<Array<HTMLDivElement | null>>([]);

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

  // Silent auto-poll every 30s (no loading spinner)
  useEffect(() => {
    const id = setInterval(async () => {
      const end = addDays(weekStart, 6);
      const res = await fetch(`/api/admin/calendar?start=${weekStart}&end=${end}`);
      if (res.ok) setData(await res.json());
    }, 30_000);
    return () => clearInterval(id);
  }, [weekStart]);

  const { scheduled } = useMemo(
    () => categorizeCrons(data.crons, data.jobRuns, weekDays),
    [data.crons, data.jobRuns, weekDays]
  );

  useLayoutEffect(() => {
    let frame1 = 0;
    let frame2 = 0;

    function updatePanelHeight() {
      const panelTop = panelRef.current?.getBoundingClientRect().top ?? 0;
      const viewportCap = Math.max(window.innerHeight - panelTop - 24, 320);
      const tallestColumn = weekDays.reduce((max, _, idx) => {
        const header = headerRefs.current[idx];
        const content = contentRefs.current[idx];
        if (!header || !content) return max;
        return Math.max(max, header.offsetHeight + content.offsetHeight);
      }, 0);

      if (!tallestColumn) return;
      setPanelHeight(Math.min(tallestColumn, viewportCap));
    }

    function measureAfterLayout() {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      frame1 = requestAnimationFrame(() => {
        frame2 = requestAnimationFrame(updatePanelHeight);
      });
    }

    measureAfterLayout();

    window.addEventListener("resize", measureAfterLayout);
    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      window.removeEventListener("resize", measureAfterLayout);
    };
  }, [scheduled, weekDays]);

  const iconButtonClass =
    "inline-flex size-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800/40 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/60 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

  return (
    <div className="space-y-4">
      <AdminPageIntro
        title="Calendar"
        actions={
          <>
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
          </>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <span className="type-badge text-zinc-600 shrink-0">Agents</span>
          {(["moltzart", "scout", "pica", "hawk", "sigmund"] as const).map((agentKey) => {
            const agent = AGENT_META[agentKey];
            return (
              <Badge
                key={agentKey}
                variant="status"
                shape="pill"
                className={`shrink-0 ${agent.badge}`}
              >
                {agent.short}: {agent.label}
              </Badge>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="type-badge text-zinc-600">Status</span>
          <Badge variant="outline" shape="pill" className="shrink-0 bg-zinc-900/50 text-zinc-500">
            <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
            Ran
          </Badge>
          <Badge variant="outline" shape="pill" className="shrink-0 bg-zinc-900/50 text-zinc-500">
            <span className="inline-block size-1.5 rounded-full bg-red-400" />
            Error
          </Badge>
          <Badge variant="outline" shape="pill" className="shrink-0 bg-zinc-900/50 text-zinc-500">
            <span className="inline-block size-1.5 rounded-full bg-amber-400" />
            Missed
          </Badge>
          <Badge variant="outline" shape="pill" className="shrink-0 bg-zinc-900/50 text-zinc-500">
            <span className="inline-block size-1.5 rounded-full bg-zinc-600" />
            Upcoming
          </Badge>
        </div>
      </div>

      {/* Weekly columns */}
      <div ref={panelRef}>
        <Panel
          className={`flex flex-col overflow-hidden ${loading ? "pointer-events-none opacity-50" : ""}`}
          style={{ height: panelHeight ? `${panelHeight}px` : "calc(100svh - 10rem)" }}
        >
          <div className="min-h-0 flex-1 overflow-x-auto">
            <div className="grid h-full min-w-[980px] grid-cols-7 gap-px bg-zinc-800/30">
          {weekDays.map((dateKey, idx) => {
            const d = new Date(dateKey + "T12:00:00");
            const isToday = dateKey === todayKey;
            const isPast = dateKey < todayKey;
            const events = scheduled.get(dateKey) || [];

            return (
              <div
                key={dateKey}
                className={`flex h-full min-h-0 flex-col bg-zinc-950/40 ${isPast ? "opacity-50" : ""}`}
              >
                {/* Day header */}
                <div
                  ref={(node) => {
                    headerRefs.current[idx] = node;
                  }}
                  className={`sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-900/60 px-4 py-2 backdrop-blur-sm ${isToday ? "shadow-[inset_0_-1px_0_rgba(45,212,191,0.2)]" : ""}`}
                >
                  <span className={`type-body-sm font-medium ${isToday ? "text-teal-400" : "text-zinc-200"}`}>
                    {WEEKDAYS[idx]}
                  </span>
                  <span className={`type-body-sm ${isToday ? "text-teal-400/80" : "text-zinc-500"}`}>
                    {d.getDate()}
                  </span>
                </div>

                {/* Event cards */}
                <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <div
                    ref={(node) => {
                      contentRefs.current[idx] = node;
                    }}
                    className="space-y-1 p-2"
                  >
                    {events.map((ev, i) => (
                      <EventCard key={`${ev.jobId}-${ev.sortKey}-${i}`} event={ev} />
                    ))}
                    {events.length === 0 && (
                      <div className="type-badge py-4 text-center text-zinc-700">—</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: DayEvent }) {
  const si = STATUS_INDICATOR[event.status];
  const agent = getAgentMeta(event.agentId);
  const statusDotClass = si.dot.replace(" animate-pulse", "");

  return (
    <div
      className={`rounded-lg border bg-zinc-900/30 px-1.5 py-2 ${si.border}`}
      title={event.summary || undefined}
    >
      <div className="pl-1">
        <div className="text-xs font-medium leading-tight text-zinc-200">
          {event.name}
        </div>
      </div>
      <div className="mt-1 flex items-center gap-1.5 pl-1 type-badge text-zinc-500">
        <span className={`inline-block size-1.5 rounded-full ${statusDotClass}`} />
        <span>{agent.short}</span>
        <span>&bull;</span>
        <span>{event.time}</span>
      </div>
    </div>
  );
}
