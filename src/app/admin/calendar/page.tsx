import {
  fetchCronJobs,
  fetchTasksForMonth,
  fetchXDraftsForMonth,
  fetchNewsletterForMonth,
} from "@/lib/db";
import { CalendarView } from "@/components/calendar-view";

export const dynamic = "force-dynamic";

function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export default async function AdminCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { start, end } = getMonthRange(year, month);

  const [crons, tasks, drafts, newsletter] = await Promise.all([
    fetchCronJobs(),
    fetchTasksForMonth(start, end),
    fetchXDraftsForMonth(start, end),
    fetchNewsletterForMonth(start, end),
  ]);

  return (
    <CalendarView
      initialData={{ crons, tasks, drafts, newsletter }}
      initialYear={year}
      initialMonth={month}
    />
  );
}
