import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/admin-auth";
import {
  fetchCronJobs,
  fetchTasksForMonth,
  fetchXDraftsForMonth,
  fetchNewsletterForMonth,
} from "@/lib/db";

function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export async function GET(req: NextRequest) {
  const auth = await getAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl;
  const now = new Date();
  const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()), 10);
  const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1), 10);

  const { start, end } = getMonthRange(year, month);

  const [crons, tasks, drafts, newsletter] = await Promise.all([
    fetchCronJobs(),
    fetchTasksForMonth(start, end),
    fetchXDraftsForMonth(start, end),
    fetchNewsletterForMonth(start, end),
  ]);

  return NextResponse.json({ crons, tasks, drafts, newsletter, year, month });
}
