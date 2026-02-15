import { NextRequest, NextResponse } from "next/server";
import { insertDraft } from "@/lib/db";

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
  const { date, type, content, time, reply_to, reply_context, priority } = body;

  if (!date || !content) {
    return NextResponse.json({ error: "Missing required fields: date, content" }, { status: 400 });
  }

  const id = await insertDraft(date, type || "original", content, {
    time,
    reply_to,
    reply_context,
    priority,
  });
  return NextResponse.json({ ok: true, ids: [id] });
}
