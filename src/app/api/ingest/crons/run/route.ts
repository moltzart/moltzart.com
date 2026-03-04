import { NextRequest, NextResponse } from "next/server";
import { insertJobRun, updateJobRun } from "@/lib/db";

function checkIngestAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === process.env.INGEST_API_KEY;
}

export async function POST(req: NextRequest) {
  if (!checkIngestAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { job_id, agent_id, started_at, completed_at, status, summary, run_id } = body;

  // Update existing run (e.g., mark as completed)
  if (run_id) {
    if (!status) {
      return NextResponse.json({ error: "Missing required field: status" }, { status: 400 });
    }
    await updateJobRun(run_id, { completed_at, status, summary });
    return NextResponse.json({ ok: true, id: run_id });
  }

  // Create new run
  if (!job_id || !started_at || !status) {
    return NextResponse.json(
      { error: "Missing required fields: job_id, started_at, status" },
      { status: 400 }
    );
  }

  const run = await insertJobRun({ job_id, agent_id, started_at, completed_at, status, summary });
  return NextResponse.json({ ok: true, id: run.id });
}
