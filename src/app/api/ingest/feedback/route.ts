import { NextRequest, NextResponse } from "next/server";
import { insertContentFeedback } from "@/lib/db";

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
  const { date, signal, topic, source, reason } = body;

  if (!date || !signal || !topic) {
    return NextResponse.json({ error: "Missing required fields: date, signal, topic" }, { status: 400 });
  }

  const id = await insertContentFeedback(date, signal, topic, source, reason);
  return NextResponse.json({ ok: true, ids: [id] });
}
