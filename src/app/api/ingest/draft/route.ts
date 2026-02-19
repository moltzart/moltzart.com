import { NextRequest, NextResponse } from "next/server";
import { fetchXDrafts, insertXDrafts } from "@/lib/db";

function checkIngestAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === process.env.INGEST_API_KEY;
}

const VALID_STATUSES = ["draft", "queued", "posted", "rejected"];

export async function POST(req: NextRequest) {
  if (!checkIngestAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { drafts } = body;

  if (!Array.isArray(drafts) || drafts.length === 0) {
    return NextResponse.json({ error: "Missing required field: drafts (non-empty array)" }, { status: 400 });
  }

  for (const d of drafts) {
    if (!d.text) {
      return NextResponse.json({ error: "Each draft requires text" }, { status: 400 });
    }
    if (d.status && !VALID_STATUSES.includes(d.status)) {
      return NextResponse.json(
        { error: `Invalid status: ${d.status}. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
  }

  const ids = await insertXDrafts(drafts);
  return NextResponse.json({ ok: true, ids });
}

export async function GET(req: NextRequest) {
  if (!checkIngestAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const drafts = await fetchXDrafts(status);
  return NextResponse.json({ ok: true, drafts });
}
