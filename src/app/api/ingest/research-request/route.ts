import { NextRequest, NextResponse } from "next/server";
import { insertResearchRequest } from "@/lib/db";

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
  const { title, requested_by, priority, details } = body;

  if (!title || !requested_by) {
    return NextResponse.json({ error: "Missing required fields: title, requested_by" }, { status: 400 });
  }

  const id = await insertResearchRequest(title, requested_by, priority, details);
  return NextResponse.json({ ok: true, ids: [id] });
}
