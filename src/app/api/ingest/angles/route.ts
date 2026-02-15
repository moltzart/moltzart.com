import { NextRequest, NextResponse } from "next/server";
import { insertNewsletterAngles } from "@/lib/db";

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
  const { date, angles } = body;

  if (!date || !Array.isArray(angles) || angles.length === 0) {
    return NextResponse.json({ error: "Missing required fields: date, angles (non-empty array)" }, { status: 400 });
  }

  for (const a of angles) {
    if (!a.angle) {
      return NextResponse.json({ error: "Each angle requires an angle field" }, { status: 400 });
    }
  }

  const ids = await insertNewsletterAngles(date, angles);
  return NextResponse.json({ ok: true, ids });
}
