import { NextRequest, NextResponse } from "next/server";
import { insertRadarItems } from "@/lib/db";

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
  const { date, section, items, scan_source } = body;

  if (!date || !section || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Missing required fields: date, section, items (non-empty array)" }, { status: 400 });
  }

  for (const item of items) {
    if (!item.title || !item.lane) {
      return NextResponse.json({ error: "Each item requires title and lane" }, { status: 400 });
    }
  }

  const ids = await insertRadarItems(date, section, items, scan_source);
  return NextResponse.json({ ok: true, ids });
}
