import { fetchCronJobs, fetchJobRunsForRange } from "@/lib/db";
import { CalendarView } from "@/components/calendar-view";

export const dynamic = "force-dynamic";

function getWeekRange(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const sun = new Date(d);
  sun.setDate(d.getDate() - day);
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  return { start: fmt(sun), end: fmt(sat) };
}

export default async function AdminCalendar() {
  const now = new Date();
  const { start, end } = getWeekRange(now);

  const [crons, jobRuns] = await Promise.all([
    fetchCronJobs(),
    fetchJobRunsForRange(start, end),
  ]);

  return (
    <CalendarView
      initialData={{ crons, jobRuns }}
      initialStart={start}
    />
  );
}
