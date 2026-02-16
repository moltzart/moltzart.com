import { NextRequest, NextResponse } from "next/server";
import { insertEngageItems } from "@/lib/db";

function checkIngestAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === process.env.INGEST_API_KEY;
}

const VALID_TYPES = ["reply_target"];

export async function POST(req: NextRequest) {
  if (!checkIngestAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, items } = body;

  if (!date || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Missing required fields: date, items (non-empty array)" }, { status: 400 });
  }

  for (const item of items) {
    if (!item.title || !item.type) {
      return NextResponse.json({ error: "Each item requires title and type" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(item.type)) {
      return NextResponse.json({ error: `Invalid type: ${item.type}. Must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
    }
  }

  const ids = await insertEngageItems(date, items);
  return NextResponse.json({ ok: true, ids });
}
