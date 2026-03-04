import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/admin-auth";
import { fetchCronJobs, fetchJobRunsForRange } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await getAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl;
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "Missing start/end params" }, { status: 400 });
  }

  const [crons, jobRuns] = await Promise.all([
    fetchCronJobs(),
    fetchJobRunsForRange(start, end),
  ]);

  return NextResponse.json({ crons, jobRuns });
}
